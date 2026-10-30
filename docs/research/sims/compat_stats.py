"""Independent re-implementation of the vercel 12axes compatibility formula
(ProfileMatchScorer.java) for statistical analysis only. Reads data JSON as data."""
import json, math, random, statistics, sys, os

DATA = sys.argv[1]
AX = ["estrutura","representacao","poder","imigracao","diplomacia","intervencao",
      "economia","controle","comercio","religiao","moral","tecnologia"]

def compat(u, t):
    n = len(AX)
    s = 0.0
    for a in AX:
        d = abs(u[a]-t[a]); sim = max(0.0, 1-(d/50)**2)
        if (u[a]-50)*(t[a]-50) < 0:
            sim *= 1-0.45*math.tanh(abs(u[a]-50)/25)*math.tanh(abs(t[a]-50)/25)
        s += sim
    axis = 100*s/n
    dot = sum((u[a]-50)*(t[a]-50) for a in AX)
    nu = sum((u[a]-50)**2 for a in AX); nt = sum((t[a]-50)**2 for a in AX)
    k = n*64
    direction = 50+50*(dot+k)/math.sqrt((nu+k)*(nt+k))
    iu = sum(abs(u[a]-50) for a in AX)/n; it = sum(abs(t[a]-50) for a in AX)/n
    mag = 100-2*abs(iu-it)
    md = max(abs(u[a]-t[a]) for a in AX)
    out = 100*max(0.0, 1-(md/100)**2.5)
    return max(0, min(100, 0.42*axis+0.33*direction+0.18*mag+0.07*out))

def load(fn, key):
    d = json.load(open(os.path.join(DATA, fn), encoding="utf-8"))
    return {p[key]: p["vector"] for p in d if p.get("vector")}

cats = {
    "ideology": load("ideology-profiles.json", "ideologyId"),
    "personality": load("personality-profiles.json", "personalityId"),
    "country": load("countries-profiles.json", "countryId"),
    "party": load("parties-profiles.json", "partyId"),
}
for name, c in cats.items():
    vals = [v[a] for v in c.values() for a in AX]
    inten = [sum(abs(v[a]-50) for a in AX)/12 for v in c.values()]
    near = sum(1 for x in vals if abs(x-50) < 7.5)/len(vals)
    print(f"{name}: n={len(c)} meanIntensity={statistics.mean(inten):.1f} medianIntensity={statistics.median(inten):.1f} "
          f"shareAxisValuesBalanced(<7.5)={near:.2%}")

ide = cats["ideology"]
neutral = {a: 50.0 for a in AX}
sc = sorted((compat(neutral, t), k) for k, t in ide.items())
print("all-neutral user: top3", sc[-3:][::-1], "bottom", sc[0])

opp_u = {a: 100.0 for a in AX}; opp_t = {a: 0.0 for a in AX}
print("perfectly opposite extremes compat:", round(compat(opp_u, opp_t), 1))

random.seed(1)
# simulate users answering uniformly at random on the 5-point scale, 5 items/axis (extended quiz)
def sim_user(nq):
    return {a: statistics.mean(random.choice([0,.25,.5,.75,1]) for _ in range(nq))*100 for a in AX}
for nq in (3, 5, 20):
    tops, meds, bots = [], [], []
    for _ in range(300):
        u = sim_user(nq)
        s = sorted(compat(u, t) for t in ide.values())
        tops.append(s[-1]); meds.append(statistics.median(s)); bots.append(s[0])
    print(f"random-answer users nq={nq}: top1 mean={statistics.mean(tops):.1f} median-of-catalog mean={statistics.mean(meds):.1f} bottom mean={statistics.mean(bots):.1f}")

# uniform random vectors
tops=[]; meds=[]
for _ in range(300):
    u = {a: random.uniform(0,100) for a in AX}
    s = sorted(compat(u, t) for t in ide.values()); tops.append(s[-1]); meds.append(statistics.median(s))
print(f"uniform vectors: top1 mean={statistics.mean(tops):.1f} catalog-median mean={statistics.mean(meds):.1f}")

# test-retest: SE of an axis score under short quiz assuming item-level noise of one scale step
# correlation of axes across ideology catalog (top pairs)
import itertools
def corr(x, y):
    mx, my = statistics.mean(x), statistics.mean(y)
    num = sum((a-mx)*(b-my) for a, b in zip(x, y))
    den = math.sqrt(sum((a-mx)**2 for a in x)*sum((b-my)**2 for b in y))
    return num/den if den else 0
pairs = []
for a, b in itertools.combinations(AX, 2):
    pairs.append((round(corr([v[a] for v in ide.values()], [v[b] for v in ide.values()]), 2), a, b))
pairs.sort(key=lambda p: -abs(p[0]))
print("strongest catalog axis correlations:", pairs[:10])
print("pairs |r|>=0.45:", sum(1 for p in pairs if abs(p[0]) >= 0.45), "of", len(pairs))

# Simulated test-retest: respondent with true vector = an ideology; each item response = true/100 + N(0, sd),
# snapped to the 5-point grid; axis = mean of n items. Measure top-1 self-recovery and top-1 agreement between two runs.
def snap(x):
    return min(1.0, max(0.0, round(x*4)/4))
ids = list(ide.keys())
for sd in (0.20, 0.30):
    for n in (3, 5, 20):
        rec = agree = 0; trials = 0
        for k in ids:
            t = ide[k]
            def run():
                u = {a: statistics.mean(snap(t[a]/100 + random.gauss(0, sd)) for _ in range(n))*100 for a in AX}
                return max(ids, key=lambda j: compat(u, ide[j]))
            r1, r2 = run(), run()
            rec += (r1 == k); agree += (r1 == r2); trials += 1
        print(f"item sd={sd} n={n}: self-recovery top1={rec/trials:.0%} retest top1 agreement={agree/trials:.0%}")

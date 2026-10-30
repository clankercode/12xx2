import re, sys, json, itertools

qpath, ipath = sys.argv[1], sys.argv[2]
qt = open(qpath).read()
# strip comments
qt_nc = re.sub(r'//[^\n]*', '', qt)
arr = qt_nc[qt_nc.index('['):qt_nc.rindex(']') + 1]
questions = json.loads(arr)
LEVELS = [4, 3, 2, 1, -1, -2, -3, -4]
AX = ['Federal(+)/Unitary', 'Democratic(+)/Autocratic', 'Internationalist(+)/Nationalist',
      'Militarist(+)/Pacifist', 'Security(+)/Freedom', 'Collectivize(+)/Privatize',
      'Secular(+)/Religious', 'Progressive(+)/Traditional', 'Assimilationist(+)/Multicultural',
      'Planned(+)/Markets', 'Protectionist(+)/Globalist', 'Technology(+)/Bioconservative']
print('axes', len(questions))
for i, ax in enumerate(questions):
    print(AX[i], [len(l) for l in ax], sum(len(l) for l in ax))
print('total', sum(len(l) for ax in questions for l in ax))

# short quiz sampling
t = [1, 2, 3, 5, 7]
for c in (True, False):
    idx = [x if c else 8 - x for x in t]
    print('c=%s idx=%s levels=%s' % (c, idx, [LEVELS[k] for k in idx]))

def short_score(resp, c):
    s = 0
    for x in t:
        k = x if c else 8 - x
        s += resp(LEVELS[k]) * (1 if k < 4 else -1)
    return 50 + 5 * s

def long_score(resp):
    s = 0
    for k in range(8):
        s += 3 * resp(LEVELS[k]) * (1 if k < 4 else -1)
    return 50 + s

models = {
    'acquiesce_agree(+1 all)': lambda lv: 1,
    'strongly_agree_all(+2)': lambda lv: 2,
    'moderate(agree|lv|=1, partial 2, disagree 3, strongly disagree 4)': lambda lv: {1: 1, 2: 0.5, 3: -1, 4: -2}[abs(lv)],
    'all_neutral': lambda lv: 0,
    'pure_positive_pole(agree + items fully, disagree - items fully)': lambda lv: 2 if lv > 0 else -2,
    'pure_negative_pole': lambda lv: 2 if lv < 0 else -2,
}
for name, m in models.items():
    print('%-70s short c=T %5.1f  c=F %5.1f  long %5.1f' % (name, short_score(m, True), short_score(m, False), long_score(m)))

# ideologies
it = open(ipath).read()
ides = [(m.group(1), *map(float, m.groups()[1:])) for m in re.finditer(
    r'"name":\s*"([^"]+)".*?"econ":\s*([\d.]+),\s*"dipl":\s*([\d.]+),\s*"govt":\s*([\d.]+),\s*"scty":\s*([\d.]+)', it, re.S)]
print('ideologies', len(ides))

def match(f, e, k, h):
    best = None
    for n, econ, dipl, govt, scty in ides:
        d = (econ - f) ** 2 + (govt - e) ** 2 + (dipl - k) ** 2 + (scty - h) ** 2
        if best is None or d < best[1]:
            best = (n, d)
    return best

tests = {
    'Nationalist-protectionist authoritarian trad (f40 e90 k90 h10)': (40, 90, 90, 10),
    'Same but free-trade (f40 e90 k10 h10)': (40, 90, 10, 10),
    'Trotskyist-ish: f100 e40 k10(globalist) h50': (100, 40, 10, 50),
    'Trotskyist-ish: f100 e40 k90(protectionist) h50': (100, 40, 90, 50),
    'Neoliberal: f30 e50 k10(free trade) h60': (30, 50, 10, 60),
    'Neoliberal: f30 e50 k90 h60': (30, 50, 90, 60),
    'All 50': (50, 50, 50, 50),
}
for n, v in tests.items():
    print('%-55s -> %s (d2=%.0f)' % (n, *match(*v)))

# reachable ideologies over grid
reach = set()
g = range(0, 101, 5)
for f in g:
    for e in g:
        for k in g:
            for h in g:
                reach.add(match(f, e, k, h)[0])
print('reachable on 5-step grid:', len(reach), sorted(set(x[0] for x in ides) - reach))
# short-quiz reachable values per axis
vals = set()
for combo in itertools.product([2, 1, 0.5, 0, -0.5, -1, -2], repeat=5):
    vals.add(50 + 5 * sum(combo))
print('short reachable per-axis values', len(vals), min(vals), max(vals))

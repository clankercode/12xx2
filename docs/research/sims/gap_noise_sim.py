"""Critic sim: how big are 'gaps' produced by pure noise / random clicking?
Deterministic (seeded). No upstream code executed."""
import random, statistics as st

random.seed(12)
AXES, K = 12, 5

def clamp(x, m):
    return max(-m, min(m, x))

def run(levels_max, mode, sigma=0.0, n=4000):
    # levels_max: 2 for 5-point (-2..2), 3 for 7-point (-3..3)
    rng = 2 * levels_max
    Ds, shown_axes, any_shown, maxG = [], [], 0, []
    for _ in range(n):
        D_items, shown = [], 0
        Gs = []
        for a in range(AXES):
            keys = [1, -1, 1, -1, 1]
            dl, nN, nI = [], [], []
            true_pos = random.uniform(-levels_max, levels_max)  # person's true lean
            for k in keys:
                if mode == "random":
                    rN = random.randint(-levels_max, levels_max)
                    rI = random.randint(-levels_max, levels_max)
                else:  # true N==I, independent response noise per frame
                    t = k * true_pos
                    rN = clamp(round(t + random.gauss(0, sigma)), levels_max)
                    rI = clamp(round(t + random.gauss(0, sigma)), levels_max)
                d = rN - rI
                dl.append(k * d)
                D_items.append(abs(d))
                nN.append(k * rN); nI.append(k * rI)
            SN = st.mean(nN) / levels_max
            SI = st.mean(nI) / levels_max
            G = SN - SI
            Gs.append(abs(G))
            denom = sum(abs(x) for x in dl)
            C = abs(sum(dl)) / denom if denom else 0
            sgn = 1 if G > 0 else -1
            agree = sum(1 for x in dl if x * sgn > 0)
            if C >= 0.5 and abs(G) >= 0.15 and agree >= 2:
                shown += 1
        Ds.append(st.mean(D_items) / rng)
        shown_axes.append(shown)
        any_shown += shown > 0
        maxG.append(max(Gs))
    return dict(meanD=round(st.mean(Ds) * 100, 1),
                p5_95D=(round(sorted(Ds)[n // 20] * 100, 1), round(sorted(Ds)[-n // 20] * 100, 1)),
                mean_axes_with_arrow=round(st.mean(shown_axes), 2),
                share_with_any_arrow=round(any_shown / n, 3),
                mean_max_absG=round(st.mean(maxG), 3))

for lm, name in [(2, "5-pt"), (3, "7-pt")]:
    print(name, "random clicker:", run(lm, "random"))
    for s in (0.5, 0.8, 1.0):
        print(name, f"no true gap, noise sd={s}:", run(lm, "noise", sigma=s))

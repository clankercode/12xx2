# Fit-set headline

Status: implemented on `feat/fit-set` (2026-10-31). Replaces "closest ideology" naming, following the Critical Fallibilism review (plan M3–M5, "Shape of the fix"). The user-facing explanation is on the Method page under "The headline: which ideologies you fit".

## The rule, as implemented

Code: `src/engine/results.ts` (`fits`, `fitSetFor`, `deriveResults`).

For each frame F, the frame's answers are compared with every ideology's *ideal* profile, as before. The here-and-now frame uses here-and-now answers against ideal profiles.

An ideology X **fits** F when both of these hold:

1. **No core commitment rules X out.** "Ruled out" is the existing three-valued check (`src/engine/commitments.ts`): ✘ if any commitment is answered at "agree"/"disagree" strength or stronger on the wrong side, in a frame that commitment checks. A `?` (passed, neutral, slightly the other way, not asked) is neither a pass nor a fail.
2. **d(U_F, X.ideal) ≤ the "loosely similar" cut** for the test length (`calibration.labels[mode].loose`, the 95th percentile of simulated sincere adherents' distance to their own ideology). A sensitive X needs the stricter `veryClose` cut (the 50th percentile).

The fit set is every ideology that fits, ordered by distance. Distance orders the list; it never picks one winner out of the set.

Hero kinds:

| Kind | When | Headline |
|---|---|---|
| `unreliable` | careless flag | "No reliable match" |
| `insufficient` | ideal coverage fails | "Not enough answers to match" |
| `no-fit` | ideal fit set empty | "No close match"; the nearest not-ruled-out ideology is shown as a measurement. If here and now fits something, a note says so. |
| `split` | ideal set non-empty, here-and-now covered, and the two sets share no ideology (the here-and-now set may be empty) | "Ideal: A · Here and now: B" (each side a fit set, or "No close match") |
| `constant` | ideal set non-empty, and here and now is missing or shares at least one ideology | The ideal fit set. "In theory and here and now" only when both sets are identical; otherwise the page says what here and now fits. |

Naming a set: one fit → its name. Two or three → "A and B" / "A, B and C", plus "this test can't tell them apart". More than three → the nearest three, then "and N more", with the full list under the hero.

Measurements printed under every verdict: the nearest ideology's distance, its band ("as close as 80% of simulated adherents"), the "fits" cut, and the bootstrap stability of the nearest. The ranked lists mark fitting ideologies "✔ Fits" beside their band.

## Surfaces

- **Results hero and shared view:** `src/ui/ResultsView.tsx` (`Hero`, `HeroHalf`, `Measured`, `LeftOut`). The shared view derives the same fit sets from the link, because rule-outs travel as the existing bitmask.
- **heroName** (history, run page, compare): `src/ui/copy.ts`. Old saved runs keep their snapshot headline. The history page already shows "When you finished it said: …" when the wording changed.
- **Share text:** `src/ui/ShareSheet.tsx` `shareText`, which uses "I fit A" and "(this test can't tell them apart)".
- **Share cards:** `src/share/card.ts` `headline`. Long fit lists shrink to their line budget so the chart keeps its room. The compare card reuses it.
- **Preview links and OG stubs:** only one-ideology fit sets get a stub: `p/<a>/` when both frames fit exactly A, and `p/<a>/<b>/` for a split whose frames fit exactly A and exactly B. The stub set is unchanged in size (`scripts/og.ts`); only its wording moved to "fits".
- **Compare page:** each person's `heroName`, plus "this test can't tell them apart" or the nearest as a measurement.

## Simulation (calibration run 2026-10-31, 8000 draws; `report.fitSet` in `src/data/calibration.json`)

Thresholds are unchanged by this work. The fit-set figures use their own RNG stream after every threshold, end to end: score → rule-outs → payload → `deriveResults`.

| Quick / Standard / Full | Sincere adherents (47 × 100 per length) | Typical (uniform latent) respondents (1000) | Random clickers (1000) |
|---|---|---|---|
| Own ideology in ideal fit set | **82.5% / 92.4% / 92.2%** | — | — |
| Mean fit-set size (when a set is computed) | 1.98 / 1.55 / 1.24 | 0.04 / 0.01 / 0.00 | 0.06 / 0.01 / 0.00 |
| Exactly one fit | 40.6% / 56.8% / 70.0% | 2.4% / 0.5% / 0.1% | 0.3% / 0.1% / 0% |
| More than three fits | 12.8% / 4.1% / 0.6% | 0 / 0 / 0 | 0 / 0 / 0 |
| Empty ("No close match") | 4.5% / 5.8% / 7.2% | 85.7% / 99.3% / 99.9% | 7.5% / 9.2% / 10.2% (the rest are withheld as careless) |
| Headline names an ideology | 84.8% / 93.8% / 92.8% | 2.7% / 0.5% / 0.1% | 0.4% / 0.1% / 0% |

Other figures:

- **False splits** for no-gap respondents: 2.27%. The old margin rule gave 1.07%; both meet the ≤ 5% target.
- **Random clickers with any named headline:** 0.2% (unchanged).

How to read these numbers:

- **Adherent rates are optimistic.** The adherents are simulated from the same coded sheets the profiles were built from.
- **The "typical" model overstates distance.** Its axes are uniform and uncorrelated, while real views are correlated, so the near-100% empty rate is an upper bound, not a prediction. The CF review made the same point (B1).

## Decisions

1. **The "no `?` on a must-agree in a frame where it has been decisively answered" clause.** Per frame, a commitment answered decisively (|a| ≥ 2) is always ✔ or ✘, never `?`. So under a per-frame reading the clause is automatically satisfied and adds no condition, and that is how it is implemented: a `?` never counts as a pass and never excludes. The stricter alternative, "any `?` on a commitment excludes", would treat today's no-go commitments as *required* statements. CF B5 shows this would deny fit to 39–77% of sincere adherents, because the commitments were not designed as required checks. Required statements need their own `kind` and coding, which content-v2 and later work will add. *Reversible:* add a `requiredUnknown` exclusion in `fits()` once `kind: 'required'` exists.
2. **Rule-outs stay combined across frames.** This is one bitmask in the payload, and a `both`-frame commitment fails if either frame fails. Per-frame rule-outs (CF B8) would need a second bitmask, i.e. a payload format change. That would collide with content-v2's format 3 (the red-line block), so it is parked until after that merge. The fit sets themselves are per frame (distance per frame).
3. **Split = disjoint fit sets.** This replaces the μ margin plus "B not a toss-up" test. μ is still calibrated and published, but gates nothing. The cost is 2.3% false splits, against 1.1% before.
4. **Toss-up is no longer a naming gate.** A near tie between ideologies inside the cut shows up as several fits, which says honestly that the test can't tell them apart. A nearest that is a toss-up with ideologies *outside* the cut is still named: the cut is the breakpoint. Stability is shown as a measurement.
5. **Sensitive archetypes** fit only within "very close". The old extra "stable" requirement is dropped, because stability is a who-wins measure and the fit set has no winner. Within "loosely similar" but not "very close", they are listed as "also close", never named. Cards still need the share opt-in.
6. **Preview stubs for single fits only.** This keeps the stub set finite and the same as before. No stub for "A and others": the URL would then name one ideology as if it were the headline. Adherents get a single fit 41–70% of the time, depending on length.
7. **The three distance labels stay, as measurement bands.** CF B1 suggested collapsing them to in-range or out-of-range. Only "loosely similar" is used as a breakpoint, and the hero prints the raw distance and the cut beside the band.
8. **Kept out of scope** to keep the content-v2 merge easy: data files, the payload format, the commitments matrix (still the top-3 rows, CF B9) and `src/engine/calibration.ts`.

## Known issues

- At 390 px the results page scrolls sideways whenever the core-commitments matrix renders. This is pre-existing (`src/ui/Commitments.tsx` hidden labels) and fixed on `feat/content-v2` (8ac70bd).
- Quick-length adherents get more than three fits 12.8% of the time. This is honest, because Quick can't separate close neighbours, but the hero then needs the "All N: …" line.

## Open questions (for Max)

1. **Should a `?` on a commitment ever exclude?** Today it never does (decision 1). If yes, only for a new `kind: 'required'`, coded and audited per CF B5.
2. **Per-frame rule-outs (B8):** do this after content-v2 merges, as payload format 4? Recommendation: yes. It is small, and it stops a here-and-now answer from ruling an ideology out of the ideal headline.
3. **Do we want a preview stub for multi-fit results?** For example, a generic "fits several ideologies" stub with no names. Recommendation: no, until real usage shows people want it.
4. **Should the "constant" kicker keep the word "Constant"?** It now reads "In theory and here and now, you fit". The Reality Gap card already carries the constancy measure.

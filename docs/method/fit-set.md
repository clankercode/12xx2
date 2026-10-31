# Fit-set headline

Status: implemented on `feat/fit-set`, integrated with content v2 (2026-10-31). Replaces "closest ideology" naming, following the Critical Fallibilism review (plan M3–M5, "Shape of the fix"). The user-facing explanation is on the Method page under "The headline: which ideologies you fit".

## The rule, as implemented

Code: `src/engine/results.ts` (`fits`, `fitSetFor`, `deriveResults`).

For each frame F, the frame's answers are compared with every ideology's *ideal* profile, as before. The here-and-now frame uses here-and-now answers against ideal profiles.

An ideology X **fits** F when both of these hold:

1. **No core or red-line commitment rules X out.** "Ruled out" is the existing three-valued check (`src/engine/commitments.ts`): ✘ if any commitment is answered at "agree"/"disagree" strength or stronger on the wrong side, in a frame that commitment checks. A `?` (passed, neutral, slightly the other way, not asked) is neither a pass nor a fail.
2. **d(U_F, X.ideal) ≤ the "loosely similar" cut** for the test length (`calibration.labels[mode].loose`, the 95th percentile of simulated sincere adherents' distance to their own ideology). A sensitive X needs the stricter `veryClose` cut (the 50th percentile).

A flat frame (every scored axis exactly 0) has no fits, even if an ideology is within the distance cut. It carries no position to match. This guard applies to both frames and to the ranked lists’ “Fits” marks.

The fit set is every ideology that fits, ordered by distance. Distance orders the list; it never picks one winner out of the set.

Hero kinds:

| Kind | When | Headline |
|---|---|---|
| `unreliable` | careless flag | "No reliable match" |
| `insufficient` | ideal coverage fails | "Not enough answers to match" |
| `no-fit` | ideal fit set empty | "No close match"; the nearest not-ruled-out ideology is shown as a measurement. If here and now fits something, a note says so. |
| `split` | both sets non-empty and sharing no ideology | "Ideal: A · Here and now: B" (each side a fit set) |
| `constant` | ideal set non-empty, and here and now is missing, fits nothing, or shares at least one ideology | The ideal fit set. "In theory and here and now" only when both sets are identical; otherwise the page says what here and now fits, or that it fits nothing ("That alone isn't a split"). |

Naming a set: one fit → its name. Two to four → "A and B" … "A, B, C and D", plus "this test can't tell them apart". More than four → the nearest three, then "and N more", with the full list under the hero (never "and 1 more").

Measurements printed under every verdict: the nearest ideology's distance, its band ("as close as 80% of simulated adherents"), the "fits" cut that applies to it (the "very close" cut when the nearest is sensitive), and the bootstrap stability of the nearest. The ranked lists mark fitting ideologies "✔ Fits" beside their band.

## Surfaces

- **Results hero and shared view:** `src/ui/ResultsView.tsx` (`Hero`, `HeroHalf`, `Measured`, `LeftOut`). The shared view derives the same fit sets from the link, because rule-outs travel as the existing bitmask.
- **heroName** (history, run page, compare): `src/ui/copy.ts`. Old saved runs keep their snapshot headline. Runs carry a headline-rule version (`HEADLINE_RULE` in `src/state/history.ts`, now 2; runs saved before it existed read as 1), so a run saved under the old rule shows "Before the method changed it said: …".
- **Share text:** `src/ui/ShareSheet.tsx` `shareText`, which uses "I fit A" and "(this test can't tell them apart)".
- **Sensitive redaction when sharing:** without the share opt-in, sensitive ideologies are left out of the catalogue the shared result is derived from (`catalogueFor`), so the shared headline can differ from the owner's page, not just hide names. This is kept deliberately: deriving on the full catalogue and blanking names would reveal that a sensitive ideology fits, which is what the opt-in protects. The share panel says so when it happens ("…reads “X” instead of “Y”"), and the Method page discloses it. In the pre-v2 simulation (review M2) the headline kind changed for 74 of 4000 adherents; most were splits that the empty-here-and-now change below no longer makes.
- **Share cards:** `src/share/card.ts` `headline`. Long fit lists shrink to their line budget so the chart keeps its room. The compare card reuses it.
- **Preview links and OG stubs:** only one-ideology fit sets get a stub: `p/<a>/` when both frames fit exactly A, and `p/<a>/<b>/` for a split whose frames fit exactly A and exactly B. The stub set is unchanged in size (`scripts/og.ts`); only its wording moved to "fits". The single-ideology stub says "their answers fit A", not "A and no other listed ideology": a link shared under the old rule may now re-score to several fits, and a hidden sensitive fit is still listed.
- **Compare page:** each person's `heroName`, plus "this test can't tell them apart" or the nearest as a measurement.

## Simulation (calibration run 2026-10-31, 8000 draws; `report.fitSet` in `src/data/calibration.json`)

Thresholds are regenerated for the v2 catalogue and Full item bank. The fit-set figures use their own RNG stream after every threshold, end to end: score → core and red-line rule-outs → payload → `deriveResults`. Red lines are simulated at every length, but only axis items enter scoring. The no-gap split check also applies both kinds of commitment, with red-line answers on a separate RNG stream so they do not change the threshold draws. Typical respondents are assumed to favour the humane side of each red line at agree strength (raw ±2 before response noise); this is an impact-model assumption, not population data.

| Quick / Standard / Full | Sincere adherents (48 × 100 per length) | Typical (uniform latent) respondents (1000) | Random clickers (1000) |
|---|---|---|---|
| Own ideology in ideal fit set | **83.3% / 92.7% / 92.1%** | — | — |
| Mean fit-set size (when a set is computed) | 2.17 / 1.64 / 1.17 | 0.07 / 0.01 / 0.00 | 0.00 / 0.00 / 0.00 |
| Exactly one fit | 35.2% / 52.2% / 73.2% | 3.2% / 0.8% / 0.1% | 0% / 0% / 0% |
| More than three fits | 16% / 5.1% / 0.1% | 0.2% / 0% / 0% | 0% / 0% / 0% |
| Empty ("No close match") | 4.2% / 5.8% / 7.3% | 84.6% / 98.8% / 99.9% | 8.5% / 10.8% / 11.8% (the rest are withheld as careless) |
| Headline names an ideology | 84.9% / 94% / 92.7% | 4.2% / 0.9% / 0.1% | 0% / 0% / 0% |

False splits (`report.splitFalseByMode`), for simulated respondents with no real gap, counted only over those whose ideal frame fits something (no one else can be split; 469 / 502 / 456 eligible respondents for Quick / Standard / Full):

| Quick / Standard / Full | Rate |
|---|---|
| **False split (current rule: both sets non-empty and disjoint)** | **1.07% / 0.00% / 0.44%** |
| Here and now fits nothing while the ideal fits (now `constant`) | 6.2% / 1.6% / 7.2% |
| False split if empty here-and-now sets also counted as splits = the two rows added | 7.2% / 1.6% / 7.7% |

- The first version of this page published "2.27%, meets ≤ 5%". That divided by every no-gap respondent, half of them "typical" respondents who fit nothing and so can never be split. The independent review (S1) caught it; on its own seeds it measured 5.5–5.8% / 1.3–1.5% / 7.5–8.4% for that rule.
- `report.splitFalseRate` (0.23%) uses the all-respondents denominator, kept for continuity; don't quote it as the false-split rate.

Random clickers, two different figures from two different samples:

- **Named fit, fit-set sample** (`report.fitSet.random.named`, 1000 per length, own RNG stream): 0% / 0% / 0%. This is the one the Method page quotes.
- **Named headline, legacy axis-only sample** (`report.randomGetsHeadline`, 600 across all lengths, the threshold RNG stream): 1.2%. This check omits commitment rule-outs and red-line answers; it is not the combined-pipeline named-fit rate.

How to read these numbers:

- **Adherent rates are optimistic.** The adherents are simulated from the same coded sheets the profiles were built from.
- **The "typical" model overstates distance.** Its axes are uniform and uncorrelated, while real views are correlated, so the near-100% empty rate is an upper bound, not a prediction. The CF review made the same point (B1).

## Decisions

1. **The "no `?` on a must-agree in a frame where it has been decisively answered" clause.** Per frame, a commitment answered decisively (|a| ≥ 2) is always ✔ or ✘, never `?`. So under a per-frame reading the clause is automatically satisfied and adds no condition, and that is how it is implemented: a `?` never counts as a pass and never excludes. The stricter alternative, "any `?` on a commitment excludes", would treat today's no-go commitments as *required* statements. CF B5 shows this would deny fit to 39–77% of sincere adherents, because the commitments were not designed as required checks. Required statements need their own `kind` and coding, which would need a separate future content change; content v2 adds red-line no-go commitments, not required checks. *Reversible:* add a `requiredUnknown` exclusion in `fits()` once `kind: 'required'` exists.
2. **Rule-outs stay combined across frames.** This is one bitmask in the payload, and a `both`-frame commitment fails if either frame fails. Per-frame rule-outs (CF B8) would need a second bitmask, i.e. a payload format change. Content v2 uses format 3 for the optional red-line block; a second rule-out bitmask remains a future format change. The fit sets themselves are per frame (distance per frame). The Method page says so in one sentence (review M3).
3. **Split = two non-empty, disjoint fit sets.** This replaces the μ margin plus "B not a toss-up" test. μ is still calibrated and published, but gates nothing. A here-and-now set that is empty is *not* a split (changed after review S1): the cut is the 95th percentile, so about 1 in 20 sincere here-and-now frames falls just outside it by noise, and counting those as splits gives 7.2% / 1.6% / 7.7% false splits with v2 (over the 5% target in Quick and Full). The current rule gives 1.07% / 0% / 0.44%. The cost: someone whose here-and-now politics really is far from every listed ideology sees "In theory, you fit A" plus "Here and now no listed ideology is close enough to name", not a split headline. *Reversible:* the alternative (review option b) is a calibrated margin, splitting on an empty here-and-now set only when d(N, A) exceeds the cut by a margin set so the conditional false rate stays ≤ 5%. See open question 5.
4. **Toss-up is no longer a naming gate.** A near tie between ideologies inside the cut shows up as several fits, which says honestly that the test can't tell them apart. A nearest that is a toss-up with ideologies *outside* the cut is still named: the cut is the breakpoint. Stability is shown as a measurement.
5. **Sensitive archetypes** fit only within "very close". The old extra "stable" requirement is dropped, because stability is a who-wins measure and the fit set has no winner. Within "loosely similar" but not "very close", they are listed as "also close", never named. Cards still need the share opt-in.
6. **Preview stubs for single fits only.** This keeps the stub set finite and the same as before. No stub for "A and others": the URL would then name one ideology as if it were the headline. Adherents get a single fit 35–73% of the time, depending on length.
7. **The three distance labels stay, as measurement bands.** CF B1 suggested collapsing them to in-range or out-of-range. Only "loosely similar" is used as a breakpoint, and the hero prints the raw distance and the cut beside the band.
8. **Integration with content v2.** The v2 catalogue, core and red-line commitments, optional format-3 red-line block and split-tile UI are retained. Rule-outs from both kinds of commitment travel in the existing combined bitmask whether or not raw red-line answers are shared. The commitments matrix still uses the top-3 rows (CF B9).

## Known issues

- Quick-length adherents get more than three fits 16% of the time. This is honest, because Quick can't separate close neighbours, but the hero then needs the "All N: …" line.

## Open questions (for Max)

1. **Should a `?` on a commitment ever exclude?** Today it never does (decision 1). If yes, only for a new `kind: 'required'`, coded and audited per CF B5.
2. **Per-frame rule-outs (B8):** do this after content-v2 merges, as payload format 4? Recommendation: yes. It is small, and it stops a here-and-now answer from ruling an ideology out of the ideal headline.
3. **Do we want a preview stub for multi-fit results?** For example, a generic "fits several ideologies" stub with no names. Recommendation: no, until real usage shows people want it.
4. **Should the "constant" kicker keep the word "Constant"?** It now reads "In theory and here and now, you fit". The Reality Gap card already carries the constancy measure.
5. **Should "ideal fits A, here and now fits nothing" ever be a split?** The original spec line said the here-and-now set may be empty. The simulation showed that rule mostly reports noise (decision 3), so it is now shown as "In theory, you fit A" with a here-and-now note. Recommendation: keep it that way. If you want those respondents to see a split, use a calibrated margin beyond the cut (review option b), not the bare cut.
6. **Sensitive redaction (Surfaces):** keep deriving the shared result without sensitive ideologies (privacy first, disclosed), or derive on the full catalogue and show "a result not shown"? Recommendation: keep it, as now.

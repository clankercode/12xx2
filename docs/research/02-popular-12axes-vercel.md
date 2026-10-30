# 02 — The popular 12axes.vercel.app: deep read

Source: `RomanCypherpunk/12axes` (Enzo Xavier Santos). Local clone (untrusted, read-only):
`/tmp/claude-1000/-home-xertrov-src-12x2/6f22d232-cf93-470e-949f-6728e7611f5a/scratchpad/upstream/12axes`
(below, paths are relative to that root). The HEAD read was `dac5540`, 2026-10-30. The history has 59 commits, starting 2026-10-23, so it is probably squashed.
The MIT original I compared against is at `.../scratchpad/upstream/pt-site/12axes`, referred to below as "MIT".

Quantitative claims marked **[sim]** come from my own re-implementation of their formula. I ran it against their JSON data: `/tmp/claude-1000/-home-xertrov-src-12x2/6f22d232-cf93-470e-949f-6728e7611f5a/scratchpad/analysis/compat_stats.py`. No upstream code was executed.

---

## 0. TL;DR

- The scoring is a plain mean of a Likert scale. Each item maps to 0/.25/.5/.75/1 toward its keyed pole. The axis score is a weighted mean ×100, and every weight is 1. There are 240 items, 20 per axis, keyed 10/10. Quizzes draw 3, 5 or 20 items per axis. Five multiple-choice "archetype" items then each add one pseudo-answer with a fixed value to 1–3 axes.
- Matching is a hand-tuned 4-part blend of per-axis quadratic similarity, an "augmented" cosine, a magnitude match and a worst-axis penalty. Weights are 0.42/0.33/0.18/0.07. It is calibrated against a synthetic-noise benchmark, not against real users.
- All ~1,470 catalogue vectors were produced by LLM sub-agents role-playing each entity and answering the 240 items. The catalogue holds 274 ideologies, 675 personalities, 320 countries/regimes and 203 parties. Humans then steered prompts until the outputs "looked right". The README presents this as profiles "not placed by hand".
- The compatibility % is inflated and compressed. **[sim]** Users who answer at random get a top ideology at about 87–93%. The median catalogue entry scores about 65%, and two perfectly opposite extremists still score 18.8%. The UI calls anything ≥85 "high" (`frontend/src/utils/compatibility.ts:7-15`).
- The top-1 label is unstable on the short quiz. **[sim]** With 3 items per axis, a retest gives the same top ideology only 23–51% of the time, depending on assumed item noise.
- "Tension" and "outlier" readouts measure rarity against the LLM-made ideology catalogue, not against people (`AxisOutlierService.java` doc comment, lines 18-21 of that file).
- Monetisation: a paid "full report" (R$14.99 / US$3.99 via Mercado Pago and Paddle), plus GA4 telemetry.
- The license is all-rights-reserved. **We may not copy their question wording, profile text, numeric vectors, archetype effects or calibration data.** Ideas and math are fair to re-derive in our own words. The 12-axis *model* itself comes from the MIT original, so we should take axis concepts from MIT, not from them.

---

## 1. License and provenance constraints

- `LICENSE:1-60` is "All rights reserved". It permits reading, forking on GitHub and preparing PRs only (§2). It forbids copying, derivative works including translations, commercial use, and API access from third-party clients (§3 a–d).
- §1(d) claims "the twelve-axis model, the axis definitions" and §1(e) claims "the matching and scoring algorithms and their calibration data". The axis model is derived from the MIT-licensed politicaltests 12axes (README lines 47-48 admit "inspired by"). Copyright does not protect ideas or methods, but it does cover expression and possibly curated datasets.
- **Our rule:**
  - Take axis concepts from MIT.
  - Write all item text and descriptions from scratch.
  - Generate our own profile vectors.
  - Do not reuse their constants verbatim as "calibration". If we use a similar multi-component scorer, derive our own constants from our own benchmark.
  - Never call their API (§3d).
- README §License (line 283) restates the same terms.

## 2. Architecture snapshot (context)

- Java 21 / Spring Boot backend on Render does **all scoring server-side** (`POST /api/results`). The React/Vite frontend is on Vercel and Cloudflare Pages. There is no database; JSON is loaded at boot (README "Architecture").
- Shared results are rebuilt from a 12-number vector: `/r?v=70-80-20-…` (`frontend/src/utils/shortLinks.ts:6-56`) and `GET /api/results/by-axes?v=…`. The vector is enough to recompute every match, so **a static SPA can do the same client-side.** This is the model we should copy conceptually.
- The UI says "Your answers are not stored" (`frontend/src/i18n/en.ts:711`), yet answers are POSTed to the backend and GA4 is loaded (`frontend/index.html:275-281`, `frontend/src/utils/analytics.ts:1-14`). Our "no backend, no telemetry" requirement is a real differentiator.

## 3. Axes, and how they differ from the MIT original

Their axes (`backend/src/main/resources/data/i18n/en/axes.json`). The score is `leftPercent` (100 = left pole).

| # | id | Label | Left pole (100) | Right pole (0) | MIT original (`pt-site/12axes/results.html:22-115,153-164`) |
|---|---|---|---|---|---|
| 1 | estrutura | Structure | Federal | Unitary | same (Confederal…Extremely Centralized) |
| 2 | representacao | Representation | Democracy | Autocracy | same (Liquid/Direct democracy…Autocracy) |
| 3 | poder | Power | Security | Liberty | same concept (Totalitarian…Anarchist) |
| 4 | imigracao | Immigration | Assimilation | Multiculturalism | same, but MIT's extreme poles are Ethnonationalist ↔ "Racially Colorblind" |
| 5 | diplomacia | Diplomacy | Militarist | Pacifist | same (Expansionist…Anti-War) |
| 6 | intervencao | Intervention | **Non-interventionist** | Nationalist | **Changed.** MIT's pole is *Internationalism* (World Government…Ultranationalist), with Non-Interventionist as the *centre* label |
| 7 | economia | Economy | Public | Private | MIT pole image is "equality", labelled Communist…Extreme Capitalist |
| 8 | controle | Control | Planning | Free market | same |
| 9 | comercio | Trade | Protectionism | Globalism | same (Isolationist…Global Economy) |
| 10 | religiao | Religion | Irreligious | Religious | same (Antitheist…Ultra-religious) |
| 11 | moral | Morality | Progressive | Traditionalist | MIT calls it **Culture** (Revolutionary…Reactionary) |
| 12 | tecnologia | Technology | Technology | Biology | MIT: Transhumanist…Primitive ("bioconservative") |

Substantive differences:

- **Intervention was re-poled.** MIT measures internationalism ↔ nationalism. Vercel measures non-intervention ↔ assertive nationalism, defined as "refusal of external projection vs aggressive sovereignty" (`backend/src/main/resources/data/axes-explained.md` §06). This conflates two things. Non-interventionism is a classic *nationalist/paleo* position, and internationalism (cooperative, institutional) has no pole. Hence the catalogue correlation of r = −0.87 between Diplomacy and Intervention **[sim]**: the two axes nearly collapse into one.
- **The Religion axis mixes personal faith with church-state policy.** `axes-explained.md` §10 says so explicitly: "measures both private religious position and position on the state". That makes it double-barrelled.
- **Scoring direction is confusing.** "Left pole = 100" means Democracy = 100 but Liberty = 0, so higher numbers don't mean the same thing across axes. Their own audit doc claims `axes-explained.md` had religion and immigration inverted (`profile-audit/README.md:314-334`). The current file looks consistent, so that warning is probably stale, but it shows how easy this is to get wrong.
- **Labels and thresholds.** MIT uses 7 named labels per axis, with cut-points at >90, >75, >60, 40–60 centre, ≥25, ≥10, ≥0 (`results.html:166-176`). Vercel uses 4 intensity bands symmetric about 50, giving 7 levels in total (§7).

## 4. Answer scale and item scoring

- **Scale:** 5-point Likert. Strongly agree / agree / neutral / disagree / strongly disagree map to 1.00/0.75/0.50/0.25/0.00 (`backend/src/main/java/com/twelveaxes/model/AnswerValue.java:128-134`). There is no "don't know / skip". Neutral is scored as a 0.5 midpoint, so indifference and ignorance are confounded with moderation.
- **Item keying:** each item has one `axisId`, an `agreePole` of LEFT or RIGHT, and a `weight`.
  - `leftScore = agreePole==LEFT ? s : 1 − s` (`service/ScoringService.java:88-91`).
- **Axis score:**
  - `leftPercent = 100 · Σ(leftScore·w) / Σw` (`ScoringService.java:76-85,147-149,187-199`).
  - The result is clamped to [0,100] and rounded to 0.1 (`:151-152`). An axis with no answers is 50 (`:197`).
- **Weights:** all 240 items have `weight: 1` (verified, `questions-pool.json`). The weight field is dead.
- **No cross-loadings:** each item feeds exactly one axis.
- **Compared with MIT:** MIT used a 7-button scale (+2, +1, +0.5, 0, −0.5, −1, −2), summed the answers, and scored `50 + 5·sum` with 5 items per axis (`pt-site/12axes/quiz.html:20-25,87-114`). MIT items carry intensity tiers, but scoring uses only their sign (`rate<4 ? 1 : −1`, `:91`). Vercel's mean-of-Likert is cleaner, but both treat ordinal answers as interval data.
- **"Answer impacts" (premium):**
  - The contribution of an item is `w·(leftScore−0.5)/Σw·100` (`ScoringService.java:50-69`).
  - Per axis these sum to the distance from 50. This is a nice, honest "why did I get this" feature.

## 5. Question pool and selection

- **Pool structure:** 240 items = 12 axes × 20, with exactly 10 LEFT-keyed and 10 RIGHT-keyed per axis (verified). The fields are `id, axisId, text, agreePole, weight`. Optional `terms` (glossary links) and `help` (what agree/disagree means) are attached at load (`model/Question.java`).
- **Variants:** short = 3 items per axis (36 total), extended = 5 (60), extreme = all 240 (README lines 66-72; `MATCH_EXPLAINED.md` "Variantes").
- **Selection** (`frontend/src/utils/quizSelection.ts:3-51`):
  - Items are drawn at random per axis.
  - The odd item alternates by axis: axis 0 gets ⌈n/2⌉ LEFT-keyed, axis 1 gets ⌈n/2⌉ RIGHT-keyed, and so on.
  - The final order is shuffled and interleaved LEFT/RIGHT.
  - **Consequence:** in short and extended quizzes each axis is keyed 2:1 or 3:2. Acquiescence bias therefore pushes individual axes toward a pole, and only the aggregate across axes balances. Item sampling is random per session, so two users (or one user twice) get different items. That adds item-sampling variance and makes results not strictly comparable.
- **Swap a question:** a user can replace any item with another from the same axis and keying (`quizSelection.ts:113-141`, `App.tsx:573`, label "Swap" at `en.ts:480`). This is good UX, but it lets respondents drop items they find hard, which is a mild selection effect.
- **The axis name is shown on each question card** (`components/QuestionCard.tsx:68`). This primes respondents to answer "consistently" for that axis (demand effects), and inflates internal consistency.

## 6. Archetype questions (how they feed scores)

- File: `backend/src/main/resources/data/archetype-questions.json`; model `model/ArchetypeQuestion.java:67-98`.
- There are 5 forced-choice items, shown at the end of the quiz:
  - **society**: 6 options touching moral, religion and immigration
  - **power**: 5 options touching representation, structure and power
  - **economy**: 6 options touching economy, control and trade
  - **world**: 5 options touching diplomacy and intervention
  - **technology**: 5 options touching technology
- Every axis is touched exactly once.
- Each option holds `effects: {axisId: leftPercent 0–100}`. The chosen option is added to each touched axis **as one extra answer of weight 1**, with value `effect/100` (`ScoringService.java:109-132`).
- **Weight is large on short quizzes.** With 3 Likert items per axis, the archetype is 1 of 4 data points: 25% of the axis score, set by one stereotyped package choice. On the 240-item quiz it is 1/21, about 5%.
- **Packages impose correlations.** Each option is a bundle, for example "faith + family + nation" sets religion, moral and immigration together. Choosing it pushes three axes jointly toward the catalogue's stereotype. That works against the stated goal of keeping "unusual combinations" (README line 31).
- Effects are hand-authored numbers with no stated derivation.
- Catalogue profiles also answer the archetypes (`profile-audit/README.md` "Perguntas de arquétipo"), so the bias is symmetric between users and profiles. That is the defensible part.
- A final optional **religion question** only filters which profiles are shown. It does not score (README line 74; `MATCH_EXPLAINED.md` "Parâmetro opcional religion"). Note that this filter hides ideologies tied to *other* faiths, so the ranking a user sees is curated to be agreeable to them.

## 7. Level thresholds

- Bands are based on distance from 50 (`ScoringService.java:169-181`, `model/AxisLevel.java:11-22`):
  - **Balanced:** < 7.5, i.e. scores 42.5–57.5
  - **Leaning:** < 22.5
  - **Strong:** < 37.5
  - **Very strong:** ≥ 37.5
  - That gives 7 levels including the side.
  - `axes-explained.md` has the table and examples.
- On the 5-point grid with 3 items per axis, the reachable axis values are multiples of 8.33. The bands therefore map to just one or two answer patterns each.
- **Probable bug:** the share card tests `axis.intensity === 'Equilibrado'` (Portuguese) (`frontend/src/utils/shareCard.ts:420`), but English results return `"Balanced"` (`ScoringService.java:171-172`). English cards therefore show balanced axes as a dominant pole. Their own README demo card (`.github/assets/result-card.png`) shows "Nationalist 55%", which falls inside the balanced band. **Lesson:** compare enums, never localised strings.

## 8. Matching / compatibility formula

Source: `service/ProfileMatchScorer.java:27-193`, with a prose description in `backend/src/main/java/com/twelveaxes/MATCH_EXPLAINED.md`. Vectors are 12 `leftPercent` values.

```
compat = clamp01_100( 0.42·A + 0.33·D + 0.18·M + 0.07·O ), rounded to 0.1

A (axis similarity)  = 100 · mean_i s_i
    s_i = max(0, 1 − (|u_i − t_i| / 50)^2)
    if (u_i−50)(t_i−50) < 0:  s_i *= 1 − 0.45 · tanh(|u_i−50|/25) · tanh(|t_i−50|/25)

D (augmented cosine) = 50 + 50 · (u'·t' + k) / sqrt((|u'|²+k)(|t'|²+k)),
    u' = u−50, t' = t−50,  k = n · 8² = 768 for n=12   (DIRECTION_AUGMENT_RADIUS = 8)

M (magnitude)        = 100 − 2 · | mean_i|u_i−50| − mean_i|t_i−50| |

O (worst axis)       = 100 · max(0, 1 − (max_i|u_i−t_i| / 100)^2.5)
```

Constants are at `ProfileMatchScorer.java:29-38`.

Nonlinearities:

- The per-axis term is quadratic and goes to zero at a 50-point gap.
- An opposite-side penalty multiplies the per-axis term by tanh.
- The cosine has a constant offset. Its effect is that centre-vs-centre scores 100 instead of 50, so the old ceiling of 83.5 for an all-neutral user is gone (`MATCH_EXPLAINED.md` "Caso neutro").
- The worst-axis term uses a 2.5 power.

**Percentile:**

- `percentile = 100 · #(catalogue scores < c) / N`, computed per catalogue (`ProfileMatchScorer.java:67-107`).
- It is relative only to *their* catalogue.
- The religion filter removes rows but keeps percentiles computed over the full catalogue (`IdeologyMatcherService.java:80-100`).

**Ranking:**

- Sort by compat descending, then by name (`IdeologyMatcherService.java:102-106`).
- Return the top 4 ideologies (`:15`) plus the bottom-1 "least compatible" (`:43-51`).
- The API returns the top-1 country, the top-1 personality, and the top-3 and bottom-3 parties (`MATCH_EXPLAINED.md` "Fluxo da API").

**Calibration:**

- `ScorerBenchmarkTest` perturbs catalogue vectors with Gaussian noise of σ = 10 and σ = 15 axis points, then checks that each perturbed vector still matches its own profile (`backend/src/test/java/com/twelveaxes/service/ScorerBenchmarkTest.java:18-34,214`).
- The thresholds were lowered when the catalogue grew. `MIN_RECOVERY_SIGMA_10_PERCENT = 72` (`:28`), but `MATCH_EXPLAINED.md` notes the gate was 77 and was failing on `main`.
- Reported self-recovery is 77.5% at σ = 10 and 51.7% at σ = 15. The mean gap between first and second place ("discrimination") is about 4.2 points (`MATCH_EXPLAINED.md` benchmark table).

**Subset ("by dimension") matching:**

- The same formula runs over axis subsets (`ProfileMatchScorer.java:49-65`; `service/DimensionMatcherService.java:36-67`):
  - "political" subset: actually all 12 axes, so it is the full vector, matched only against politician, theorist and activist personalities
  - "social" subset: 9 axes, which oddly include economy, control and trade
  - "economic" subset: economy, control, trade (3 axes)
- With 3 axes, a "100% match" is cheap. The promo video brags "Hayek 100% by dimension" and "Pinochet's Chile 99%" (`brag-output/brag-plan.md` "Key moments").

**Other derived readouts:**

- **Political values** (`service/PoliticalValuesService.java:20-108`, data `political-values.json`):
  - Six categories (politics, foreign policy, economics, immigration, society, technology) with 9–29 named values each.
  - Each value is a nearest-prototype pick, using the mean squared distance over the axes that value defines.
  - If every base axis is within ±7.5 of 50, the user gets that category's neutral label (`:87-92`).
  - This is a good guard against handing centrists a strong label.
- **2-D compass projection** (`frontend/src/utils/politicalCompass.ts`):
  - right = 0.6·(100−economy) + 0.4·(100−control)
  - authoritarian = mean(power, 100−representation, 100−structure)
  - traditional = 100−moral
  - These are linear and transparent.
- **"Ideal government" (premium):**
  - Each cabinet seat goes to the top-matching personality of a category (`service/IdealGovernmentService.java:9-46`).
  - It is novelty content, unrelated to our "ideal system" concept.

## 9. Tension and outlier logic

**Tension** (`service/AxisTensionService.java:14-181`):

1. Run over all 66 axis pairs.
2. Require the user to lean at least 15 points off centre on both axes (`MIN_LEAN = 15`).
3. Take the Pearson correlation *across the ideology catalogue*, and require |r| ≥ 0.45.
4. Keep pairs where the user's sign combination goes against the sign of r.
5. Rarity = 1 − (share of ideologies on the same sides, with the catalogue side threshold at ±10).
6. Score = |r| · rarity, and return the strongest pair, or `null`, in which case no tension is shown. Not inventing a tension is good practice.
7. **[sim]** 29 of 66 pairs pass |r| ≥ 0.45. The strongest are Diplomacy/Intervention at −0.87, Economy/Control at +0.86, Immigration/Moral at −0.80 and Structure/Power at −0.79.

**Outlier** (`service/AxisOutlierService.java:195-322`):

- For each axis, compute the distance from the ideology catalogue's *median*.
- The "most unusual" axis has the largest distance and the "most common" axis the smallest.
- The text is direction-aware: being at 50 when the median is 67 is reported as "more X than the catalogue", not as extreme. That is careful.
- The %-behind figure is computed against ideologies.

**Validity caveat (they admit it, `AxisOutlierService.java:200-202`):** there are no user responses, so "rare" means "rare among 274 LLM-generated ideology vectors". That is a curated set skewed to doctrinal extremes, with mean intensity 22.9 versus 0 for the centre **[sim]**. It does not measure population rarity. Presenting this as "positions that rarely appear together" (README "Features") overstates it.

## 10. How the catalogue vectors were produced

- **Process** (`profile-audit/README.md:1-200`, `profile-audit/NEW_PROFILE.md`, `.claude/skills/new-*/SKILL.md`, `.claude/skills/audit-*/SKILL.md`):
  1. Claude Code sub-agents are dispatched in parallel batches of 15, with Sonnet or better required and Haiku banned (`README.md:16,167`; `NEW_PROFILE.md:571,707`).
  2. Each agent receives the entity's ~30-word curated description. Per axis it writes a 1–2 sentence "persona brief", then answers all 20 items DT/D/N/C/CT "as the profile's real spokespeople would", plus the 5 archetypes.
  3. `profile-audit/profile_vector.py` turns the answers into a vector with the user formula.
  4. Answers are archived in `profile-audit/answers/<catalog>/<id>.json`, 1,534 files.
- **Catalogue sizes [sim]:**

  | Catalogue | Count | Mean intensity |
  |---|---|---|
  | Ideologies | 274 | 22.9 |
  | Personalities | 675 | 20.8 |
  | Countries/regimes | 320 | 19.9 |
  | Parties | 203 | 22.4 |

  The README's "+230 / +390 / +170" figures are stale.
- **Country rule:** agents answer "as the REGIME, by actual institutional practice, not by what the population, opposition or constitution says" (prompt template in `profile-audit/README.md`, "Só para o catálogo país/nação"; failure mode 5 at `:386`). **This is directly relevant to 12xx2.** It is an implicit "current situation" reading, which they found necessary because normative items answered "for a country" drift toward the society's ideal.
- **`validate.py` gates** (`profile-audit/validate.py:46-58`):
  - **Blocks:**
    - more than 18% neutrals overall, or more than 30% on any axis
    - ≥ 97% similarity to an existing profile, i.e. a near-duplicate
  - **Warns:** at 93% similarity, or when a profile matches its declared exemplar personality at < 92%. The new-ideology skill (`.claude/skills/new-ideology/SKILL.md:37`) says that below 92%, "one of the two vectors is wrong".
- **Human steering:** the "known failure modes" (`profile-audit/README.md:338-395`) record vectors being re-prompted until they landed "beside" acceptable neighbours. Examples:
  - Nietzsche's economy moved from 20 to 33.8.
  - Lassalle's power moved from 66 to 26.
  - Countries came out too democratic.
- Live persons gave materially different vectors in two independent AI sessions, e.g. representation 51 vs 76 (`NEW_PROFILE.md:61-64`).

Assessment:

- The method is consistent: profiles and users are measured with the same instrument, which is the right idea.
- The vectors are still **LLM opinion filtered by one author's sense of plausibility**. They are not expert-coded data, and there is no inter-rater reliability.
- Several mechanisms push profiles away from the centre:
  - the neutral cap
  - the "N only for genuine indifference" instruction
  - the anti-duplicate block
  - the requirement to agree with a named exemplar, which makes calibration circular
- The README sentence "Every profile … answered the same 240 questions …, instead of being placed by hand" (line 33) is technically true but misleading about provenance.

## 11. Share and social features, and the result card

- **Story card** (`frontend/src/utils/shareCard.ts:13-20,136-200,649-704`; render `utils/shareImage.ts:51-64`):
  - A 1080×1920 PNG rendered client-side with `html-to-image` and a canvas.
  - Fonts are Sora (display) and Poppins (body).
  - The background colour comes from the top ideology's family.
  - **Layout from top to bottom:**
    1. brand + "MY RESULT"
    2. family label + top ideology name, auto-fit from 76 to 40 px (`:268-285`)
    3. left column: a large portrait of the top personality, with a huge "93%" and "MOST COMPATIBLE"
    4. right column: "YOUR 12 AXES", each row an icon + dominant pole + mini-bar + %
    5. two list boxes, "Other personalities" and "Nearby countries", each with flags/portraits and %
    6. footer CTA + URL + **QR code** carrying the short result link (`:639-704`, `utils/qrMatrix.ts`)
- **Links:** the short result link `/r?v=…&r=<religion>&l=en` carries the 12 values compactly (`utils/shortLinks.ts:30-56`). Another link compares two named people (`compactCompareUrl`, `:58-81`; `components/compare/*`).
- **Other social pieces:**
  - "last result" kept in localStorage for 30 days, used for "edit answers" (`utils/lastResult.ts:84-147`)
  - a PDF report (`components/report/*`)
  - static SEO pages per catalogue entry (`frontend/scripts/*-page.mjs`)
  - an XLSX ranking export (`utils/rankingXlsx.ts`)
- **Marketing:** a 28.5 s promo video (`brag-output/brag-plan.md`, `brag-output/brag.mp4`). Its hook is "Do you really know your political ideology?" and the share copy (`brag-output/share-copy.txt`) stresses free, anonymous and story-ready. The plan devotes about two-thirds of the video to touring real result sections, ending on the story card.
- **What makes the card work virally:**
  - an identity label (ideology name)
  - a famous face with a big %
  - "people/countries like you", which is provocative because it surfaces odd pairings such as "you ≈ Pinochet's Chile 99%"
  - a QR code back to the exact result
- **What is weak about it:**
  - the big % is inflated (§12)
  - the dominant pole is shown even for balanced axes, because of the bug in §7
  - "Unitary 60%" reads as a stance when it is a lean

## 12. Monetisation and telemetry (context)

- **"Relatório completo" paywall:** R$14.99 / US$3.99 (`frontend/src/i18n/pt.ts:616`, `en.ts:627`; `render.yaml:24`).
- **Payments:** gateways are Mercado Pago (BRL) and Paddle (USD). The latest commits switched to Paddle live (`git log`: `dac5540`, `fa73950`). The README still says Stripe, which is stale.
- **Entitlement:** signed tokens in `payment/EntitlementToken.java`.
- **Premium contents** (`service/PremiumReportService.java:15-60`):
  - per-answer impacts
  - where you disagree with your top matches
  - "ideal government" cabinet
  - per-axis level texts
  - timeline
  - top-10 countries and full rankings
- **GA4** (`G-JF63DF6BNM`) tracks the paywall funnel events (`index.html:275-281`, `utils/analytics.ts`).
- **Overclaiming in marketing copy:**
  - "Know the exact synthesis of your thinking with 100% precision" (`en.ts:102`, extreme variant)
  - "The test is reliable" (`en.ts:345-347`), with no reliability data anywhere in the repo
  - against those, the honest disclaimers at `en.ts:375-377` and README line 86

## 13. Independent quantitative checks [sim]

These use my re-implementation of §8 against their JSON, with uniform 5-point answers unless stated. The script is `.../scratchpad/analysis/compat_stats.py`.

| Check | Result |
|---|---|
| All-neutral user (all 50) | top = their "Radical Centrism" profile at 100; next two ≈ 92 and 90; *bottom* ideology still **41.9** |
| Perfectly opposite extremes (all 100 vs all 0) | **18.8**. The magnitude term gives a free 18, and direction ≈ 2.5 |
| Random answerers, short quiz (3/axis) | top-1 ideology mean **87.5**; catalogue median 65.0; bottom 36.9 |
| Random answerers, extended (5/axis) / extreme (20/axis) | top-1 mean **89.0** / **93.0** |
| Uniform random 12-vectors | top-1 mean 82.6; median 60.6 |
| Retest stability, short quiz | Respondent's true vector = an ideology; item noise σ = 0.2–0.3 scale units. Same top-1 on two runs: **51% / 23%**. Self-recovery 68% / 43% |
| Retest stability, extended / extreme | retest agreement 72% / 95% (σ = 0.2) and 43% / 75% (σ = 0.3) |
| Catalogue axis correlations | 29/66 pairs have \|r\| ≥ 0.45. Diplomacy–Intervention −0.87, Economy–Control +0.86, Immigration–Moral −0.80. The "12 independent axes" are about 5–7 effective dimensions in their catalogue |

Interpretation:

- Almost anyone gets a top-match ≥85%, which the UI labels "high", so the headline % carries little information.
- Rank order is meaningful. The absolute % and the top-1 label on short quizzes are not robust.
- The archetype items were excluded from the simulation. They would add a stereotyped prior and somewhat raise retest agreement. UNVERIFIED by how much.

## 14. Critical assessment

### Good (worth keeping in spirit)

- A fixed, open item→axis keying with **balanced keying at pool level** (10/10), plus LEFT/RIGHT interleaving to blunt acquiescence.
- **The same instrument scores users and reference profiles.** The method is symmetric and auditable, with archived per-item answers.
- **Additive, explainable scoring:**
  - "answer impacts" sum exactly to the axis offset
  - a 2-D projection whose linear weights are documented
  - a neutral-band guard on derived labels
  - `null` tensions instead of invented ones
- **Percentile within catalogue** alongside the raw score, with explicit "not a probability" caveats (`MATCH_EXPLAINED.md` "Erros já cometidos").
- **A documented calibration benchmark:** recovery, opposite-rejection, centre, stability, discrimination and extremity. They also recorded rejected alternatives such as hard cut-offs, with the reasons.
- **Stateless share URLs:** the 12-vector rebuilds the whole result, and the QR code links back to it.
- **The "answer as the regime's actual practice" rule for countries**, an implicit current-state vs stated-ideal distinction.

### Weak or indefensible

1. **LLM-generated reference vectors are presented as authoritative.** They are role-play outputs from one model family, human-steered toward expected neighbourhoods. There is no expert coding and no inter-rater agreement, and session-to-session drift is admitted. Catalogue size, roughly 1,470 entries, is used as a selling point, but more noisy targets mean more spurious near-ties (discrimination is about 4 points).
2. **The compatibility % is inflated and compressed** (§13). Floors come from the magnitude term (+18) and the augmented cosine, so near-opposites still score about 19–42%. The "≥85 = high" label is applied to random answerers. Presenting a 0–100 blend of four heuristics as "% compatible" invites the probability misreading they warn against.
3. **Likert is treated as interval and neutral as a true midpoint.** There is no don't-know option, there is no IRT, and items are assumed equal in difficulty and discrimination.
4. **Short-quiz reliability is poor.** It has 3 items per axis, with 2:1 keying per axis and randomly sampled items. A 25% weight on a forced-choice stereotype bundle is added on top. The top-1 label is close to a coin flip on retest **[sim]**, yet it is the hero of the share card.
5. **The axes are not independent in their own data** (§13), despite README line 31. Intervention's re-poling made Diplomacy and Intervention almost redundant. Religion mixes private belief with state policy.
6. **Tension and outlier "rarity" is relative to the catalogue, not to people.**
7. **Contradictory claims.** "Not scientific" (README line 86, `en.ts:377`) sits beside "reliable" and "100% precision" in the marketing (`en.ts:102,345-347`).
8. **Privacy claims are loose.** "Answers not stored", but answers go to a server and GA4 runs.
9. **Localisation bug** in the share card's balanced detection (§7).
10. **Items are normative and context-free.** "Should X be done?" mixes "is it needed here and now?" with "is it legitimate in principle?". Their country prompt had to patch this for profiles, but users get no such frame. **This is exactly the gap 12xx2 targets.**

## 15. Ideas worth re-implementing originally (in our own words)

- **Pool-balanced keying + per-axis balance in every variant.** Use an even item count per axis per variant (2/4/…), or a fixed counterbalanced form rather than random draws, so every user sees comparable items.
- **One instrument for users and profiles**, but:
  - give profile provenance honestly ("model-estimated, reviewed by …")
  - report uncertainty (multiple independent runs → mean ± spread)
  - prefer fewer, well-justified anchors over hundreds of entries
- **An explainable score breakdown** (per-answer contribution, summing exactly) and stateless URL-encoded results with a QR code.
- **A less inflated similarity measure.** For example, a single distance-based similarity such as `100·(1 − RMS(u−t)/50)` clipped at 0, or a distance-to-percentile against a null distribution. Show rank and margin ("clear winner" vs "tie among 3") rather than a big %. If we keep a multi-term blend, calibrate our own constants on our own benchmark, publish the benchmark, and report the random-answer baseline.
- **Neutral-band guard** on every derived label, enforced with language-independent enums.
- **Tension readout**, reframed honestly as "unusual relative to our reference set", or better, relative to the *user's own two layers* (see below).
- **Country "practice vs stated ideal" rule → our core twist.** For 12xx2, each item gets two responses on the grid:
  - **Here & now:** should this be done in my actual society, given its institutions, corruption and constraints?
  - **Ideal system:** in a well-functioning legitimate system, would this ever be done if the conditions arose?
  - This yields per-axis *Now* and *Ideal* scores plus a **gap** per axis, (Now − Ideal), which is a "necessity / reform-pressure" signal.
  - A tension finding can then be intra-person ("you want strong security now but liberty in principle"), with no need for a population database.
  - Matching can run separately on the Ideal vector (philosophy) and the Now vector (programme).
- **Separate "don't know / depends" from neutral**, and exclude it from means rather than scoring 0.5. Our grid naturally captures "depends on conditions" as Now ≠ Ideal.
- **Fix the axis definitions:** restore MIT's Internationalism ↔ Nationalist pole, and split or clarify Religion as state-religion policy rather than personal faith.

## 16. Do-not-copy checklist

- Their item texts (PT or EN), archetype option texts and `effects` numbers.
- Profile names chosen as their catalogue set, descriptions, "phrases" and **any vector values**.
- `political-values.json` names, descriptions and profiles.
- `axes-explained.md` prose, axis colours, icons and card layout specifics (Sora/Poppins + family-colour story card).
- The exact constants of `ProfileMatchScorer` (0.42/0.33/0.18/0.07, 0.45, 25, 8, 2.5). If we use a similar idea, derive our own.
- Never call `one2axes-backend.onrender.com` or any of their endpoints.

---

## Critic addendum (completeness critic, 2026-10-31)

**Re-verified in the clone:** blend weights 0.42/0.33/0.18/0.07 and `DIRECTION_AUGMENT_RADIUS = 8.0` (`backend/.../service/ProfileMatchScorer.java:29-32,38`; the blend itself is at `:60-63`, which is what doc 03 §1 cites as `:55-63` — both citations are correct, not a contradiction). Localisation bug confirmed: `shareCard.ts:420` tests `'Equilibrado'` while `ScoringService.java:172` returns `"Balanced"` for English.

**Resolves an open item in doc 03.** Doc 03 §1 table marks "[UNVERIFIED how they break ties]" for 3-item short-form keying. §5 above answers it: the majority pole alternates by axis (`frontend/src/utils/quizSelection.ts:3-51`), so each axis is 2:1 keyed and only the aggregate balances.

**Gaps for the design phase:**
1. **User expectation vs licence.** The viral audience knows *this* version's axis names, card layout and "Most compatible: X 93%" format. We can't copy any of it (§1, §16), and the % format is itself indefensible (§13). The design has to replace the "big %" hook with something just as postable and honest. Candidates in doc 05 §6.1: the pair label "In theory A · Here and now B" and the paired-dot strip. Note: a raw "Gap NN/100" is **not** a safe replacement — see the doc 04 critic addendum (random clickers get about 38–40/100).
2. **No equivalent of their country-regime rule exists yet for our catalogue's *Now* vectors.** §10 shows they needed an explicit "answer as the regime's actual practice" rule. Doc 04 §2.2(i) proposes per-ideology *transitional* vectors "for a reference context". No doc yet specifies who codes them, from what sources, or how disagreement is shown. Design must specify a coding protocol: per-axis value + range + citation, ≥2 independent codings, spread published. Doc 03 §8.2 already recommends archetypes as ranges with relevance weights.
3. **The benchmark idea is worth copying as a method; doc 03 does not yet specify one for us.** Pre-launch acceptance tests for our scorer should include at least:
   - all-agree → every axis exactly at centre;
   - random-answer top-match distribution → mostly labelled "ambiguous";
   - self-recovery of each archetype under ±SEM noise;
   - an opposite-extremes floor near 0;
   - the gap-noise baseline from the doc 04 critic addendum.

# Criticisms of the 12axes quizzes, and of 12 Axes²

This document critiques the two existing "12axes" political quizzes and explains, issue by issue, what 12 Axes² does differently and what it still gets wrong. The in-app page ("Why a new test", `src/ui/pages/CriticismsPage.tsx`) is the short version; this is the long version with evidence.

The two quizzes:

- **The original 12axes** (politicaltests.github.io, MIT; lineage 8values → 9axes → 12axes). Read at commit `5a508de` (2025-02-27). Evidence: `docs/research/01-original-mit-12axes.md`, cited below as **[01]**. Line references such as `quiz.html:91` point into that upstream repo.
- **12axes.vercel.app**, the version that went viral in October 2026 (RomanCypherpunk/12axes; all rights reserved). Read at `dac5540` (2026-10-30). Evidence: `docs/research/02-popular-12axes-vercel.md`, cited as **[02]**. Its question text, profile text and numeric vectors are not reproduced here or anywhere in this repo. Figures marked **[sim]** come from our re-implementation of its formula run against its data, not from its own reports.

Numbers about 12 Axes² come from the code (`src/engine/score.ts`, `src/engine/match.ts`) and from `src/data/calibration.json`, which `scripts/calibrate.ts` produces. **Every 12 Axes² error rate quoted here comes from a seeded simulation of synthetic respondents, not from real people.** No real-respondent data exists.

Spec: `docs/superpowers/specs/2026-10-31-12xx2-design.md` (cited as **[spec]**).

---

## Summary

| # | Problem | Original | Vercel | 12 Axes² remedy | Residual |
|---|---|---|---|---|---|
| 1 | One frame mixes "what is just" with "what my country needs now" | yes | yes | Every item answered in two frames on one grid | Now answers depend on country and perception; frame comprehension unverified |
| 2 | Scoring ignores item intensity | yes | n/a | Only polar items, matched in strength | Extremity matching is editorial, not measured |
| 3 | Short-form off-by-one skews every axis | yes | no | Fixed, nested forms | none known |
| 4 | Short and long forms on different scales | yes | no | One formula; only the band changes | none known |
| 5 | Neutral and unsure merged | yes | yes | Pass is missing data, per frame | Pass rates may differ by group; not studied |
| 6 | Per-axis keying imbalance → acquiescence moves scores | yes (3:2 random) | yes (2:1, 3:2) | 2:2 / 3:3 / 5:5, balanced keyed mean | Agree/disagree format kept |
| 7 | Random item sampling makes results incomparable | yes | yes | Same items, same order, per mode | none known |
| 8 | Matching uses 4 of 12 axes with a polarity bug | yes | no | All covered axes, weighted RMS | Correlated axes double-count |
| 9 | Inflated "% compatible"; unstable top-1 | n/a | yes | No percentages; calibrated labels; stability | Label cuts calibrated on simulated adherents, not real ones |
| 10 | Reference profiles of unclear provenance | partly | yes (single-family LLM role-play) | Multi-family LLM coding, median, spread published | Still LLM judgment, not expert or adherent |
| 11 | Data leaves the device | fonts, screenshot service | answers POSTed, GA4 | Static, CSP `connect-src 'none'`, fragment-only scores | Host logs; shared links disclose opinions |
| 12 | Share incentives reward drama over accuracy | weak | strong | Gated hero, no living people/countries, sensitive policy | Labels are still an identity hook |

---

## 1. The single-frame problem (the core motivation)

### What the originals do

Both quizzes ask one question per statement: roughly, "do you agree?". Neither says *where* or *under what conditions*.

The original goes further and **mixes two frames inside one bank**. Some items are status-quo-relative and only make sense against the respondent's own country: "Local governments should have more power than they currently do." (`questions.js:14`), "Taxation for the rich should be higher than it is now." (`:400`), "Society has become too progressive." (`:329`), "Tariffs should be lowered." (`:450`). [01] §6 and [04] §4 list about 14 such lines between them. Other items are explicitly ideal-framed: "Communism, if implemented correctly, would be a good form of economics." (`:215`), "Theocracy is a good system of government" (`:292`). So an axis score blends "what my country needs now" with "what is just in principle", in an unknown proportion that differs from axis to axis.

The vercel version writes normative statements with no frame at all. Its own profile-coding prompt had to add a rule for *countries*: answer as the regime actually behaves, not as its constitution or population would say ([02] §10). That shows the authors ran into the problem, but respondents get no such frame ([02] §14, weak point 10).

### Why it matters for accuracy

Take two people with identical values: one in Iran, one in Denmark. Faced with "wealth concentrated in a few hands should be redistributed", the Iranian may agree strongly. In an extractive order, elite wealth *is* the political problem, and legal channels for fixing it are blocked. The Dane may be lukewarm, not because they value equality less but because Denmark's problems can be fixed within its existing legal framework, and wealth there does not buy policy to the same degree ([04] §1.9, §2.3; Acemoglu & Robinson's extractive vs inclusive institutions; Hirschman's efficacy of voice).

A single-frame quiz scores these two people differently on the economic axis for reasons that have nothing to do with their values. Survey evidence points the same way. Svallfors (2013, 29 ESS countries) finds that perceived government quality independently raises support for taxes and spending, and that egalitarianism matters more where government quality is high ([03] §6). Raw self-reports are known to be incomparable across contexts (King et al. 2004: China ranks above Mexico on raw political efficacy until anchoring vignettes reverse it).

In political philosophy this is the gap between **ideal theory** (what a just system does under reasonably favorable conditions) and **non-ideal theory** (what is required under partial compliance, bad institutions and transition): Rawls, Sen, Mills, Valentini ([04] §1). The economics of the second best (Lipsey & Lancaster 1956) adds that moving one dimension toward its ideal while others stay non-ideal can make things worse. So an answer that differs between the frames is not hypocrisy.

### What 12 Axes² does instead

- **Every statement is answered twice on one 7×7 grid**: *In your ideal system* (x) × *Here and now* (y). The diagonal ("same in both") is highlighted but never preselected ([spec] §3.1).
- **Both frames rate the identical proposition**, so only the setting differs. An earlier draft asked "would it *ever* do this" for Ideal and "should it, now" for Now. That would have pushed every Ideal answer on emergency or remedial items toward *agree* regardless of the respondent's values ([03] critic addendum A; [04] addendum B). The fix was to use one wording in both frames.
- **Items are agentless standing rules or conditionals** ("If a few people come to own most of the wealth, it should be redistributed"), with no status-quo-relative words ("more than now", "too much", "currently"). Naming *the state* as the actor would make anarchists who want the outcome disagree, so outcome items don't name an agent ([01] addendum A; [spec] §2.3 rules 2, 5).
- **The Ideal frame stipulates fallible people and real problems** (downturns, conflict, crime), and a realistic rest of the world. Without that, every remedial item collapses to "never needed" in the ideal frame ([04] TL;DR 2).
- The output keeps the frames apart. There are per-axis Ideal and Now scores, a paired-item **axis gap** shown only when it clears a calibrated threshold (§2.4 below), a whole-test **Reality Gap**, optional **reason chips** ("can't trust those in charge", "doesn't apply here", ...), and an optional **System Confidence** block that asks how well the respondent's own system works by its own rules.

The Iran/Denmark pair above should now come out with similar **Ideal** scores and different **Now** scores. The difference shows up as a gap, often with a reason chip, instead of contaminating their values.

### Residual limitations

- **Readings of conditionals in the Now frame.** "If X happens, Y should be done" can be read hypothetically ("if it happened here") or factually ("it isn't happening here, so no"). We tell respondents to read both frames hypothetically and route "doesn't apply here" to a chip ([spec] §2.2). We cannot check that they comply.
- **The Ideal frame is value-laden.** "Legitimate by your own lights", "fallible rulers" and "realistic rest of the world" are our stipulations. Other choices would give other answers. They are disclosed on the method page ([04] §4.4).
- **The ideal is ideology-relative.** A theocrat's and an anarchist's ideal systems differ, so the same gap means different things for different people. The optional status-quo sliders and the gap typology ([spec] §6.5) partly address this. The typology relies on a direct self-placement (see §8).
- **The 12-axis model has no slot for remedies.** Rectification of historical injustice and emergency powers are the classic "only under non-ideal conditions" measures, and they have no axis; they scatter across Social norms, Ownership and Liberty ([04] §3). This is disclosed, not fixed.

---

## 2. Scoring math

### 2.1 Intensity levels collected, then thrown away (original)

**Original.** Each axis has items at nominal levels ±1…±4, 3 per level, 288 in total. Scoring keeps only the sign: `scores[ax] += mult*(rate<4?1:-1)` (`quiz.html:91`). Agreeing with a mild level-1 item ("Local governments give each region good representation of their views.", `:22`) counts exactly as much as agreeing with "There is no need for a national government." (`:4`).

**Why it matters.** The graded bank is an *ideal-point* design: moderates agree with mild items and reject extreme items on both sides. Summing agree/disagree is a *dominance* model, and it misreads such answers. Strongly rejecting "The Internet should be banned." (`:503`) adds as much toward the Technology pole as strongly agreeing that AI should rule if it rules better (`:467`). Rejecting one extreme is weak evidence for the other ([01] §5A.2; [03] §4; Roberts, Donoghue & Laughlin 2000 on GGUM).

**12 Axes².** Only polar items at two strengths (`level` 2 = clear, 3 = strong), with extremity matched across the two keys of each axis, and no "both camps agree" items or level-4 caricatures ([spec] §2.3 rule 6). With polar items, a dominance mean is defensible ([03] §4 recommendation 1).

**Residual.** Matching is an editorial judgment; no item locations have been estimated from data. The `level` field is stored but not used in scoring, so if real data shows ideal-point behavior a GGUM-type model could use it later. Until then, a moderate who rejects every polar item on both sides lands near the center with a wide band, which is roughly right but uninformative.

### 2.2 The short-quiz off-by-one (original)

**Original.** The 60-item short quiz picks levels via `t = [1,2,3,5,7]` and mirrors them with `8-t` instead of `7-t` (`quiz.html:39,45`). As a result, level +4 and level −1 items are **never** asked, and level −4 always is. A simulated symmetric moderate is pushed **+10 to +12.5 points** toward the positive pole on **every** axis (60 or 62.5 instead of 50; [01] §3). Under the label cut `>60` that moderate is called "Federal", "Statist", "Progressive", "Assimilationist" and so on.

**12 Axes².** Fixed, nested forms: Quick ⊂ Standard ⊂ Full, with 4/6/10 items per axis keyed 2:2/3:3/5:5 (verified in `content/items/*.json` by tier). No random selection anywhere.

**Residual.** None known for this bug class.

### 2.3 Two quiz lengths, two scales (original)

**Original.** Short: `50+5*score`, range 0–100 in 2.5-point steps. Long: `50+score`, range **2–98**, never reaching the ends despite the landing page saying scores are "compared to the maximum possible" ([01] §3). One "Strongly" answer in the short quiz is worth 10 points and can flip a label bucket ([01] §5A.6).

**Vercel.** One formula (mean of 0/.25/.5/.75/1 × 100), which is cleaner. On the 3-item form, though, reachable values are multiples of 8.33, so each label band maps to one or two answer patterns ([02] §7).

**12 Axes².** One formula for every length: `S = (100/3)·(m₊ + m₋)/2` on −100…+100 (`score.ts:36`). Length changes only the uncertainty band, `SE = (K/2)·√(SE₊² + SE₋²)` with a one-scale-point floor (`score.ts:37-39`). An intensity label (leans / strong / very strong) shows only when the band excludes 0; otherwise the axis reads "center-ish (uncertain)" ([spec] §4.2).

**Residual.** The band is a within-person standard error. It treats the axis's items as exchangeable samples, which they are not exactly, and it ignores item-specific bias. It is honest about noise, not about validity.

### 2.4 Per-axis gaps are difference scores (a risk 12 Axes² created)

This is not an upstream flaw, but it is the main accuracy risk of a two-frame design, so it belongs here. A gap `N − I` is a difference score, and its reliability collapses when N and I are highly correlated (Edwards 2001). With reliabilities of .70 and r(N, I) = .60, the gap's reliability is about .25 ([03] §7.4). An early design rule (|G| ≥ 0.15 with two agreeing items) showed an arrow on at least one axis for **86–98%** of simulated respondents with **no true gap** ([04] addendum D).

**12 Axes².** An axis gap is "notable" only if |G| ≥ τ_G(n) **and** at least 2 paired items agree in sign (`score.ts:60-72`). τ_G is set by simulation so that a no-gap respondent sees *any* notable axis at most 10% of the time. Current values (`calibration.json`, 0–100 axis units): **59** at 3 paired items, 43 at 4, 40 at 5, 34 at 6–7, 30 at 8–9, **28** at 10. In the end-to-end check the simulated false-alarm rate is **3.3%**.

**Residual.** The price is low power. In the same simulation, a true shift of 1 scale point (33 axis units) on one axis is detected **21%** of the time in Quick, **33%** in Standard and **54%** in Full. A 2-point shift is detected 66% / 79% / 88% of the time. Most real but modest gaps will not be flagged. The methodology page should say so, and "no notable gap" must not be read as "no gap".

---

## 3. Answer scale and "unsure"

**Original.** A 7-button scale with uneven values (+2, +1, +0.5, 0, −0.5, −1, −2), and **Neutral/Unsure is one button scored 0** (`quiz.html:18-24`). "I have no opinion or don't understand" and "I hold a considered middle position" are indistinguishable, and both pull the axis to 50. There is no skip, so skipped items cannot leave the denominator ([01] §5A.8–9).

**Vercel.** A 5-point Likert, 1.00…0.00, with no don't-know option; neutral is scored 0.5 ([02] §4). Its middle option is labeled to include "depends" ([05] §1.2), which merges a third state, context-dependence, into the midpoint. An axis with no answers is reported as 50 rather than as missing.

**Why it matters.** The neither/nor midpoint is often a face-saving "don't know" (Sturgis, Roberts & Smith 2014). Scoring it as a real center makes the uninformed look moderate, and the uninformed differ systematically by education and interest ([03] §3).

**12 Axes².**

- **Pass is missing data, never neutral.** You can pass both frames, or only Ideal or only Now ([spec] §3.3). Passed answers are excluded from the means (`score.ts:29`).
- **Neutral (0) is a real answer.** "It depends on where" has its own channel: the off-diagonal of the grid. The midpoint is therefore not labeled "depends" ([03] addendum C3).
- **Coverage gates.** An axis/frame is scored only with at least 3 answers including at least one per key (`score.ts:33`). Otherwise it reads "not enough answers" and is excluded from matching. Coverage is reported ("from 68/72 answers").
- **Response-style diagnostics.** The diagnostics panel reports the share of strongest options and of neutrals used (`src/state/derive.ts`). It is information only and never silently corrects scores.

**Residual.** An explicit pass option does not improve data quality on its own: people who pass usually hold weak but real views (Krosnick & Presser; [03] §3). If some groups pass more on sensitive items, their remaining answers are less representative. The 7-point scale is still treated as interval. That is mild for individual feedback but would matter for group comparisons (Liddell & Kruschke 2018).

---

## 4. Keying and acquiescence

**Original.** In the short quiz a coin flip per axis gives 3 items for one pole and 2 for the other (`quiz.html:42`). A respondent who answers "Agree" to everything gets 55 or 45, and "Strongly agree" to everything gets 60 or 40, **depending on the coin**. That is test–retest noise with no signal ([01] §3, §5A.4). Items within each level are also drawn at random: 486 possible forms per axis and about 10³² overall, and the result URL does not record which form was taken.

**Vercel.** The pool is balanced, 10:10 per axis, but the short and extended forms draw 3 or 5 items per axis. Each axis is therefore keyed 2:1 or 3:2, alternating by axis, and only the aggregate balances ([02] §5). Items are again sampled at random per session. Each question card also shows the axis name (`QuestionCard.tsx:68`), which invites "consistent" answering and inflates apparent internal consistency. Finally, five forced-choice "archetype" bundles each add one pseudo-answer to 1–3 axes. On the 3-item form that is **25% of an axis score** from one stereotyped choice, and it pushes the bundled axes together ([02] §6).

**Why it matters.** Acquiescence, the tendency to agree regardless of content, averages about 10% in agree/disagree formats (Krosnick & Presser 2010). Under unbalanced keying it moves scores toward whichever pole had more items.

**12 Axes².**

- Every form is exactly balanced per axis (2:2, 3:3, 5:5).
- The score averages the two **key-direction means** rather than pooling items: `(m₊ + m₋)/2`. All-agree therefore scores exactly 0 even when passes leave the keys unequal. This is tested under random pass masks ([spec] §4.1).
- Items use polar-opposite wording, not negations, because negated reversals add error (Weijters & Baumgartner 2012).
- Each item's direction was checked by a blind keying audit: a reviewer from a different model family labeled the pole without seeing the key. Items marked "unclear" were rewritten. Two replacement items are recorded as not yet blind-audited (`content/items/dem.json` rationales).
- Axis names are not shown on item cards, and there are no forced-choice bundles.
- Uniform yes-saying gives maximal within-axis keyed dispersion, so it trips the careless flag (§5.3) and is not labeled.

**Residual.** We kept the agree/disagree format, which Krosnick & Presser and Saris et al. (2010) rate below item-specific formats for validity. Balanced keying cancels acquiescence in the *mean*, but it parks a mild acquiescer near the center, and it cancels exactly only if the reversals are equally extreme. That is an editorial claim here, not a measured one ([03] §2.1).

---

## 5. Matching and ideology profiles

### 5.1 Original: 4 of 12 axes, one reversed

The "closest match" uses squared Euclidean distance on **4 axes only**: Economy, Security, Trade, Culture (`results.html:257-271`). Eight axes are ignored. The 8values-style `dipl` value (high = globalist) is compared with `k` (high = **protectionist**), so its polarity is reversed. Reproduced: a nationalist-protectionist authoritarian traditionalist matches **Technocracy**, the same profile as a free-trader matches **Fascism** with distance 0, and a hard-left protectionist matches **Trotskyism** ([01] §4). It also uses the wrong concept: `dipl` corresponds to Internationalism (`c`), not Trade. A match is always returned, with no distance or confidence, and missing parameters produce `NaN`. The 38 profiles are 8values-style 4-D vectors whose descriptions look like paraphrased Wikipedia text (UNVERIFIED).

### 5.2 Vercel: inflated, compressed percentages from one model family

- **The formula.** Compatibility is a hand-tuned blend of four heuristics: per-axis quadratic similarity, an augmented cosine, a magnitude match and a worst-axis term ([02] §8). It is presented as "% compatible".
- **Inflation [sim].** Random answerers get a top ideology at a mean of **87.5%** (3 items/axis), **89.0%** (5/axis) and **93.0%** (20/axis), and the UI calls ≥85 "high". Perfectly opposite extremes still score **18.8%**. An all-neutral user's *least* compatible ideology scores 41.9%. The median catalogue entry is about 65% ([02] §13).
- **Instability [sim].** On the 3-item form a retest gives the same top ideology only **23–51%** of the time, depending on assumed noise, yet that label leads the share card. The authors' own benchmark reports a mean gap of about 4.2 points between first and second place ([02] §8).
- **Provenance.** About 1,470 reference vectors (274 ideologies, 675 personalities, 320 countries/regimes, 203 parties) were produced by LLM sub-agents of one model family, Claude Code with Sonnet or better, role-playing each entity. Prompts were then re-run until vectors landed near "acceptable" neighbors. The README calls this "not placed by hand", which is technically true but misleading ([02] §10). Live persons drew materially different vectors across two sessions, e.g. 51 vs 76 on one axis.
- **Relative readouts.** "Tension" and "outlier" readouts measure rarity against the LLM catalogue, not against people. A religion filter hides ideologies tied to other faiths while keeping percentiles computed over the full catalogue ([02] §6, §9).

### 5.3 What 12 Axes² does instead

- **Same instrument for people and archetypes.** Coders answer **all 120 items in both frames**, as a sincere adherent would, with the respondent-facing frame text and a source packet that includes at least one primary source by adherents. The engine scores those sheets with the same code that scores users (`scripts/build-archetypes.ts`), so archetype vectors sit on exactly the user metric. Each archetype has an **ideal** and a **now** (transitional) vector, because some ideologies share an ideal and differ only in programme: Marxism–Leninism and anarcho-communism, for example ([04] §3).
- **Multiple model families, blind.** Coders are Anthropic Claude Opus, OpenAI GPT-6.1-sol and xAI Grok, blind to each other. The published vector is the per-item **median**. Per-axis spread (the range of the coders' scored vectors) and mean item disagreement are published. Axes with spread above 35 get weight 0.5. Leave-one-coder-out validation checks that each coder's own sheet ranks its archetype in the top 3 of a catalogue built from the other coders.
- **Distance, not percentage.** A weighted RMS distance over covered axes, normalized to 0–1 (`match.ts:25-36`). Matching runs only if at least 8 of 12 axes are covered, with at least 2 in each group (`match.ts:43-47`).
- **Labels calibrated against adherents.** "Very close", "close" and "loosely similar" are the 50th, 80th and 95th percentiles of distance for simulated sincere adherents answering from their own archetype's sheet with noise. "Close" means "as close as a typical adherent lands". Current Standard cuts (`calibration.json`): 0.087 / 0.106 / 0.127. Anything beyond is "no close match".
- **Recovery [sim].** The same simulated adherents get their own archetype as the top Ideal match **87.5%** (Quick), **93%** (Standard) and **96%** (Full) of the time, and in the top 3 at least **99%** of the time. This is optimistic: the adherents are simulated from the very sheets the archetypes were built from.
- **Stability.** 200 seeded bootstrap draws perturb each axis by its standard error and count how often the top match holds: ≥70% is "stable", 40–70% "fairly stable", otherwise "toss-up between A and B". The seed is a hash of the payload, so the owner and every viewer see the same label (`match.ts:87-110`).
- **Why-lines and the top 3.** Each match lists the 3 axes that bring you closest and the 1 that pushes you furthest.
- **Careless responding.** A within-frame keyed-dispersion index. In simulation it flags **89–90%** of uniform random clickers and at most **0.13%** of simulated honest respondents. When it fires the hero becomes "No reliable match". Random clickers receive a named headline only **0.2%** of the time (10% before the naming breakpoint below).
- **Catalogue rules.** No living people, parties or countries. 47 named archetypes in 9 families, each family with at least 3. Sensitive archetypes (historical Fascism, Stalinist Marxism–Leninism, theocratic absolutism) can lead the hero only if "very close" **and** "stable" **and** the user opts in.

### 5.4 Residual limitations

- **We use LLM coders too.** Three model families agreeing is not three experts agreeing. The models share much of their training data, and their errors may be correlated (for example, a shared Western, English-language picture of each ideology). Agreement between models is not accuracy (see §9).
- **The Now vectors use one reference context**, "a present-day developed liberal democracy". They fit worst for exactly the respondents who most need the Now column: those in low-confidence systems ([04] addendum F). For that reason Here-and-now is matched against archetypes' **ideal** vectors, and the joint match carries a caveat.
- **The axes are correlated**, Ownership and Coordination especially. RMS distance over 12 facets therefore over-weights clusters such as economics, and the archetype relevance weights only partly offset this.
- **"Close" is relative to our catalogue.** Someone whose tradition is missing (§9) will get "no close match" or a misleading nearest neighbor.
- **Weights follow a mechanical rule** (1.5 for defining axes with |ideal| ≥ 60; 0.5 for indifferent or disputed axes, i.e. |ideal| < 20 or spread > 35). The spec describes review of high-spread axes; the build script applies 0.5 automatically.

---

## 6. Privacy

**Original.** Results travel as query-string parameters (`results.html?a=…`), which reach the host's logs. Google Fonts loads on every page, sending the visitor's IP address to Google. The only share option sends users to the third-party screenshotmachine.com to paste their result URL (`results.html:127-128`). Raw query values are written with `innerHTML` without validation ([01] §5E).

**Vercel.** All scoring is server-side, so **answers are POSTed to a backend** (`POST /api/results`). GA4 tracks the paywall funnel. Yet the UI tells users their answers are not stored ([02] §2, §12). A paid report is sold through Mercado Pago and Paddle.

**Why it matters.** Political opinion is special-category data under GDPR Art. 9. A personality-style quiz is also a known collection vector: the ~270k-user quiz behind Cambridge Analytica reached data on up to 87M accounts ([03] §9).

**12 Axes².**

- A static single-page app. Everything is computed on the device; no backend, accounts, analytics, ads or paywall.
- The production build injects a CSP with `connect-src 'none'`, so the page cannot make network requests, and `script-src 'self'` (`vite.config.ts`). Fonts are self-hosted. Share images are drawn client-side on a canvas.
- Share links carry **scores, never answers**, in the URL `#fragment`, which browsers do not send to the server. Optional fields (country, System Confidence, status-quo positions) are off by default, and combining country with them shows a warning. Your biggest splits are shown on your own device only.
- Progress is saved in `localStorage`, with a "Don't save" option and "Clear my data".

**Residual.**

- The host still logs IP addresses and paths, as any static host does.
- The opt-in "link with preview" puts the hero labels in the **path**, which the host and the platform's link unfurler can read. This is disclosed.
- A shared link *is* a disclosure of political opinion to anyone who receives it, and to any site where it is posted.
- Fragments persist in browser history and synced tabs.
- A meta-tag CSP cannot set some directives (e.g. `frame-ancestors`), so header-level hardening depends on the host.
- An automated Playwright test (`just e2e`) completes a Quick run and fails on any request that leaves the page's origin. It covers one browser and one path, not every code path.

---

## 7. Presentation and virality incentives

**Original.** Results are coloured bars with no share image. Two bars per axis, `v%` and `(100−v)%`, read as "% Security vs % Freedom" although they are one signed sum ([01] §5A.10). Several labels are wrong or loaded. "Bicemeral" (sic) is placed between democracy and oligarchy. "Racially Colorblind" is the *most multiculturalist* label. High Security is called "Totalitarian" ([01] §4).

**Vercel.** The share card is built for virality ([02] §11; [05] §1.2): an ideology name, a famous face with a big percentage, "nearby countries", and a QR code. The named match is the most-quoted line in posts, and also the one that gets mocked (a streamer "closest to the German Empire"). The incentives point away from accuracy:

- The big percentage is inflated (§5.2).
- Matching to **living people, parties and real regimes** produces provocative pairings, and the promotional plan featured some.
- A localization bug compares a Portuguese string, so English cards show balanced axes as a dominant pole ([02] §7).
- Marketing copy claims precision and reliability, with no reliability data in the repo, while elsewhere it says the test is not scientific ([02] §12).

**Why it matters.** People rate generic descriptions as highly accurate (Barnum/Forer effect), so satisfaction with a result is not evidence of validity ([03] §8.3). A share card that labels a noisy respondent with an extremist ideology is both wrong and harmful.

**12 Axes².**

- **The hero is gated.** It is "Ideal: A · Here and now: B" only when B beats A on the Now vector by a calibrated margin **and** is at least fairly stable. Otherwise it is "Constant: A". An ideology is named at all only when it is at least "loosely similar" and not a toss-up; otherwise the hero says "No close match" (or "No clear match") and shows the nearest as a measurement. In simulation, no-gap respondents get a false split **1.1%** of the time (4.4% before that naming breakpoint; μ is set at the 95th percentile of no-gap margins). A careless flag replaces the hero with "No reliable match".
- **No percentages**, and no living people, parties or countries.
- The Reality Gap is always printed with two baselines: random clicking (about 38/100) and simulated no-gap noise (median **7**, or **14.1** if a respondent never copies the Ideal cell). Its bands (12 / 22 / 33) are set so that ≥90% of no-gap respondents fall in the lowest band. Gaps are never framed as hypocrisy.
- Archetype summaries are contrastive ("prioritizes X over Y"), not flattering.
- Sensitive archetypes need opt-in to appear on cards. There is a Minimal card option, and pole names are ones adherents accept (e.g. "Hierarchical" rather than "Autocratic").
- Labels are compared as enums, never as localized strings.

**Residual.** An identity label is still the hook. A single archetype name on a card invites over-reading, whatever caveats sit beside it. A pair label ("Ideal A · Here and now B") is a new kind of claim, and we don't know how people will read it.

---

## 8. Item content and axis construction (supporting issues)

These affect accuracy through *what* is asked rather than how it is scored.

- **Original item defects** ([01] §5B). Examples:
  - double-barreled: "Police need more power and protection." (`:178`);
  - slogans: "Taxation is theft." (`:204`, `:420`);
  - near-consensus: "Peace is preferable to war whenever possible." (`:153`);
  - empirical claims: "Traditional medicines are often more effective than modern medicines." (`:502`);
  - personal belief rather than policy: "My religion is true." (`:287`);
  - mis-keyed: "People must be allowed to follow a religion." is keyed Religious (`:279`);
  - US-specific: a 15 USD minimum wage (`:395`).

  About a quarter of the bank fails under any framing ([01] §6 tally: 26% unusable).
- **Construct conflation.** The original's Religion axis mixes personal faith with church–state policy. Immigration mixes volume with integration model. Democracy mixes direct vs representative with democracy vs autocracy ([01] §5D). Vercel re-poled Intervention so that it nearly duplicates Diplomacy, r = −0.87 across its own catalogue **[sim]**. Its Religion axis is double-barreled by its own description ([02] §3).
- **12 Axes².**
  - Original item text, written to rules: single proposition, no status-quo words, no named country institutions, grade-8 reading level.
  - A provenance overlap gate against both upstream banks. Vercel text is held only as salted shingle hashes.
  - `rel` is church–state only. `pro` is norm *content*, not rate of change. MIT's Internationalism pole is restored.
  - Two bundles are kept and disclosed: Ownership with distribution, and immigration volume with integration.

---

## 9. Criticisms of 12 Axes² itself

The issues above are where we think 12 Axes² improves on its predecessors. This section lists what remains weak, in rough order of importance.

1. **Not validated on real respondents.** There is no factor analysis, no reliability estimate from data, no test–retest study and no convergent-validity check against established instruments (WVS, ESS, ANES-style items). We do not know whether our 12 axes hold up as facets, or how much they collapse. The literature suggests 2–5 robust dimensions with country-dependent correlations ([03] §5). Calling the axes "correlated facets" is a hedge, not evidence.
2. **Thresholds come from a simulation model, not from people.**
   - Respondents are simulated with a latent position per axis (uniform ±2.5), item offsets (SD 0.6), response noise (SD 0.8), Ideal-copy rates of 30/50/70% and random passes of 0/10/20%.
   - Every rate above depends on those assumptions: τ_G, μ, the Reality Gap cuts, the careless thresholds, the label cuts, and the power and false-alarm figures. If real people copy the Ideal cell more or less often, or are noisier, the false-alarm and power figures shift.
   - The tests re-check the thresholds against the same model, which protects against regressions, not against a wrong model.
3. **Archetypes are LLM judgments.**
   - The three coders are Claude Opus, GPT-6.1-sol and Grok, from three model families. They are not political scientists, and not adherents.
   - We criticize the vercel catalogue for LLM role-play and then use the same basic method. The differences are real but partial: several families instead of one, blind coding, the median, published spread, cited primary sources by adherents, and no prompt re-runs to hit expected neighbors.
   - Inter-model agreement may reflect shared training data rather than truth.
   - No archetype has been reviewed by adherents or area experts.
4. **"Here and now" depends on country and perception.**
   - Now answers carry country effects *by design*, so two people's Now scores are not comparable unless they live under the same system.
   - They also carry the respondent's *perception* of their country, which can be wrong, partisan or media-driven. The optional System Confidence block is a self-report too. World Bank WGI figures are shown beside it as an outside reference, never to adjust scores.
   - Diaspora, federal and contested-sovereignty cases ("the country whose laws you mainly live under") are handled by an instruction, not a solution.
5. **Catalogue gaps.**
   - No Indigenous or decolonial archetype.
   - No Buddhist political thought; Hindu traditions appear only via Gandhian Sarvodaya.
   - No liberation theology or Bolivarian socialism. Peronism and generic left populism stand in for Latin American traditions.
   - No standalone pan-Africanism, agrarian or peasant populism, or feminist archetype.
   - No libertarian transhumanism.

   These gaps are recorded in `content/archetypes/catalogue.json` notes. People from these traditions will get worse matches, and may be told "no close match" for reasons that have nothing to do with them.
6. **Western framing of the axes.**
   - The 12-axis model descends from a US-centric quiz.
   - Some axes presuppose Western debates: church–state separation as the secular pole; transhumanism vs bioconservatism as a top-level axis; immigration from the receiving country's point of view.
   - Several non-Western cleavages have no axis: clan and kinship, caste, center vs periphery in post-colonial states, land tenure, remedies for historical injustice, emergency powers.
   - Pole names were chosen to be acceptable to adherents, but acceptable *to whom* was judged by us.
7. **Agree/disagree format and author framing.** Every item is an A/D statement written by us, and the wording carries our framing, however carefully we balance it. Two replacement items have not been through the blind keying audit, and extremity matching across keys has not been measured.
8. **Burden of the 7×7 grid.**
   - Two judgments per item roughly doubles decision load. Standard is 72 items, about 11 minutes, and longer quizzes lose respondents (Galesic & Bosnjak 2009).
   - Showing both frames together invites consistency effects (pulling N toward I) and contrast effects (pushing them apart to "use" the grid). We cannot measure which dominates.
   - The grid is harder on small screens and for screen-reader users. The two-row mode helps but changes the task.
   - The simulation brackets copy rates; it does not estimate them.
9. **Self-placement and self-report.** The status-quo sliders ask respondents to place their country directly, while Ideal and Now are item-derived. The gap typology mixes the two kinds of measure. Reason chips are self-explanations, which people construct after the fact and which are not causal evidence.
10. **Low power for real gaps** (§2.4). Within-person, a modest real gap usually goes unflagged, especially in Quick (21% detection at 1 scale point). The headline "Constant" therefore overstates constancy for some people.
11. **Core commitments are coders' judgements, and their error rate is circular.**
   - A commitment means the coded profiles of an ideology's mainstream all take one side of a statement. Three instances of one model family (Claude Opus, three lenses) proposed them; an entry needs 2 of 3 and the coded sheet at |v| ≥ 2 on that side. No adherent or expert has checked them.
   - The "under 0.1% wrongly ruled out" figure simulates adherents from the same coded sheets, so it measures consistency with our own coding (answer noise rarely trips a commitment), not whether real adherents hold the position. With noisier simulated answers (`commitments-audit --stress`: noise SD 1.2, axis SD 0.8) it rises to about 0.5%: it tracks the noise model, and no setting of it can detect a commitment real adherents reject.
   - Counterexamples are the real test. The must-agree `dem-03` ("Any group of citizens should be free to form a party…") was dropped for 11 mainstream ideologies because militant democracy (Germany's Basic Law Art. 21(2)) sincerely rejects "any group". Suspects not yet resolved: `dem-06` must-disagree for constitutional monarchism and centrism (reserve and emergency powers), `int-10` must-agree for civic nationalism (constitutional patriotism), `col-07` must-disagree for social democracy, `col-04` must-agree for democratic socialism, and `pro-01` in the here-and-now frame for progressive liberalism.
   - The site says "positions our coded profiles share", never "every adherent", and links to a report form for disputing one.
12. **Self-selected audience.** With no telemetry there are no population norms. Nothing on the results page compares you with "other people", and nothing should.

### Status as of 2026-10-31

- **Catalogue built from complete data.** All 47 archetypes are coded by all three coders (Claude Opus, GPT-6.1-sol, Grok) on all 120 items in both frames. Leave-one-coder-out: each coder's own sheet ranks its archetype in the top 3 of a catalogue built from the other two in **141 of 141** cases. Mean per-item disagreement between coders is 0.54 scale points. Four items reworded after review (`mil-01`, `pro-05`, `tec-02`, `tec-04`) were recoded by all three coders.
- **Calibration is final for catalogue v1** (`src/data/calibration.json`, 8,000 draws, seeded). It is still a simulation model, so §9.2 applies in full.
- The provenance-overlap gate (`just overlap`) and the Playwright network, parity and keyboard tests (`just e2e`) are in the repo and passing.
- Country context (World Bank WGI 2025) is regenerated by `just wgi`, which keys on the API's own country ids and checks known anchors. An earlier hand-fetched table had two mis-keyed rows (Syria, Netherlands); both are fixed.

---

## References

Upstream evidence and secondary literature are cited in full in `docs/research/01`–`09`. The key works relied on here:

- Rawls, *A Theory of Justice* / *The Law of Peoples*.
- Valentini (2012) on ideal vs non-ideal theory.
- Lipsey & Lancaster (1956).
- Hirschman (1970).
- Acemoglu & Robinson (2012).
- Svallfors (2013).
- King et al. (2004).
- Krosnick & Presser (2010).
- Saris et al. (2010).
- Weijters & Baumgartner (2012).
- Sturgis, Roberts & Smith (2014).
- Roberts, Donoghue & Laughlin (2000).
- Edwards (2001).
- Liddell & Kruschke (2018).
- Galesic & Bosnjak (2009).
- Forer (1949).

# 03 — Survey & psychometric methodology for 12 Axes²

Status: research input for the scoring/design spec. Date: 2026-10-31.
Scope: what survey and psychometric research says about a defensible online political-values quiz in which each item gets **two** answers: "Here and now" (N, the respondent's actual country and situation) and "In an ideal system" (I, a well-functioning legitimate system: "would this ever be done if the conditions arose?").

Conventions: `[UNVERIFIED]` = I could not confirm it against a primary source in this session (abstract-only or recalled). Upstream code citations are to the read-only clones under
`/tmp/claude-1000/-home-xertrov-src-12x2/6f22d232-cf93-470e-949f-6728e7611f5a/scratchpad/upstream/` (`pt-site/12axes/` = original MIT 12axes; `12axes/` = 12axes.vercel.app, all rights reserved, studied for ideas only).

---

## 0. TL;DR

1. **Drop agree/disagree statements where possible.** A/D items carry about a 10% acquiescence effect and lower reliability and validity than item-specific ("which of these two views…") formats (Krosnick & Presser 2010, pp. 276–277; Saris et al. 2010). If we keep A/D, balance the keying at the axis level, avoid negations, and model or diagnose acquiescence.
2. **Use a 7-point bipolar scale with every point labelled, plus a separate "Not sure / no view" that is scored as missing**, not as 0. The original 12axes merges "Neutral/Unsure" into 0 (`pt-site/12axes/quiz.html:21`), and that conflates two different states (Sturgis, Roberts & Smith 2014).
3. **Item extremity matters.** The original 12axes writes items at intensity levels ±1…±4 but scores only their sign (`quiz.html:91`). Under an ideal-point response process this misplaces moderates. Either write only clearly polar, "dominance" items or score with an ideal-point-aware rule (GGUM-like, or at minimum weight by the item's location).
4. **Twelve axes are not twelve independent dimensions.** The best evidence supports about 2–5 robust dimensions (economic, cultural, plus a few weaker ones), with country-dependent correlations (Feldman & Johnston 2014; Treier & Hillygus 2009; Malka et al. 2019; an informal PCA of Politiscales). Present the 12 as *facets* with honest error bars, not as orthogonal measurements.
5. **The N-vs-I split is a principled answer to cross-context incomparability.** It is a cousin of anchoring vignettes (King et al. 2004): the I column fixes the context by stipulation, so it is far more comparable across countries than the N column. Svallfors (2013) shows that support for taxes and spending depends on perceived government quality, which is exactly the Iran-vs-Denmark intuition.
6. **The headline "gap" (N − I) is a difference score**, and its reliability collapses when N and I are highly correlated (Edwards 2001). With five items per axis, a per-axis gap is roughly noise. Report the gap mainly as **one aggregate "Necessity gap" index across all items**, and per axis only with wide uncertainty and plain wording.
7. **Paired answers on one screen will produce consistency and contrast effects.** Accept joint evaluation, because contrast is the point (Hsee 1996), but neutralise its demand cue. Say explicitly that matching answers are normal, use a 2-D grid tap (Affect-Grid style) or two rows with no default, and keep the order of the two rows fixed but principled (Ideal, then Now).
8. **Reliability is the binding constraint.** At a typical mean inter-item r ≈ .3, alpha is 0.56 for 3 items, 0.68 for 5, 0.72 for 6 and 0.81 for 10. On a 0–100 axis, the standard error of measurement (SEM) at 5 items is about ±11 points. Archetype "compatibility %" must not imply more precision than this.
9. **Privacy: political opinion is GDPR Art. 9 special-category data.** Score entirely client-side, send no answers anywhere, keep share links holding only coarse scores, and say all of this on the page. Note that the vercel 12axes POSTs answers to a server (`12axes/README.md:178`).

---

## 1. Baseline: what the two upstream 12axes actually do

| Aspect | Original (politicaltests, MIT) | 12axes.vercel.app (ARR, study only) |
|---|---|---|
| Item bank | 12 axes × 8 intensity levels (+4…−4) × ~3 statements (`pt-site/12axes/questions.js:2-45`) | 240 statements, 20 per axis, "half phrased toward each pole" (`12axes/README.md:74`) |
| Items served | 5 per axis = 60. The drawn levels are {+3,+2,+1,−2,−4} or {−4,−3,−2,+1,+3}, chosen at random per axis (`quiz.html:38-50`, `t=[1,2,3,5,7]` vs `8-t`). Quirk: level +4 (index 0) and level −1 (index 4) are **never served**, and level +1 is served in every session, so the bank is used asymmetrically | 3 / 5 / 20 per axis (short / complete / extreme) (`README.md:68-72`) |
| Keying balance | **3:2, not balanced**; the majority pole is random per axis per session | Claimed balanced. A 3-item short form cannot be exactly balanced [UNVERIFIED how they break ties] |
| Response scale | 7 options: ±2, ±1, ±0.5, 0 = "Neutral/Unsure" (`quiz.html:18-24`) | 5-point A/D, Neutral = midpoint (`README.md:76-82`) |
| Scoring | `scores[ax] += mult*(rate<4?1:-1)`, so the item's **intensity level is discarded** and only its sign is used (`quiz.html:91`). Axis = 50 + 5·sum (`quiz.html:112-113`) | Mean of answers mapped to 0–100 (`README.md:62-63`) |
| Archetype match | Squared Euclidean distance on **only 4 of 12 axes** (equality, freedom, globalism, progress), against 8values-style vectors (`results.html:257-270`) | Hand-tuned blend: 0.42 per-axis similarity + 0.33 augmented cosine + 0.18 magnitude + 0.07 outlier (`backend/.../ProfileMatchScorer.java:55-63`; `MATCH_EXPLAINED.md:162-165`). Profile vectors are made by an LLM answering in character (`README.md:264`) |
| Data flow | Fully client-side; scores go in the URL query (`quiz.html:116-128`) | Answers POSTed to `/api/results` on a hosted backend (`README.md:177-178, 222`) |

Methodological consequences of the original design. Sections 2–4 give the detail.
- **The acquiescence bias has a random direction.** Someone who answers "Agree" to everything nets +1 toward whichever pole got 3 items. That is score 55 instead of 50, or 60 with "Strongly agree". The direction is random per axis per session, so retaking the test moves the result.
- **Parallel forms are not equivalent.** Each session draws different statements and a different keying pattern, with no equating, so test–retest variance includes form variance.
- **Moderate items are mis-scored.** See §4.
- **"Neutral/Unsure" = 0.** Uncertainty and genuine centrism are pooled, which pulls low-information respondents to the centre.
- **The matching uses only 4 axes.** The headline ideology ignores 8 of the 12 measured axes.

---

## 2. Response format, acquiescence, keying, response styles

### 2.1 Acquiescence and A/D items
- Krosnick & Presser estimate acquiescence at **about 10% on average** across several designs. People agree with both an assertion and its reversal (22% agree to both vs 10% disagree to both). They also agree with an assertion 14% more often than they pick the same view in a forced choice (Handbook of Survey Research, 2nd ed., ch. 9, p. 276). The tendency is person-consistent (cross-sectional reliability ≈ .65) but also situational: it rises with difficult items, low motivation and low education (pp. 276–277). [Source PDF](https://web.stanford.edu/dept/communication/faculty/krosnick/docs/2010/2010%20Handbook%20of%20Survey%20Research.pdf)
- Their recommendation is to **avoid A/D, true/false and yes/no formats altogether** in favour of formats that offer competing views. A/D answers "are less valid and less reliable" (p. 277). An MTMM experiment found A/D responses "of much lower quality" than item-specific questions (Saris, Revilla, Krosnick & Shaeffer 2010, *Survey Research Methods* 4(1):61–79, [link](https://ojs.ub.uni-konstanz.de/srm/article/view/2682)).
- They also note why balanced keying is weaker than it looks: reversals cancel acquiescence only if they are **equally extreme**. Writing reversals without "not" is hard, negations add error, and the method parks acquiescers at the midpoint, where they probably do not belong (p. 277).

### 2.2 Reverse-keyed item pitfalls
- Reversed items help control acquiescence and disrupt straight-lining. They also lower reliability and create spurious "wording factors" (Weijters & Baumgartner 2012, *JMR* 49(5):737–747, review of 1,330 scale items; [record](https://pure.psu.edu/en/publications/misresponse-to-reversed-and-negated-items-in-surveys-a-review/)). The bias comes from acquiescence, careless responding and confirmation bias (Weijters, Baumgartner & Schillewaert 2013, *Psych. Methods*).
- **Misresponse is driven more by item difficulty than by inattention** (Baumgartner, Weijters & Pieters 2018, *JMR* 55). Negated items ("X should **not** …") are the worst kind; polar-opposite wording is better.
- Simulations: if **≥10%** of respondents answer carelessly, an artifactual two-factor structure appears, one factor for regular items and one for reversed ([Hrčak 2021 study summary](https://hrcak.srce.hr/en/261661)). Reverse wording did not prevent response bias in the MFI-20 (van Sonderen et al. 2013, *PLoS ONE*, [PMC3729568](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3729568/)).
- Implication: **polar-opposite statements, not negations; balanced keying within each axis; equal extremity across the two poles.**

### 2.3 Extreme and midpoint response styles
- Five styles are documented: acquiescence, disacquiescence, extreme responding, midpoint responding and non-contingent responding. They differ systematically across 11 EU countries and bias scale scores, depending on the share of reversed items (Baumgartner & Steenkamp 2001, *JMR* 38(2):143–156, [record](https://pure.psu.edu/en/publications/response-styles-in-marketing-research-a-cross-national-investigat/)). Review: Van Vaerenbergh & Thomas 2013, *IJPOR* 25 ([PDF](https://purdue.edu/idata/documents/Van-Vaerenberg-Thomas-responsese-styles.pdf)).
- Relevance: extreme-responders get far-pole scores and midpoint-responders get "centrist" labels **for stylistic reasons**. Because the quiz goes viral across countries, style differences by country will masquerade as ideology differences.
- A cheap diagnostic that needs no model: compute per-respondent **ERS** (share of endpoint answers), **MRS** (share of midpoints) and **ARS** (mean agreement across all items regardless of keying, using balanced items). Use these to show a caveat ("you used the extremes a lot; your positions may read stronger than you hold them"). Do not silently "correct" scores.

---

## 3. Likert design: points, labels, midpoint, "don't know", interval treatment

- **Number of points.** Reliability rises from 2 to 5 to 7 points and plateaus after. Krosnick & Presser conclude "7-point scales are probably optimal in many instances" for visual administration (p. 274). Five points is acceptable; 7 gives room for "slightly".
- **Labelling.** Reliability is higher when **all points are verbally labelled** and the labels divide the continuum into roughly equal steps (p. 275). The original 12axes labels all 7 points, which is good. "Partially agree" is an odd label; "Slightly" is standard.
- **Midpoint.** O'Muircheartaigh, Krosnick & Helic (1999) found that adding midpoints improved reliability and validity. Without one, respondents scatter randomly to the nearest moderate points (Krosnick & Presser p. 274). So keep a midpoint.
- **Midpoint ≠ don't know.** The neither/nor midpoint is mostly used as a **"face-saving don't know"**. Re-allocating those answers to DK changes descriptive and multivariate inferences, and the tendency is strongest among the *more* interested (Sturgis, Roberts & Smith 2014, *SMR* 43(1):15–38, [PDF](https://eprints.soton.ac.uk/197457/1/SMRrevised4.pdf)).
- **But explicit DK options don't improve data quality.** People who pick DK usually hold weak but real attitudes. DK reflects ambivalence, ambiguity, satisficing or self-protection (Krosnick & Presser pp. 282–285; Gilljam & Granberg 1993). For sensitive items, DK gives cover for socially undesirable answers (p. 287).
- **Synthesis for us.** Offer a midpoint labelled "Torn / it depends" and a visually secondary "No view / skip". Score skip as **missing**, never as 0. Report coverage per axis ("based on 4 of 5 items"). Nudge gently: one line of copy saying "pick the closest answer even if unsure; skip only if you genuinely have no view." This follows Krosnick's advice to press for an answer while keeping an exit that does not contaminate the scale centre.
- **Treating Likert as interval.** Metric analysis of ordinal data can produce false positives, lost power and even **reversed group-mean orderings**, and averaging items does not fix it (Liddell & Kruschke 2018, *JESP* 79:328–348, [record](https://scholarworks.iu.edu/dspace/items/9bcd0f5e-7837-4f9c-ac07-a114e595e146)). For individual scoring the risk is milder, because we sum equal-step labelled options for display, not test hypotheses. It still argues for (a) roughly equal-interval labels, (b) not over-interpreting small differences, and (c) ordinal-aware models (ordered probit / GRM) for any offline calibration study.

---

## 4. Scoring models: mean score vs IRT (GRM) vs ideal-point (GGUM)

- **Dominance (cumulative) models.** Sum or mean scores and Samejima's graded response model assume that endorsement rises monotonically with the trait. For short scales (≤10 items), GRM theta and sum scores perform about the same in prediction ([simulation summary](https://www.bohrium.com/paper-details/using-irt-trait-estimates-versus-summated-scores-in-predicting-outcomes/813370093802094594-6589); [QLQ-C30 study](https://research.regionh.dk/en/publications/scoring-based-on-item-response-theory-did-not-alter-the-measureme/)). Practical upshot: **GRM buys little over a well-built mean score at 5–10 items per axis**, and it requires calibration data we will not have.
- **Ideal-point (unfolding) models.** A person endorses an item to the extent that the item's position is *close to* their own, so endorsement is single-peaked. The GGUM (Roberts, Donoghue & Laughlin 2000, *APM* 24:3–32; [R package](https://packages.oit.ncsu.edu/cran/web/packages/GGUM/refman/GGUM.html)) is the standard. Thurstone-style attitude items often fit ideal-point better (Roberts & Laughlin 1996). Drasgow, Chernyshenko & Stark (2010, *IOP* 3:465–476, "75 years after Likert: Thurstone was right") argue the same for personality. Moderate items are "virtually useless" under dominance scoring but informative under ideal-point. Critics (Reise; Oswald & Schell) reply that the scores often end up nearly the same, and the main gain is in using **moderate items** ([commentaries](https://digitalcommons.usf.edu/psy_facpub/1953)).
- **When extremity matters.** It matters exactly when the bank contains moderate or "middle" items, and the original 12axes deliberately does. Its level-+1 Federal items are served in every session (§1). Example (`questions.js:20`, Federal–Unitary level +1): "Local governments can understand their citizens better than the national government could."
  - A *moderate unitarist* can readily agree, because they accept local knowledge but still want a strong centre.
  - Dominance scoring treats agreement as evidence for "federal", so the moderate unitarist is pushed toward federalism.
  - Conversely, a disagreeing strong unitarist and a disagreeing anarchist (who rejects both levels of government) are scored identically.
  - With `rate<4?1:-1` (`quiz.html:91`) the intensity information is thrown away, so the scorer cannot correct for this.
- **Recommendation (pragmatic, defensible).**
  1. Write **polar items only** (clearly at about ±2…±3 on the latent axis), so a dominance mean score is valid. Avoid "middle" statements that both camps could endorse.
  2. Add a few deliberately **extreme** items per axis (±4) only if we score them as *intensity probes*. Agreement with an extreme item indicates a strong position; disagreement says little about direction. A lightweight route is to weight agreement by item location and disagreement by a smaller factor. A full GGUM needs calibration data.
  3. Store each item's intended location in the bank (as the original does with its levels) so a future calibrated model can use it.

---

## 5. Dimensionality: are there really 12 axes?

- **Two-dimensional at minimum.** Economic and social/cultural ideology have very different determinants, and a single left–right dimension hides that (Feldman & Johnston 2014, *Political Psychology* 35(3):337–358, [record](https://scholars.duke.edu/publication/745676)). Mass belief systems remain multidimensional even though elite discourse is one-dimensional, and ignoring this mispredicts votes (Treier & Hillygus 2009, *POQ* 73(4):679–703, Bayesian IRT, [record](https://scholars.duke.edu/publication/714352)).
- **The correlation between dimensions depends on the country.** Across 99 WVS nations, cultural and economic conservatism are mostly weakly correlated (|r| ≤ .20). The "protection" package (cultural right with economic left) is common, especially in less-developed and post-communist countries and among the less engaged (Malka, Lelkes & Soto 2019, *BJPolS* 49(3):1045–1069, [PDF](https://www.colby.edu/wp-content/uploads/2019/06/Malka_et_al_2019.pdf)). The Chapel Hill expert survey uses economic left–right plus GAL–TAN. In much of post-communist Europe their alignment **reverses** (Jolly et al. 2022, *Electoral Studies*, CHES trend file).
- **Constraint is low for most people.** Only a knowledgeable minority shows ideological constraint. About half the public declines to call itself liberal or conservative (Kalmoe 2020, *Political Psychology*, doi:10.1111/pops.12650; Converse 1964). Implication: many respondents will produce "incoherent" 12-axis profiles. That is real, not an error, and should not be labelled with a confident ideology name.
- **Are 12 axes empirically distinguishable?** No published psychometric validation of 12axes, 8values or the Political Compass test was found. An informal PCA of about 300 transcribed **Politiscales** results (8 bipolar axes) found PC1 (left–right) explains about 2/3 of variance, PC2 about 12%, and 5 components about 90% ([blog](https://percept-denigrate.github.io/Politiscales-is-highly-redundant)). The sample is non-random and left-skewed, so treat this as suggestive only [UNVERIFIED beyond the blog]. An LLM-focused factor analysis of the Political Compass test exists (arXiv 2506.22493) but does not validate it for humans.
- **Reasonable reading.** 12 axes are defensible as **content facets**, a useful way to ask about distinct policy domains. They are not defensible as 12 independent latent traits. Expect strong correlations among, for example, Progressive–Traditional, Multicultural–Assimilationist and Irreligious–Religious, and among Collectivize–Privatize and Planned–Markets. Two of the original axes are near-duplicates by name: Internationalism–Nationalism (c) and Globalism–Protectionism (k) (`CHEATSHEET`).
- **Forced-choice fragility (indirect evidence).** Political Compass placements of LLMs change with how strongly a choice is forced and are not robust to paraphrase (Röttger et al. 2024, ACL). That is about models, not humans, but it shows the instrument's positions are sensitive to item wording.

---

## 6. Cross-context incomparability: DIF and anchoring vignettes

- **The problem.** "How much say do you have in government?" or "Is wealth too concentrated?" is read against local standards. King, Murray, Salomon & Tandon (2004, *APSR* 98(1):191–207, [page](https://gking.harvard.edu/publication/enhancing-the-validity-and-cross-cultural-comparability-of-measurement-in-survey-research/)) show raw self-reports of political efficacy rank **China above Mexico**. More than 50% of Mexicans but fewer than 30% of Chinese said they had "no say". Anchoring vignettes reverse that ranking to the obvious one ([vignette FAQ](https://gking.harvard.edu/sites/scholar.harvard.edu/files/gking/files/vfaq.pdf)).
- **The method.**
  - Respondents rate short hypothetical vignettes, which describe people or situations at fixed levels, on the same scale as the self-question.
  - Vignette ratings reveal each respondent's thresholds, and the self-rating is recoded relative to them. The nonparametric version is simply "where does your self-rating fall among your vignette ratings?"
  - Two assumptions are needed:
    - **Response consistency**: the scale is used the same way for vignettes and for oneself.
    - **Vignette equivalence**: everyone perceives each vignette's level the same way.
  - Both are often violated cross-nationally, VE especially (health applications in Asia and Africa). See King & Wand 2007, *Political Analysis* on selecting vignettes and Hopkins & King 2010, *POQ* on design ([PDF](https://www.cambridge.org/core/services/aop-cambridge-core/content/view/AA12FD1F8DD8BF9A58BA10EC89C5F3B1/S1047198700006367a.pdf/comparing-incomparable-survey-responses-evaluating-and-selecting-anchoring-vignettes.pdf)).
- **Substantive support for the N/I split.** Perceived government quality (impartiality, efficiency) independently raises support for taxes and social spending. Egalitarianism has a **stronger** effect on those attitudes where government quality is high (Svallfors 2013, *EPSR* 5:363–380, ESS 2008, 29 countries, [record](https://www.iffs.se/en/publications/journal-articles/government-quality-egalitarianism-and-attitudes-to-taxes-and-social-spending-a-european-comparison/)). Follow-up work finds the effect is weaker for targeted redistribution (Başlevent & Kirmanoğlu 2015). This is the Iran/Denmark intuition in data: identical values, different policy answers, depending on institutional trust.
- **How 12 Axes² maps onto this.**
  - **The I column is a stipulated context.** The respondent is told the system is well functioning and legitimate, so I answers are comparable across countries. They play the role of a vignette whose level everyone is given. VE is still imperfect: "well-functioning" will be imagined differently. This is why the I framing must be concrete. Spell out impartial courts, low corruption, working elections and the absence of a monarch-like central figure.
  - **The N column is a self-report under local conditions**, so it carries country DIF *by design*. That is the signal we want ("what is necessary here"). It means **N scores are not comparable across countries** and should never be ranked against another person's N without saying so.
  - **Optional calibration module (stretch goal).** Add 2–3 *context vignettes* that ask the respondent to rate their own country's conditions on fixed descriptors, for example:
    - Corruption: "Officials routinely take bribes and courts protect the powerful" … "Corruption is rare and prosecuted".
    - Wealth capture: "A few families control the state" … "Wealth exists but does not buy policy".
    - Rule of law and civil liberties.
    These are *context items*, not attitudes. They let the results page say: "your here-and-now answers diverge from your ideal mostly on axes tied to corruption, and you rated your country's corruption as high". That turns the gap into an explanation without claiming a causal model. Avoid any automatic country-level correction (VE problems; and we collect no country data server-side).
  - **No country dropdown is needed** for scoring. If one is offered for display only (for example "Here = Australia"), keep it local.

---

## 7. Within-subject paired judgments (N and I for the same item)

### 7.1 Order and consistency effects
- Schuman & Presser's taxonomy of order effects is part–part, part–whole, **consistency** and **contrast**. A consistency effect pulls the second answer toward the first. Contrast pushes it away, typically when the respondent sees the pair as deliberately distinct (Schwarz, Strack & Mai 1991, *POQ*, part–whole conversational logic, N=456; [Pew order-effects note](https://legacy.pewresearch.org/politics/methodology%20/questionnaire-design/question-order)).
- When two questions are perceived as **belonging together**, respondents apply conversational norms. Asking both "now" and "ideal" for the same item signals that **the researcher expects a difference**, which risks inflating the gap (a demand effect, contrast). Asking them far apart lets the first answer prime the second, which deflates the gap (assimilation).

### 7.2 Joint vs separate evaluation
- Preferences reverse between joint and separate evaluation. Attributes that are hard to evaluate in isolation get more weight when options are compared side by side (Hsee 1996 *OBHDP* 67(3); Hsee, Loewenstein, Blount & Bazerman 1999 *Psych. Bulletin*, [PDF](https://www.cmu.edu/dietrich/sds/docs/loewenstein/PrefRevJoint.pdf)).
- For us the "hard-to-evaluate attribute" is **context dependence**. Joint presentation is what makes respondents think about context at all. So joint evaluation is **appropriate to the construct**: we want the considered contrast. The bias to manage is the demand cue, not the jointness.

### 7.3 Grids, straight-lining and load
- Grids increase straight-lining and breakoff and inflate inter-item correlations, so alpha can be "manufactured" by non-differentiation (Tourangeau, Couper & Conrad 2004; Couper et al. 2013 *SSCR* 31(3), [PMC4172361](https://pmc.ncbi.nlm.nih.gov/articles/PMC4172361); Liu & Cernat 2018 *SSCR* 36(6)). Our "grid" is a 2-cell pair per item, not a multi-row matrix, so the classic grid problems are small. The analogue is **diagonal-lining**: always N = I.
- A **single-click 2-D grid** has precedent: the Affect Grid is a 9×9 single-item scale (pleasure × arousal) with adequate reliability and convergent validity (Russell, Weiss & Mendelsohn 1989, *JPSP* 57(3):493–502). A later study rated it "moderately valid" with low specificity (Killgore 1998). A 7×7 tap grid (x = Ideal, y = Now, diagonal highlighted = "same in both") captures both answers in one gesture. It makes "same" the visually obvious default *path* without pre-selecting it. Costs: harder for screen readers, small tap targets on phones (7 × 44 px = 308 px fits a 360 px viewport with 16 px gutters), and a learning curve. Offer a two-row fallback (two 7-button rows) as the accessible mode.
- **Length.** A longer stated length means fewer starts and completions (Galesic & Bosnjak 2009, *POQ* 73(2):349–360: 75% started a 10-min survey vs 65% a 20-min one). Later items get faster, flatter answers. Two answers per item roughly doubles decision load, though the second answer is cheaper. Budget about 6–8 s per pair, so 60 pairs ≈ 7–8 min.

### 7.4 Difference-score reliability (critical for the "gap" headline)
- For a gap D = N − I with equal variances,
  `rel(D) = (rel_N + rel_I − 2·r_NI) / (2 − 2·r_NI)` (classic formula; Edwards 2001, *ORM* 4(3), "Ten difference score myths", [PDF](https://tarheels.live/jeffreyedwardswebsite/wp-content/uploads/sites/5503/2024/03/Edwards2001b.pdf)).
- Worked examples at axis level:

  | rel_N = rel_I | r_NI (N–I correlation) | rel(gap) |
  |---|---|---|
  | .70 | .30 | .57 |
  | .70 | .50 | .40 |
  | .70 | .60 | .25 |
  | .80 | .60 | .50 |

- Expect r_NI to be high (.5–.8), because most people answer N ≈ I on most items. **Per-axis gaps at 5 items are therefore close to unreliable.**
- What *is* reliable:
  - An **aggregate gap index** across all ~60 pairs. It has many items, and the per-item gaps are summed.
  - **Item-level qualitative flags**: "on these 3 items you'd act differently here than in principle". Show them as *your answers*, not as a measured trait.
- Edwards's further point: difference scores hide *which* component moved. Always show N and I side by side, not just the delta.

### 7.5 Hypothetical framing
- Stated preferences in hypothetical scenarios suffer "hypothetical bias". They are least reliable when the scenario is outlandish or costly and more reliable when it is concrete and low-cost ([FiveThirtyEight on hypothetical items](https://fivethirtyeight.com/features/would-you-waterboard-a-suspected-terrorist-easy-answers-to-difficult-questions)). Graham & Coppock 2021 (*POQ*) show counterfactual phrasing changes estimates. The I column is inherently hypothetical, so make the ideal system **concrete and stable**: the same short definition, always visible on the I row via a tooltip or chip.

---

## 8. Matching to ideology archetypes

### 8.1 Reliability budget (Spearman–Brown / standardized alpha)
alpha = k·r̄ / (1 + (k−1)·r̄). The typical "good" range for mean inter-item r is .15–.50 (Clark & Watson 1995, *Psych. Assessment* 7(3):309–319 [UNVERIFIED exact range wording]).

| items per axis k | r̄ = .20 | r̄ = .30 | r̄ = .40 | SEM at r̄ = .30 (axis SD = 20 on 0–100) |
|---|---|---|---|---|
| 3 | .43 | .56 | .67 | ±13.2 |
| 4 | .50 | .63 | .73 | ±12.1 |
| 5 | .56 | .68 | .77 | ±11.3 |
| 6 | .60 | .72 | .80 | ±10.6 |
| 10 | .71 | .81 | .87 | ±8.7 |

SEM = SD·√(1−alpha). The SD of 20 is an assumption [UNVERIFIED for this population].
- Read-out: with 5 items per axis, a 95% band is about ±22 points. Two axis scores, or two people, differing by under about 30 points on one axis are **not reliably different**.
- "Balanced / leaning / strong" labels (as the vercel version uses, `README.md:63`) need bands at least one SEM wide.
- A 3-item short form is too unreliable for per-axis claims.

### 8.2 Distance metrics
- **Euclidean / squared Euclidean (original).** Simple and transparent. It penalises magnitude differences, and a centrist matches "centrist" archetypes. The original's use of only 4 axes (`results.html:259-265`) is the bigger flaw.
- **Cosine.** Measures direction only. It is unstable near the centre, because a near-zero vector has an arbitrary direction, and it ignores intensity: a mild and an extreme libertarian match equally. The vercel version patches this with an "augmented cosine" and extra terms (`ProfileMatchScorer.java:133-152`). Those blend weights (0.42/0.33/0.18/0.07) are hand-tuned with no external criterion.
- **Weighted / Mahalanobis.**
  - Weighting each axis by 1/SEM² (reliability) and by archetype-specific relevance is defensible. The axes an archetype is *defined by* should count more. For example, anarchism is defined by the state axis but agnostic on religion.
  - Store a per-archetype **care-mask or weight vector** and **uncertainty ranges**, not only point vectors.
  - Mahalanobis distance accounts for correlated axes (§5) but needs a population covariance we don't have. Skip it.
- **Recommended**: weighted Euclidean on centred axis scores. Weights = archetype relevance × axis reliability, with archetypes defined as ranges (min/max or a centre with tolerance). Missing axes (all items skipped) are dropped from the distance and renormalised.

### 8.3 How compatibility percentages mislead
- A "% compatible" built as 100 − distance looks like a probability and is not one. It is not comparable across catalogs. The vercel README concedes this and adds within-catalog percentiles (`README.md:170`).
- The **top-1 match is unstable** when the top few distances lie within measurement error. Simulate it: perturb the user's axis scores by ±SEM, re-match, and report how often the top match holds. Show the **top 3 with a "too close to call" flag** when they overlap.
- Archetype vectors are themselves guesses. Expert-coded, LLM-coded and hand-placed vectors all carry error that should be shown. Never present them as measured.
- **Barnum/Forer effect.** People rate generic descriptions as highly accurate (Forer 1949: mean 4.26/5; [Britannica](https://www.britannica.com/science/Barnum-Effect)). Satisfaction with the archetype text is **not** evidence of validity. Archetype blurbs should be specific and falsifiable ("you'd favour X over Y"), not flattering generalities.

### 8.4 Presenting uncertainty
- Show each axis as a band (score ± 1 SEM, tinted), plus an item-coverage count.
- Mark the archetype match as one of three states: "strong", "plausible" or "ambiguous", driven by the bootstrap stability above.
- Give the gap index a plain-language confidence ("based on 58 paired answers").

---

## 9. Ethics and privacy (no telemetry, exploratory framing)

- **Legal category.** Political opinions are a GDPR **Art. 9 special category**. Processing is prohibited unless an exception applies, such as explicit consent, and it needs an Art. 6 basis on top ([Art. 9 text](https://gdpr-text.com/en/read/article-9/)). The cleanest posture is **to process nothing server-side**: static hosting, scoring in the browser, no analytics, no third-party fonts or CDNs at runtime (self-host assets), and no error-reporting SDK. *Note:* even a static host logs IP addresses and request paths. **Never put answers in the URL path or query sent to the server.** Use the `#fragment`, which browsers do not send in HTTP requests.
- **Share links carry opinions.** A shared URL with axis scores *is* a disclosure of political opinion by the user. Put only rounded axis scores in the fragment, not item answers, and warn once ("anyone with this link sees your results"). Offer an image share card as the alternative.
- **Why this matters.** Cambridge Analytica obtained data on up to 87M Facebook users via a ~270k-user personality quiz (thisisyourdigitallife) ([TechRadar](https://techradar.com/uk/news/cambridge-analytica-may-have-data-on-87-million-users-says-facebook)). "No backend, no telemetry" is a credible, marketable trust feature. Say so prominently, and make the claim verifiable: open source, with a CSP that blocks outbound `connect-src`.
- **Local storage.** If progress is saved in localStorage, say so and offer "clear my data". No cross-site identifiers.
- **Framing.**
  - Present results as **exploratory self-reflection, not diagnosis or classification**. The vercel version's note (`README.md:86`) is a reasonable template.
  - Avoid labelling anyone with stigmatised ideologies on thin evidence. Require a high-confidence match before showing extremist archetypes, and show "nearest" with the distance.
  - State known limitations on the page: no population norms, unvalidated axes, author framing in the item wording.
- **Avoid persuasion.** Do not show "most people answered X" prompts during the quiz (social influence). There is no data for it anyway.

---

## 10. Design implications for 12 Axes² (numbered, actionable)

1. **Item format.** Prefer **two-pole item-specific statements** ("Which is closer to your view: A … B?" on a 7-point slider between two concrete policies) over A/D statements. If A/D is kept for virality or familiarity, every axis gets **equal numbers of items keyed to each pole, at matched extremity**. Write **no negations** ("should not"). Use polar-opposite wording.
2. **Scale.** Seven points, all verbally labelled: Strongly / Moderately / Slightly / Torn / Slightly / Moderately / Strongly. Add a separate, visually secondary **"No view (skip)"**, scored as missing. Never code skip as 0.
3. **Paired response UI.**
   - Default: two stacked rows per item, **Ideal system first, then Here & now**. This puts the general principle before its specific application (part–whole logic) and matches the construct: the deviation from principle that local conditions require.
   - Neither row has a pre-selected value.
   - A one-tap **"Same answer for both"** affordance appears after the Ideal row is answered. It removes friction without defaulting.
   - Optional "grid mode": a 7×7 Affect-Grid-style tap matrix with the diagonal highlighted.
   - Keep the row order fixed. Randomising it per item confuses users, and we have no telemetry to analyse counterbalancing anyway. Counterbalance only in an opt-in pilot.
4. **Kill the demand cue.** Persistent microcopy: "Most people answer the same for both on most questions. Only split them when your country's conditions genuinely change your answer." Define the ideal system concretely and keep it visible: "Impartial courts, low corruption, free and fair elections, no all-powerful ruler; assume it already works. Would you ever do this if the situation arose?"
5. **Item counts.** At least **5 pairs per axis** (60 pairs ≈ 8 min) for the standard test. Offer a 10-per-axis "deep" mode (120 pairs). No 3-item quick mode with per-axis claims; a quick mode should only report 2–3 broad dimensions.
6. **Item extremity.** Store an intended location (±1…±4) per item. Write the standard test from polar items (±2/±3) and score with a mean, which is valid under dominance. Avoid "both camps agree" middle items. If extreme items (±4) are used, score them asymmetrically as intensity probes (§4).
7. **Scoring.**
   - Per axis, compute **I-score** and **N-score** separately: the mean of keyed answers mapped to −100…+100, with missing items excluded.
   - The **gap per item** is `N − I`, keyed to the axis direction.
   - Report an **aggregate Necessity gap index** (mean |N−I| across all answered pairs) and a **signed per-axis gap**, the per-axis one flagged as low reliability.
   - Primary identity = the **I profile** ("what you believe in principle"). Secondary = the **N profile** ("what you think your situation calls for").
8. **Response-style diagnostics (display only).** Compute ERS, MRS, ARS and the "diagonal rate" (share of pairs with N = I). Show gentle caveats when they are extreme, for example ">90% identical pairs: you treat your country as near-ideal, or you didn't use the second column". No hidden corrections.
9. **Context calibration (optional module).** Add 3 vignette-style **country-condition items** (corruption, elite capture, rule of law) with fixed anchors. Use them only to *explain* gaps on the results page ("your largest gaps are on axes linked to corruption, which you rated high"), never to rescale scores.
10. **Uncertainty everywhere.** Show axis bands of ±1 SEM, estimated from the realised item count with the r̄ = .3 assumption and documented in the methodology page. Use labels like "leaning/strong" only when the band excludes the centre.
11. **Matching.**
    - Use weighted Euclidean over **all 12 axes**, on I-scores by default with an optional N-score match.
    - Archetypes carry per-axis **centre + tolerance + relevance weight**.
    - Bootstrap the top match under ±SEM noise (about 200 draws, client-side, deterministic seed) and show top-3 with a stability label.
    - Do not show a single "% compatible" without that label. Prefer "closest", "close" and "loosely similar".
12. **Dimensionality honesty.** Present the 12 axes as facets grouped under 2–3 super-dimensions (economic; cultural/social; governance/state), and say on the methods page that facets are correlated. Merge or clearly distinguish near-duplicate axes, for example Internationalism–Nationalism vs Globalism–Protectionism.
13. **Archetype text.** Write specific, contrastive descriptions (what this view prioritises *over* what) to blunt the Barnum effect. Include the archetype's typical N/I pattern where meaningful, for example "revolutionary now, liberal-democratic in principle".
14. **Privacy architecture.**
    - Static SPA, all scoring client-side.
    - No analytics, no third-party runtime requests (self-hosted fonts), CSP `connect-src 'none'` or `'self'`.
    - Results in the URL **fragment** only, as rounded axis scores (I and N) plus a version tag, never raw answers.
    - Optional localStorage resume with a visible "clear" control.
    - State "nothing you answer leaves your device" and make it verifiable.
15. **Framing and disclaimers.** "Exploratory, not a validated instrument", "results depend on question wording", "N scores are not comparable across countries". Put these on a short methodology page linked from results. Include a criticisms section on the original 12axes (§1 table: 3:2 keying, sign-only scoring, Neutral = Unsure, 4-axis matching).
16. **Versioning and reproducibility.** Version the item bank and scoring (`v1`) and encode the version in share links, so old links still decode. Publish the scoring spec and archetype vectors with the source.
17. **Future validation path (no telemetry required).** Offer an **opt-in, manual export** ("download my anonymised answers as JSON") for anyone who wants to contribute to an offline pilot. Use pilot data to estimate r̄, alpha, N–I correlations, order effects (a counterbalanced pilot) and factor structure, then recalibrate the SEMs and possibly fit a GRM or GGUM.

---

## Sources (primary where available)

- Krosnick & Presser (2010), "Question and Questionnaire Design", *Handbook of Survey Research* 2nd ed., ch. 9, pp. 263–313. https://web.stanford.edu/dept/communication/faculty/krosnick/docs/2010/2010%20Handbook%20of%20Survey%20Research.pdf (pages cited above verified from the PDF text)
- Saris, Revilla, Krosnick & Shaeffer (2010), *SRM* 4(1):61–79. https://ojs.ub.uni-konstanz.de/srm/article/view/2682
- Weijters & Baumgartner (2012), *JMR* 49(5):737–747. https://pure.psu.edu/en/publications/misresponse-to-reversed-and-negated-items-in-surveys-a-review/
- Baumgartner, Weijters & Pieters (2018), *JMR* 55. https://research.tilburguniversity.edu/en/publications/misresponse-to-survey-questions-a-conceptual-framework-and-empiri/
- van Sonderen, Sanderman & Coyne (2013), *PLoS ONE*. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3729568/
- Baumgartner & Steenkamp (2001), *JMR* 38(2):143–156. https://pure.psu.edu/en/publications/response-styles-in-marketing-research-a-cross-national-investigat/
- Van Vaerenbergh & Thomas (2013), *IJPOR* 25. https://purdue.edu/idata/documents/Van-Vaerenberg-Thomas-responsese-styles.pdf
- Sturgis, Roberts & Smith (2014), *SMR* 43(1):15–38. https://eprints.soton.ac.uk/197457/1/SMRrevised4.pdf
- Liddell & Kruschke (2018), *JESP* 79:328–348. https://scholarworks.iu.edu/dspace/items/9bcd0f5e-7837-4f9c-ac07-a114e595e146
- Roberts, Donoghue & Laughlin (2000), *APM* 24:3–32; GGUM R package. https://packages.oit.ncsu.edu/cran/web/packages/GGUM/refman/GGUM.html
- Drasgow, Chernyshenko & Stark (2010), *IOP* 3:465–476. https://digitalcommons.usf.edu/psy_facpub/1953
- Feldman & Johnston (2014), *Political Psychology* 35(3):337–358. https://scholars.duke.edu/publication/745676
- Treier & Hillygus (2009), *POQ* 73(4):679–703. https://scholars.duke.edu/publication/714352
- Malka, Lelkes & Soto (2019), *BJPolS* 49(3):1045–1069. https://www.colby.edu/wp-content/uploads/2019/06/Malka_et_al_2019.pdf
- Jolly et al. (2022), CHES trend file, *Electoral Studies*. https://lup.lub.lu.se/search/files/135692296/Jolly_et_al_ES_2022_Accepted.pdf
- Kalmoe (2020), *Political Psychology*. https://www.gwern.net/doc/sociology/2020-kalmoe.pdf
- Politiscales PCA (informal blog). https://percept-denigrate.github.io/Politiscales-is-highly-redundant
- Röttger et al. (2024), ACL. https://ar5iv.arxiv.org/html/2402.16786
- King, Murray, Salomon & Tandon (2004), *APSR* 98(1):191–207. https://gking.harvard.edu/publication/enhancing-the-validity-and-cross-cultural-comparability-of-measurement-in-survey-research/ ; FAQ https://gking.harvard.edu/sites/scholar.harvard.edu/files/gking/files/vfaq.pdf
- King & Wand (2007), *Political Analysis*. https://www.cambridge.org/core/services/aop-cambridge-core/content/view/AA12FD1F8DD8BF9A58BA10EC89C5F3B1/S1047198700006367a.pdf/comparing-incomparable-survey-responses-evaluating-and-selecting-anchoring-vignettes.pdf
- Davidov et al. (2014), *Annual Review of Sociology* 40:55–75 (measurement equivalence review). https://kups.ub.uni-koeln.de/29970
- Svallfors (2013), *EPSR* 5:363–380. https://www.iffs.se/en/publications/journal-articles/government-quality-egalitarianism-and-attitudes-to-taxes-and-social-spending-a-european-comparison/
- Norton & Ariely (2011), *Perspectives on Psych. Science* (estimated vs ideal wealth distribution: a precedent for paired "is vs ideal" elicitation; format effects noted by Eriksson & Simpson 2012). https://news.harvard.edu/wp-content/uploads/2016/02/norton_ariely.pdf
- Schwarz, Strack & Mai (1991), *POQ* (part–whole). https://api.isr.umich.edu/?p=190648 ; Pew on order effects https://legacy.pewresearch.org/politics/methodology%20/questionnaire-design/question-order
- Hsee (1996); Hsee et al. (1999), *Psych. Bulletin*. https://www.cmu.edu/dietrich/sds/docs/loewenstein/PrefRevJoint.pdf
- Couper, Tourangeau, Conrad & Zhang (2013), *SSCR* 31(3). https://pmc.ncbi.nlm.nih.gov/articles/PMC4172361 ; Liu & Cernat (2018) https://journals.sagepub.com/doi/10.1177/0894439316674459
- Russell, Weiss & Mendelsohn (1989), *JPSP* 57(3):493–502 (Affect Grid). https://arc.psych.wisc.edu/self-report/affect-grid-agrid/ ; Killgore 1998 https://experts.arizona.edu/en/publications/the-affect-grid-a-moderately-valid-nonspecific-measure-of-pleasur/
- Galesic & Bosnjak (2009), *POQ* 73(2):349–360. https://academic.oup.com/poq/article-lookup/doi/10.1093/poq/nfp031
- Edwards (2001), *ORM* 4(3). https://tarheels.live/jeffreyedwardswebsite/wp-content/uploads/sites/5503/2024/03/Edwards2001b.pdf
- Clark & Watson (1995), *Psych. Assessment* 7(3):309–319. https://scispace.com/pdf/constructing-validity-basic-issues-in-objective-scale-336bh0ucpv.pdf
- GDPR Art. 9. https://gdpr-text.com/en/read/article-9/
- Cambridge Analytica scale. https://techradar.com/uk/news/cambridge-analytica-may-have-data-on-87-million-users-says-facebook
- Barnum/Forer effect. https://www.britannica.com/science/Barnum-Effect
- FiveThirtyEight on hypothetical questions. https://fivethirtyeight.com/features/would-you-waterboard-a-suspected-terrorist-easy-answers-to-difficult-questions

---

## Critic addendum (completeness critic, 2026-10-31)

Arithmetic re-checked: the §8.1 alpha/SEM table and the §7.4 difference-score table are correct to the stated precision. Below are the problems found when this doc is read alongside 01, 02, 04 and 05.

### A. The biggest unflagged issue: the two frames ask different *kinds* of question
§10.4's ideal prompt ("Would you ever do this if the situation arose?") and doc 04 §2.1's prompt ("would a system like that **ever** do this … ?") are **existential/permissive**. The Now prompt ("should this be done … there, now", doc 04 §2.1) is **deontic and present-tense**.
- "Ever, if the conditions arose" is true if *any* plausible condition would license X.
- "Should, now" requires the condition to hold now, and X to be the best response to it.
- Effect: on every remedial or emergency item, the I answer is pushed toward *agree* and the gap N − I toward *negative*. This is a wording artefact that occurs regardless of the respondent's values or country. It would contaminate the headline construct.
- **Fix:** both frames must evaluate the *same proposition* and differ **only in which system acts**. The item stem carries the condition ("If a small group comes to hold most of the wealth, the state should redistribute it"):
  - I = "in the ideal system, if this happened";
  - N = "in your country as it is today, if this happened (or since it has)".
  
  This isolates exactly Max's variable: "are those problems soluble within the current legal framework?"
- Standing-rule items with no condition ("Abortion should be legal") need the same treatment: "Should the ideal system have this rule?" / "Should your country have this rule now?"
- Do not use "ever" in only one column.

### B. Conditional items in the Now column are ambiguous (open decision)
For conditional items, a Now answer can mean two different things:
- **Hypothetical:** "if this happened here, should our actual institutions do Y?"
- **Actual:** "this isn't happening here, so no."

Max's Denmark example uses both ("the wealthy in Denmark aren't nearly as bad" is the *actual* reading; "soluble within the legal framework" is the *hypothetical* reading). Doc 04 §2.3 shows the ambiguity live: "Δ = −1, or Δ = 0 if they judge that concentration has not happened".

Rec: use the **hypothetical-in-both** reading for scoring, which keeps the gap interpretable as institutional trust and capacity. Capture the empirical "does this apply here?" separately, either as a reason chip ("doesn't happen here", which is missing from doc 04 §2.2h) or in the context block (§6 / doc 04 SC block). Flag this to Max as a decision.

### C. Contradictions with other docs (need one answer each)
| # | Topic | This doc | Other doc | Suggested resolution |
|---|---|---|---|---|
| C1 | Response scale | 7-point, all labelled (§3, §10.2) | doc 04 §2.2 notation r ∈ −2…+2 (5-point), D = mean\|Δ\|/4 | Adopt 7-point (−3…+3); rewrite doc 04 formulas with /6 |
| C2 | Default selection | "Neither row has a pre-selected value" (§10.3) | doc 04 §2.1: "put the grid cursor at the centre (neutral/neutral)" | No preselection. A centre default is a midpoint default and inflates "Neutral" (default effect); show the cursor only on hover/focus |
| C3 | Midpoint label | "Torn / it depends" (§3 synthesis) | doc 05 §1.1 / tagline "finally lets you say 'it depends'" via the grid | Label the midpoint "Neutral / torn", **not** "depends". The frame split *is* the "depends" channel; labelling the midpoint "depends" re-merges the two |
| C4 | Per-axis gap | "roughly noise" at 5 items (§0.6, §7.4) | doc 04 §2.2(b,d) shows per-axis arrows; doc 05 §6.1–6.3 headline "biggest gap on {axis}" | Gate per-axis claims on simulation-calibrated thresholds (doc 04 critic addendum: the current thresholds fire on pure noise) |
| C5 | Fragment-only privacy | "Never put answers in the URL path or query" (§9) | doc 05 §3.2 Option B puts the archetype *pair* in the path `/r/<theory>-<practice>/` | See doc 05 critic addendum. The path is sent to the host and is derived from answers. Disclose it, or use family-level stubs, or Option A |
| C6 | Gap index name and definition | "Necessity gap" = mean \|N−I\| (§10.7) | doc 04: "Context-sensitivity D", plus a noise-adjusted D_adj; doc 05: "Gap {0-100}" | One name and one formula, fixed before build. Rec: "Gap" = mean \|N−I\| / scale range × 100, always shown next to the random-answer baseline |
| C7 | What the Now label is matched against | §10.11: the same archetypes, I by default, N optional | doc 04 §2.2(i): N vs ideology *transitional* vectors; doc 05: "theory archetype × practice archetype" | Decide whether "Here and now: B" means "your Now resembles B's *ideal*" or "B's *programme*". Rec: match N against the same ideal catalogue (cheap, context-free), and offer transitional matching only as a secondary insight with the reference-context caveat |

### D. Smaller corrections
- §1 table, original matching: "(equality, freedom, globalism, progress)" uses 8values pole names. In 12axes code, `e` is high = **Security** and `k` is high = **Protectionist**, and the `dipl`↔`k` comparison is polarity-inverted (doc 01 §4). The 4-axis criticism understates the bug.
- §1 table, vercel keying "[UNVERIFIED how they break ties]": resolved by doc 02 §5. The majority pole alternates by axis.
- §7.3, "7 × 44 px = 308 px fits 360 px": true for the cells alone, but axis labels and the "same in both" diagonal legend need ~40–60 px more. At ≤360 px, the two-row mode should be the **default**, with the grid as the opt-in.
- §10.5 vs virality: 60 pairs is 120 decisions, and doc 04 adds 6 SC items, 12 status-quo sliders, 3–4 repeat items and reason chips. **Nobody has set a total length budget.** Rec: standard ≤ 60 pairs + 6 context items (~9–10 min); sliders and chips optional; no repeat items (see doc 04 addendum). A quick mode, if any, reports only 3 super-dimensions (§10.5).

### E. Missing: careless and random responding with two columns
A random clicker on a 7-point pair has E\|N−I\| = 16/7 ≈ 2.29 scale points, i.e. Gap ≈ 38/100 (simulated 38.1, 5–95% 32–44; on 5-point it is 40.0). Plausible honest respondents with a *zero* true gap and independent response noise of SD 0.5–1.0 scale points score 9–17/100 on 7-point. That is pessimistic, because a paired grid makes exact N = I easy.

So a **high Gap is the signature of carelessness as well as of context-sensitivity**. Needed:
- a cheap carelessness flag, for example high Gap with low within-axis coherence (doc 04 §2.2d), or a keyed-pair contradiction rate;
- the random baseline printed next to the Gap.

Sim: `/tmp/claude-1000/-home-xertrov-src-12x2/6f22d232-cf93-470e-949f-6728e7611f5a/scratchpad/analysis/gap_noise_sim.py` (seeded, 5 items/axis, keyed 3:2 as written; output reproduced in the doc 04 addendum).

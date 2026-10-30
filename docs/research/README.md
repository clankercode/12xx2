# Research index: 12 Axes² (12xx2)

These are the inputs for the design phase. Each doc ends with a **Critic addendum** (2026-10-31) covering cross-doc checks, corrections and open gaps. Read the addenda before the main sections.

| Doc | Summary |
|---|---|
| [01-original-mit-12axes.md](01-original-mit-12axes.md) | The MIT original (politicaltests): 12 axes × 8 levels × 3 = 288 items. Scoring uses only the sign of each item's level. The short-quiz off-by-one (`8-t`) pushes moderates about +10 toward the positive pole. Matching uses 4 of 12 axes, with the polarity inverted on `dipl`↔`k`.<br>It also has an item-by-item fitness audit for the dual frame (≈48% usable as written, 26% need rewording, 26% unusable) and lists the status-quo-relative wording that confounds the "now" and "ideal" frames. |
| [02-popular-12axes-vercel.md](02-popular-12axes-vercel.md) | The viral 12axes.vercel.app (all rights reserved; study only). It uses a mean-of-Likert score, a hand-tuned 4-term match blend that is inflated (random answerers get a top match of 87–93%), and catalogue vectors written by LLM role-play. Its share stack is strong.<br>It includes a do-not-copy list, and notes the ideas to re-derive: stateless URL results, symmetric scoring of users and profiles, and a calibration benchmark. |
| [03-survey-methodology.md](03-survey-methodology.md) | Psychometrics. Recommends a 7-point scale with every point labelled, plus skip scored as missing, balanced keying and polar items, and treating the 12 axes as facets (about 2–5 real dimensions). The difference score N−I is unreliable per axis.<br>It covers the SEM budget (±11 points at 5 items), anchoring vignettes as the basis for the N/I split, weighted-Euclidean matching with stability labels, and privacy (GDPR Art. 9 means a fragment-only, client-side design). |
| [04-ideal-vs-nonideal-theory.md](04-ideal-vs-nonideal-theory.md) | Philosophical grounding: Rawls ideal/non-ideal and realistic utopia, Sen, Mills, Valentini, Williams' Basic Legitimation Demand, second-best theory, and emergency powers. Gives respondent-facing definitions for both frames and derived measures (signed gap, coherence, System Confidence block, reason chips).<br>It also has 18 ideologies whose ideal and transitional programmes differ, which is the case for matching on the ideal and now vectors jointly. |
| [05-virality.md](05-virality.md) | Case studies (12axes wave via streamers, 8values/PCM, Wordle, Wahl-O-Mat, NYT dialect quiz). Share mechanics for a no-backend SPA: story/post/OG cards, prerendered per-pair OG stubs, fragment-encoded scores, compare-a-friend, Web Share.<br>It also covers channel norms (Reddit, X, HN), risks, and a launch playbook with copy templates and an honest list of what we can measure without telemetry. |

## Top cross-doc issues (critic)

1. **Modal asymmetry between the frames** (03 addendum A; 04 addendum B). The Ideal frame asks "would it *ever* do this?" and the Now frame asks "*should* it do this now?". That wording biases every gap. Both frames must evaluate the same conditional proposition and differ only in which system acts.
2. **Gap metrics fire on noise** (03 E; 04 D; 05 B). A random clicker scores Gap ≈ 38/100 on a 7-point scale. Doc 04's per-axis arrow thresholds show arrows on 2–5 axes for a respondent with no true gap. The share card's hero stats ("Gap NN", "biggest gap on X") need calibrated gates and a printed baseline.
3. **Privacy contradiction** (05 A; 03 C5). The recommended OG stubs put the archetype pair in the URL path, which is sent to the host. Doc 03 forbids this, and doc 05's own TL;DR claims otherwise.
4. **Unreconciled parameters** (03 C1–C7). These need one answer each: scale (7 vs 5 points), default cursor (none vs centre), midpoint label ("depends" vs not), gap name and formula, and what the "Here and now" label is matched against.
5. **State-as-agent conflation** (01 addendum A). Economic items that name "the state" score anarchists as pro-market. Separate the outcome from the agent.

## Open questions for Max / design phase

- **Q1. Now-column reading for conditional items.** Hypothetical ("if this happened here") or actual ("it isn't happening here")? *Rec:* hypothetical in both columns, plus a chip or context item for "doesn't happen here".
- **Q2. Is the rest of the world ideal in the Ideal frame?** *Rec:* no. Your country's system is ideal and other countries are as they realistically could be.
- **Q3. Axis set.** Keep 12 named axes (MIT concepts), each redefined to one construct and grouped under 3 super-dimensions, with a crosswalk to the vercel names? *Rec:* yes.
- **Q4. Headline result.** Pair label ("In theory A · Here and now B") first, with the gap secondary and baselined? *Rec:* yes.
- **Q5. Now-label semantics.** Match N against the same ideal catalogue (rec), or against per-ideology transitional vectors (context-bound, secondary)?
- **Q6. Archetype provenance.** What is the coding protocol for archetype vectors (ranges, citations, ≥2 independent codings, published spread)? No doc specifies one yet.
- **Q7. Length budget.** *Rec:* standard ≤ 60 pairs + 6 context items. Status-quo sliders and reason chips optional. No repeat items. Quick mode reports only super-dimensions.
- **Q8. OG stubs.** Pair-path stubs with disclosure (rec), family-level stubs, or a single generic OG image?
- **Q9. Reuse MIT item text** (with the 8values/SapplyValues notice), or write everything fresh? Also choose a licence for our content.
- **Q10. Launch timing.** After the 2026-11-03 US midterms. Target mid-November, once the item review is done.

## Scratch artefacts

- `/tmp/claude-1000/-home-xertrov-src-12x2/6f22d232-cf93-470e-949f-6728e7611f5a/scratchpad/analysis/sim12.py`: original 12axes score behaviour (doc 01).
- `/tmp/claude-1000/-home-xertrov-src-12x2/6f22d232-cf93-470e-949f-6728e7611f5a/scratchpad/analysis/compat_stats.py`: vercel match-formula re-implementation (doc 02).
- `/tmp/claude-1000/-home-xertrov-src-12x2/6f22d232-cf93-470e-949f-6728e7611f5a/scratchpad/analysis/gap_noise_sim.py`: gap and arrow behaviour under noise and random clicking (critic addenda).

# 01 — The original (MIT) 12axes: structure, algorithm, flaws, dual-frame fitness

Source studied: `politicaltests/politicaltests.github.io`, directory `12axes/`, commit `5a508de557cc88eb7e9a44d89f45501dbe912d61` (2025-02-27), cloned to
`/tmp/claude-1000/-home-xertrov-src-12x2/6f22d232-cf93-470e-949f-6728e7611f5a/scratchpad/upstream/pt-site/` (referred to below as `UP/`).
Live: https://politicaltests.github.io/12axes · Repo: https://github.com/politicaltests/politicaltests.github.io/tree/main/12axes

Files: `12axes/{questions.js, ideologies.js, index.html, instructions.html, quiz.html, longquiz.html, results.html, CHEATSHEET, style.css, values.png, value_images/*}`; site root `LICENSE`, `navbar.html`, `index.html`, `style.css`, `html2canvas.js` (html2canvas is used only by `auth/results.html`, not by 12axes).

Licence: `UP/LICENSE` — MIT, "Copyright (c) 2020 8values (SapplyValues)". `12axes/index.html:68-69` states 12axes is released under the same licence. Lineage: 8values → 9axes (https://9axes.github.io/) → 12axes (`12axes/index.html:19`). We may adapt questions/code with the MIT notice included. Caveat: the `desc` strings in `ideologies.js` look like paraphrased/copied Wikipedia lead sentences (CC BY-SA) — UNVERIFIED; do not reuse them verbatim.

Method: every code claim below was read directly; numeric claims about score behaviour were reproduced with a script (`/tmp/claude-1000/-home-xertrov-src-12x2/6f22d232-cf93-470e-949f-6728e7611f5a/scratchpad/analysis/sim12.py`, which parses the upstream data files without executing them).

---

## 1. The 12 axes

Score per axis is one number `v ∈ [0,100]` = the % shown for the **positive pole** (the pole whose statements are at levels 4..1 in `questions.js`). The opposite pole is displayed as `100 − v`.

| idx | URL param | Positive pole (v→100) | Negative pole (v→0) | Results heading | Category (`index.html`) | questions.js lines |
|---|---|---|---|---|---|---|
| 0 | `a` | Federal | Unitary | Structure | Governmental | 2–43 |
| 1 | `b` | Democratic | Autocratic | Representation | Governmental | 45–85 |
| 2 | `c` | Internationalist | Nationalist | **Intervention** | Diplomatic | 87–127 |
| 3 | `d` | Militarist | Pacifist | **Diplomacy** | Diplomatic | 129–169 |
| 4 | `e` | **Security** | **Freedom** | Power | Governmental | 171–211 |
| 5 | `f` | Collectivize (Equality) | Privatize (Markets) | Economy | Economic | 213–253 |
| 6 | `g` | Secular / Irreligious | Religious | Religion | Societal | 255–295 |
| 7 | `h` | Progressive | Traditional | Culture | Societal | 297–337 |
| 8 | `i` | **Assimilationist** | **Multiculturalist** | Immigration | Diplomatic | 339–379 |
| 9 | `j` | Planned | Laissez-Faire / Markets | Control | Economic | 381–421 |
| 10 | `k` | **Protectionist / Isolationist** | **Globalist** | Trade | Economic | 423–463 |
| 11 | `l` | Technology / Acceleration | Bioconservative | Technology | Societal | 465–505 |

Polarity is determined by `scores[ax] += mult*(rate<4?1:-1)` (`quiz.html:91`) — agreeing with level 4..1 items (indices 0–3) raises `v`. The results page agrees: left image/label = positive pole, e.g. `results.html:40` `security.png` on the left of `e`, `:64` `assimilationist.png` left of `i`, `:88` `protectionism.png` left of `k`.

**Polarity documentation bugs:** `CHEATSHEET:5,9,11` say `e - Freedom; e2 - Security`, `i - Multicultural; i2 - Assimilationist`, `k - Globalism; k2 - Protectionism` — all three are **backwards** vs the code. `quiz.html:30` comment `fed, dem, glo, mil, fre, equ, sec, pro, mul, plan, tra, acc` is also wrong for idx 2 (`glo` — actually internationalist), 4 (`fre` — actually security), 8 (`mul` — actually assimilationist). The results headings swap intuitive names: Internationalism axis is titled "Intervention", Militarism axis "Diplomacy" (`results.html:46,54`).

### What each axis actually measures (as implied by its items)

- **Federal/Unitary** — locus of power (national vs state/local); US "states" vocabulary throughout (`:6,9,15,32`). Also loyalty/identity items (`:11,32`).
- **Democratic/Autocratic** — mixes three dimensions: direct vs representative democracy (`:47-49`), majoritarianism vs counter-majoritarian liberalism (`:74,79` keyed as *autocratic*), and democracy vs autocracy/monarchy (`:69,78,84`).
- **Internationalist/Nationalist** — world government/UN power (`:89-95`), alliances/intervention (`:105,111`), trade (`:104`), aid (`:114`), national culture (`:116`), chauvinism (`:124`).
- **Militarist/Pacifist** — military size/spending, conscription, regime change, plus economic claims about war (`:131-132`) and a military-franchise idea (`:133,138`).
- **Security/Freedom** — surveillance, police power, civil liberties; plus drugs (`:193,203`), guns (`:198`), taxation-is-theft (`:204,209`), anarchism (`:190,208`), political exile (`:173`). Really a general authority/liberty axis.
- **Collectivize/Privatize** — ownership/redistribution/equality of outcome, plus healthcare (`:225`), budget/welfare (`:240`), regulation (`:250`).
- **Secular/Religious** — mixes **personal belief** (`:258,262-263,267,277,282,287`) with **church–state policy** (`:257,264,272-274,292-293`).
- **Progressive/Traditional** — LGBT, abortion, race (US), tradition-in-general, environment (`:315`), Sharia (`:336`).
- **Assimilationist/Multiculturalist** — mainly **immigration volume/borders** (`:341-342,346,356,358,377-378`), only partly assimilation (`:343,347,357`), plus cosmopolitan ethics (`:376`).
- **Planned/Markets** — regulation, state ownership, but also tax levels (`:390,400,404,409,420`), welfare design (`:410`), healthcare (`:413`).
- **Protectionist/Globalist** — tariffs/autarky, plus IP/tech secrecy (`:436-437`), nationalism (`:440`), personal shopping (`:427`), product-quality beliefs (`:457,462`).
- **Technology/Bioconservative** — AI, genetic modification, space, plus environmental regulation (`:487-488`), nostalgia (`:497`), traditional medicine (`:502`).

`index.html:19-61` describes the axes (texts stale: "eleven axes", "45"/"216" questions — 9axes leftovers, `:20,24-25`; instructions.html says 60/288, which is correct).

---

## 2. Question bank structure

`questions.js` is `questions[axis][levelIndex][k]` — 12 axes × 8 levels × 3 statements = **288 statements**, verified exactly 3 per level for every axis.

| levelIndex | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| nominal intensity (comment) | 4 | 3 | 2 | 1 | −1 | −2 | −3 | −4 |
| pole | + | + | + | + | − | − | − | − |

There is no level 0. Intensity is only encoded by array position; it is **never used in scoring except for its sign** (index < 4).

### Long quiz (`longquiz.html:36-50`)
All 288 statements, globally shuffled (Fisher–Yates with `Math.random`, `:68-85`). Per axis: 24 items, 12 per pole, symmetric extremity.

### Short quiz (`quiz.html:37-50`) — 60 items, 5 per axis
```js
//1,2,3,-2,-4
var t = [1,2,3,5,7];
for(var i = 0; i < 12; i++) {
    var c = Math.random()<0.5;
    for(var j = 0; j < 5; j++) {
        var m = [i,c?t[j]:(8-t[j]),Math.floor(Math.random()*questions[i][c?t[j]:(8-t[j])].length)];
        qs.push(m);
    }
}
shuffle(qs);
```
Per axis a coin `c` picks a level set, then one of the 3 statements at each level uniformly at random:

| c | indices | levels asked |
|---|---|---|
| true | 1,2,3,5,7 | **3, 2, 1, −2, −4** |
| false | 7,6,5,3,1 | **−4, −3, −2, 1, 3** |

**Off-by-one bug:** the mirror of index `x` is `7−x`, not `8−x`. Intended mirror set would be levels −3,−2,−1,2,4. Consequences: level **+4 and −1 items are never asked** in the short quiz; levels **+3, +1, −2 and −4 are always asked**. Every axis' short form always contains a maximally extreme *negative-pole* statement but never a maximally extreme *positive-pole* one. 2 × 3⁵ = 486 possible item forms per axis; ~10^32 distinct test forms overall.

Answers are not stored with item identity in the result; the result URL cannot reconstruct which form was taken.

---

## 3. Scoring algorithm (verbatim)

Answer buttons (`quiz.html:18-24`, identical in `longquiz.html:17-23`):

| Button | value |
|---|---|
| Strongly Agree | 2 |
| Agree | 1 |
| Partially Agree | 0.5 |
| Neutral/Unsure | 0 |
| Partially Disagree | −0.5 |
| Disagree | −1 |
| Strongly Disagree | −2 |

Accumulation (`quiz.html:87-111`, same in `longquiz.html`):
```js
function next_question(mult) {
    ...
    scores[ax] += mult*(rate<4?1:-1);
    answers[qn] = mult;
    ...
}
function prev_question() {
    ...
    qn--;
    scores[ax] -= answers[qn]*(rate<4?1:-1);
```
Normalisation:
```js
// quiz.html:112-114  (short, 5 items/axis)
function calc_score(score) { return (50+5*score); }
// longquiz.html:112-114 (long, 24 items/axis)
function calc_score(score) { return (50+score); }
```
Result hand-off: `location.href = results.html?a=…&b=…&…&l=…` (12 raw numbers, `quiz.html:115-129`).

So per axis: `raw = Σ answer × (+1 if item on positive pole else −1)`; intensity level is ignored. Short: raw ∈ [−10,10] → v ∈ [0,100] in 2.5-point steps (39 reachable values; 2.5/97.5 unreachable). Long: raw ∈ [−48,48] → v ∈ **[2,98]** (never 0 or 100; not divided by the maximum, despite `index.html:19` claiming "compared to the maximum possible").

Reproduced behaviour of simple respondent models (sim12.py):

| respondent model | short c=true | short c=false | long |
|---|---|---|---|
| answers "Agree" to everything | 55 | 45 | 50 |
| "Strongly agree" to everything | 60 | 40 | 50 |
| all Neutral/Unsure | 50 | 50 | 50 |
| **symmetric moderate** (agree ±1 items, partial ±2, disagree ±3, strongly disagree ±4, both poles) | **60** | **62.5** | 50 |
| pure positive-pole partisan | 100 | 100 | 98 |

The symmetric moderate is pushed ~+10–12.5 toward the positive pole on **every** axis of the short quiz → labelled "Federal", "Representative Democracy", "Cooperation", "Military-Focused", "Statist", "Social Democratic", "Agnostic", "Progressive", "Assimilationist", "Regulationism", "Limited Trade", "Technological" (label threshold `>60`). With the intended (bug-fixed) mirror the moderate would instead get 60 or 40 at random — still a ±10 artefact, because a 3-vs-2 item split with unmatched extremity is inherently unbalanced.

---

## 4. results.html

### Display
- Reads params via a hand-rolled parser returning raw strings (`results.html:132-141`), no decoding/validation; missing → `NaN`.
- For each axis shows two horizontal bars `v%` and `(100−v).toFixed(1)%` with pole images (`:20-116`, `:205-241`); bar text written with `innerHTML` (`:143-151`).
- Per-axis label from a 7-bucket array (`:153-176`):
```js
function setLabel(val,ary) {
    if (val > 100) { return "" } else
    if (val > 90) { return ary[0] } else
    if (val > 75) { return ary[1] } else
    if (val > 60) { return ary[2] } else
    if (val >= 40) { return ary[3] } else
    if (val >= 25) { return ary[4] } else
    if (val >= 10) { return ary[5] } else
    if (val >= 0) { return ary[6] } else
        {return ""}
}
```
Buckets: (90,100] (75,90] (60,75] [40,60] [25,40) [10,25) [0,10). Label arrays (positive pole first), e.g. `eArray = ["Totalitarian","Authoritarian","Statist","Centrist","Liberal","Libertarian","Anarchist"]`, `iArray = ["Ethnonationalist","Monoculturalist","Assimilationist","Centrist","Polyculturalist","Multiculturalist","Racially Colorblind"]`, `bArray = [... "Centrist","Bicemeral","Oligarchy","Autocracy"]` (`:153-164`). Notable label problems: "Bicemeral" (typo; bicameralism is not a point between democracy and oligarchy); "Racially Colorblind" as the *most multiculturalist* label (colour-blindness is usually contrasted with multiculturalism); `cArray` centre = "Non-Interventionist" (centre ≠ non-intervention); "Totalitarian" for high Security.
- A commented-out alternative labeller and a commented-out canvas renderer branded "9Axes" remain (`:178-190`, `:294-465`).
- "Take Screenshot" sends the user to third-party `screenshotmachine.com` and asks them to paste the result URL (`:127-128`). "Back" links to `../12axes.html` (`:130`), which does not exist in the repo (broken; same in `instructions.html:17`).

### Ideology matching (verbatim, `results.html:257-271`)
```js
ideology = ""
ideodist = Infinity
for (var i = 0; i < ideologies.length; i++) {
    dist = 0
    dist += Math.pow(Math.abs(ideologies[i].stats.econ - f), 2)
    dist += Math.pow(Math.abs(ideologies[i].stats.govt - e), 2)
    dist += Math.pow(Math.abs(ideologies[i].stats.dipl - k), 2)
    dist += Math.pow(Math.abs(ideologies[i].stats.scty - h), 2)
    if (dist < ideodist) { ideology = ideologies[i].name; ideolink = ...; ideodesc = ...; ideodist = dist }
}
```
- Metric: squared Euclidean distance in **4 dimensions only** (f Economy, e Security, k Trade, h Culture). **8 of 12 axes are ignored** (Federal, Democratic, Internationalist, Militarist, Religion, Immigration, Planned, Technology).
- First-best wins on ties; always returns a "Closest Match" no matter how far (no distance/confidence shown). Missing params → every `dist` is `NaN`, nothing matches, label empty and `ideodesc` undefined.
- `ideologies.js` format: `[{name, link (Wikipedia), desc, stats:{econ, dipl, govt, scty}}]` — **38 ideologies** (8values-style 4-D profiles). Range examples: Anarcho-Communism {90,50,5,50}, Stalinism {100,20,100,40}, Fascism {40,10,90,10}, Trotskyism {100,100,40,50}, Neoliberalism {30,30,50,60}, Anarcho-Capitalism {10,50,0,50}, Centrism {50,50,50,50}. All 38 are reachable.
- Semantics inferred from the data: `econ` high = equality (matches f ✓), `govt` high = authority (Stalinism 100, anarchists ~0; matches e = Security ✓ — appears re-coded from 8values where govt high = liberty, UNVERIFIED), `scty` high = progress (matches h ✓), `dipl` high = **globalist/internationalist** (Trotskyism 100, Fascism 10, Stalinism 20, Neoconservatism 20).
- **Polarity bug:** `dipl` (high = globalist) is compared with `k` (high = **protectionist**). Reproduced:

| user profile (f, e, k, h) | match |
|---|---|
| nationalist-protectionist authoritarian traditionalist (40, 90, **90**, 10) | **Technocracy** (d²=3000) |
| same but free-trader (40, 90, **10**, 10) | **Fascism** (d²=0) |
| hard-left globalist (100, 40, **10**, 50) | Revolutionary Socialism |
| hard-left **protectionist** (100, 40, **90**, 50) | **Trotskyism** |

  Also the wrong axis: `dipl` conceptually corresponds to `c` (Internationalism), not `k` (Trade). Neoliberalism's `dipl: 30` is inconsistent with the other entries (would be globalist under the k convention) — evidence of partially mixed conventions.

---

## 5. Methodological flaws and bugs

### A. Scoring / psychometrics
1. **Intensity levels unused.** Only the sign of the level matters (`quiz.html:91`). Agreeing with "Local governments give each region good representation of their views." (`questions.js:22`, level 1) scores identically to "There is no need for a national government." (`:4`, level 4).
2. **Dominance scoring applied to ideal-point items.** Items are graded by extremity, which is an *unfolding / ideal-point* design (a moderate agrees with mild items and rejects extreme items on *both* sides). Summing agree/disagree (a dominance/Likert model) misreads this: strongly disagreeing with "The Internet should be banned." (`:503`) adds +2 toward Transhumanist exactly as much as strongly agreeing "If AI could rule more effectively than humans, then AI should rule." (`:467`). Rejecting an extreme is weak evidence for the opposite extreme. Appropriate models: Coombs unfolding / GGUM (Roberts, Donoghue & Laughlin 2000, *Applied Psychological Measurement*; citation not web-verified this session).
3. **Short-quiz asymmetric sampling + off-by-one** (§2): level −4 always asked, level +4 never → systematic push toward the positive pole on all 12 axes for moderates (+10 to +12.5 points, §3 table).
4. **Random 3-vs-2 pole split per axis** (`c`, `quiz.html:42`): acquiescent responders get 55/45 or 60/40 by coin flip → test–retest noise with no signal.
5. **Random item choice within level** (`quiz.html:45`): 486 forms per axis with unequal item difficulty/content (e.g. +3 Militarism could be "There should be compulsory military service." or "Countries that do not serve our interests should be toppled."). Two people's short-quiz scores are not comparable; one person's retest is not comparable.
6. **One answer = 10 points in the short quiz** (5 items × max 2 → ±10 raw, ×5). A single "Strongly" flips a label bucket.
7. **Short and long versions are on different scales** (`50+5*score` vs `50+score`): long max 98, per-answer step 0.5–2 points vs 2.5–10. Label distributions differ between versions.
8. **Neutral == Unsure** (`quiz.html:21`, value 0): "I have no opinion/don't understand" is indistinguishable from "I hold a considered middle position", and both pull the axis to 50. No skip option; skipped items cannot be excluded from the denominator.
9. **Non-uniform response spacing** (0, 0.5, 1, 2): undocumented; "Strongly" answers dominate. Fine if intended, but untested.
10. **"Percentages" are net balances, not proportions.** Bars `v` and `100−v` sum to 100 and read as "% Security vs % Freedom" though they are a single signed sum.
11. **No item validation.** Levels/keys are author judgement; no factor analysis, no pilot data, no reliability statistics anywhere in the repo.
12. **No reproducibility:** unseeded `Math.random`, result URL doesn't encode form/answers or a version.

### B. Item-level problems (quotes, `questions.js` line)
- **Double-barrelled:** "Police need more power and protection." (178); "The government actively works with large corporations to destroy small businesses." (414); "Developing alternative technology is a better means of helping the environment than environmental regulations." (483); "Only extremely talented immigrants, if that, should be permitted to enter the country." (346).
- **Loaded / slogans / strawmen:** "If you have nothing to hide, then you have nothing to fear." (183); "Those who would give up essential Liberty to purchase a temporary Safety deserve neither." (194); "Taxation is theft." (204, 420); "A constant state of war benefits a country." (132); "Any deals other countries want must be bad for us." (126); "Most, if not all corporations are inherently evil." (222); "White guilt is sometimes justified." (300).
- **Near-consensus (low discrimination, inflate acquiescence effects):** "Peace is preferable to war whenever possible." (153); "Diplomatic options should always be tried before war is even considered." (152); "It is very important to maintain law and order." (179); "Every person has unalienable rights, including the right to life, liberty and the pursuit of happiness." (199); "I enjoy some foreign cultures." (363); "We should respect those who have served in our military." (148); "Lasting peace leads to prosperity." (157).
- **Empirical/predictive claims, not values:** "War is needed to make an economy thrive." (131); "Economic globalization is inevitable." (455); "Traditional medicines are often more effective than modern medicines." (502); "The quality of life is generally going up decade by decade." (482); "Socialism will never has and will never work." (247); "Any variant of anarchism will never work." (190); "Economic classes are inevitable." (242).
- **Personal belief/identity/behaviour, not politics:** "I consider myself an Atheist." (262); "My religion is true." (287); "I believe there is something after death." (277); "I am a transhumanist." (473); "I only buy products that are made in my country." (427); "Nobody but me can adequately represent my views." (54).
- **Mis-keyed:** "Democracy makes it too easy for a majority to further itself at the expense of minorities." (74 → Autocratic; it is liberal-constitutionalist); "Public opinion swings too much with emotional events to be useful for policy making." (79 → Autocratic; Burkean representative view); "People must be allowed to follow a religion." (279 → Religious; religious freedom is a secular-liberal norm); "Sharia law isn't as bad as people think it is." (336 → Traditional, extreme; a Christian traditionalist would *disagree*, a relativist progressive might agree); "Regulations on industries must be implemented to protect the environment." (488 → Bioconservative, while "Environmental regulations are essential." 315 → Progressive); "The threat of machines taking over humanity is very real." (494 → Bioconservative; AI-risk concern is common among technologists); "Those who disagree with the government should be removed from the country." (173 → Security; it is autocratic repression).
- **Mis-levelled:** "Autocracy is the best way to rule a nation." at level −1 (69) — the most extreme autocracy statement in the bank sits at the mildest level; "Any variant of anarchism will never work." at +1 Security (190).
- **Duplicates / near-duplicates within an axis:** 6 vs 9 (state laws precedence); 133 vs 138 (military-only power).
- **US-centrism and dating:** "states" (6,9,11,32,35,37,42); "single-payer" (225, 413); "The hourly minimum wage should be 15 USD or more." (395); "I support the BLM movement." (314); slavery reparations (299); "The right to bear arms should not be infringed." (198); Declaration of Independence wording (199).
- **Status-quo-relative wording** (meaning flips by country — exactly the Denmark/Iran confound 12xx2 targets): "Local governments should have more power than they currently do." (14); "The national government needs more power." (30); "The United Nations needs more power." (94); "My country spends too much money on the military." (158); "Police need more power and protection." (178); "Society has become too progressive." (329); "We should be taking in more refugees." (361); "Taxation for the rich should be higher than it is now." (400); "Income taxes for the middle and lower classes should be lowered." (404); "Tariffs should be lowered." (450). Meanwhile other items are implicitly ideal-framed ("Direct democracy is the best form of government." 47; "Communism, if implemented correctly, would be a good form of economics." 215; "Theocracy is a good system of government" 292). **The original silently mixes the two frames 12xx2 separates**, so an axis score blends "what my country needs now" with "what is just in principle" in unknown proportion.
- **Typos:** reperations (299), Huamnity (268), Privitization (236), descendents (235), "will never has" (247), "to higher import prices" (431), Bicemeral (results 154), Accleration (index 60).

### C. Axis overlap / non-orthogonality
- **Collectivize (f) vs Planned (j):** "The government should not regulate the economy at all." (f, 250) ≈ "Government should not regulate the economy at all." (j, 418); healthcare in both (225 vs 413); high taxes on the rich (390, 400) are redistribution placed on Planned. Expect very high f–j correlation; together they double-weight the economic left-right.
- **Internationalist (c) vs Protectionist (k):** "International trade is generally beneficial." (c, 104) ≈ "Trade is often beneficial to both parties." (k, 446); "The government should prioritize my country over all others." (k, 440) is nationalism. And `results.html` uses k (not c) as "diplomatic" for matching.
- **Internationalist (c) vs Assimilationist (i):** "National cultures are important to protect." (c, 116) ≈ "A nation's culture is important to protect." (i, 352); "Governments should be as concerned about foreign citizens as they are about those within their borders." (i, 376) is cosmopolitanism.
- **Security (e) vs Planned (j):** "Taxation is theft." appears on both (204, 420); "Taxation should be voluntary or abolished." (209).
- **Security (e) vs Democratic (b):** "No authority should be left unquestioned." (200) vs "A nation must obey its leadership without question." (84); "Those who disagree with the government should be removed" (173).
- **Progressive (h) vs Religious (g):** "Sex before marriage is immoral." (324), "Homosexuality is immoral." (325) are religious-morality items on h.
- **Progressive (h) vs Technology (l):** environmental regulation keyed to opposite "tribes" (315 vs 487-488).
- **Militarist (d) vs Internationalist (c):** "Intervention has caused more harm than good." (111) and "My nation should stay out of international affairs." (119) on c; "We have no right to militarily intervene in other nations." (162) on d.
- **Militarist (d) vs Democratic (b):** military-only franchise (133, 138).

### D. Construct conflation within axes
- **Religion axis** conflates personal theism ("There is no higher power." 263; "I believe in a higher power." 282) with state–religion policy ("There must be a separation between church and state." 274; "The government should support and only recognize one religion" 293). A devout believer who wants strict church–state separation (e.g. many US Baptists historically) cannot be represented.
- **Assimilationist axis** conflates immigration *volume* with *integration model* — a high-immigration assimilationist (France-style) or a low-immigration multiculturalist cannot be represented.
- **Democratic axis** conflates direct-vs-representative with democracy-vs-autocracy (a Madisonian liberal scores as partly autocratic).
- **Security axis** is a grab-bag of liberty items (drugs, guns, tax, anarchism, exile).

### E. Code / product bugs
- Polarity mismatch `dipl`↔`k` and use of only 4/12 axes in matching (§4).
- Short-quiz `8-t` off-by-one (§2).
- Raw query strings written via `innerHTML` (`results.html:147`) and no numeric validation; values outside [0,100] produce over-long bars and empty labels. Exploitability as XSS limited because browsers percent-encode `<`/`>` in query strings and the code never decodes — UNVERIFIED across browsers.
- Results are trivially forgeable (unauthenticated URL params) — acceptable for a static quiz, but there is no version/format tag.
- Broken back links `../12axes.html` (`results.html:130`, `instructions.html:17`); favicon path typo `../icon/` (`instructions.html:5`).
- Stale copy: "eleven axes", "45 / 216 questions" (`index.html:20,24-25`); CHEATSHEET and code-comment polarity errors (§1).
- Privacy: Google Fonts loaded on every page (`quiz.html:2` etc.) leaks IP to Google; the screenshot flow sends the full result URL to a third party. 12xx2 must self-host fonts and render share images client-side.

---

## 6. Representative items vs the "Here and now" × "In an ideal system" frame

Legend — **W** works as-is (a policy/institutional rule that can be asked under both frames and plausibly gets different answers); **R** needs rewording (status-quo-relative, empirical, vague, off-axis, or US-specific, but salvageable); **X** doesn't make sense under the dual frame (personal belief/identity/taste, tautology, prediction). Level = nominal intensity; sign = pole. Line numbers are `questions.js`. ★ = especially good showcase for the dual frame (expected large here/ideal divergence).

Framing reminder used for judgement: *Here and now* = "in my actual country, today, would I support doing this?"; *Ideal system* = "in a well-functioning legitimate system with the best realistic starting point, would this ever be done if the conditions arose?"

### Federal (+) / Unitary (−)
| L | Item (line) | Fit | Why / rewording |
|---|---|---|---|
| 4 | There is no need for a national government. (4) | W | Constitutional design question; meaningful in both frames. |
| 4 | Subdivisions of nations should have their own militaries. (5) | W | Swiss/US-guard examples; both frames. |
| 3 | The national government can't understand what the people need. (10) | R | Perception of *a* government → "Most domestic policy should be decided regionally." |
| 3 | People should hold more loyalty to their local state than their country. (11) | X | Identity/loyalty, not an action. |
| 2 | Local governments should have more power than they currently do. (14) | R | Status-quo-relative; only meaningful here-and-now. Ideal form needs absolute statement. |
| 2 | It's a good idea to test a policy in one state rather than implementing it nationwide right away. (16) | W | Policy-process rule; both frames. |
| 1 | Local governments can understand their citizens better than the national government could. (20) | R | Empirical. |
| −1 | The national government protects minorities better than some local governments do. (26) | R★ | Reword: "The national government should be able to override regions to protect minority rights." Strongly context-dependent (Jim Crow-era vs ideal). |
| −2 | Subdivisions should not be able to exempt from national laws. (31) | W | Both frames. |
| −4 | Laws should be completely consistent within all regions of a nation. (41) | W | Both frames. |

### Democratic (+) / Autocratic (−)
| L | Item (line) | Fit | Why / rewording |
|---|---|---|---|
| 4 | Direct democracy is the best form of government. (47) | R | "Best form" is inherently ideal-frame; reword as action: "Major laws should be decided by referendum." |
| 4 | People should vote issue by issue themselves. (48) | W | Both frames. |
| 4 | Representatives rarely represent the nation well. (49) | R | Empirical; also measures direct-vs-representative. |
| 3 | It is important that the government follows the majority opinion, even if it is wrong. (52) | W★ | Classic majoritarian dilemma; answers likely differ by frame. |
| 3 | Nobody but me can adequately represent my views. (54) | X | Personal, not political. |
| 2 | Each person should have one vote, each equal to every other. (59) | W | Both frames. |
| −1 | Autocracy is the best way to rule a nation. (69) | R | Mis-levelled (extreme at −1); reword as action. |
| −2 | Democracy makes it too easy for a majority to further itself at the expense of minorities. (74) | R | Mis-keyed; becomes a Federal/constitutional-limits item. |
| −3 | An absolute monarchy is more preferable than a liberal democracy. (78) | W★ | Directly the philosopher-king question: "now" (e.g. a failed state) vs ideal. |
| −4 | A nation must obey its leadership without question. (84) | W | Both frames (also loads on Security). |
| new | (suggested) "Elections may be suspended during a genuine national emergency." | W★ | Canonical "if conditions arose" item missing from the bank. |

### Internationalist (+) / Nationalist (−)
| L | Item (line) | Fit | Why / rewording |
|---|---|---|---|
| 4 | A united world government would be beneficial to mankind. (89) | W★ | Huge expected gap between now and ideal. |
| 4 | We are first and foremost citizens of Earth. (90) | X | Identity. |
| 3 | The United Nations needs more power. (94) | R | Status-quo-relative + names a specific institution; → "An international body should be able to bind nations on X." |
| 3 | The United Nations should have a military to enforce its resolutions. (95) | W★ | Current UN (veto) vs an ideal global body. |
| 2 | I support regional unions, such as the European Union. (99) | R | First-person + specific; → "Neighbouring nations should pool sovereignty in a regional union." |
| 2 | Governments should be accountable to the international community. (100) | W | Both frames. |
| 1 | International trade is generally beneficial. (104) | X | Empirical; belongs on Trade (duplicate of 446). |
| −1 | Intervention has caused more harm than good. (111) | R | Historical-empirical; belongs on Militarism. |
| −2 | International aid is a waste of money most of the time. (114) | R | Empirical → "Wealthy nations should give significant foreign aid." |
| −3 | The United Nations should be abolished. (120) | W | Both frames (institution-specific but clear). |
| −4 | My nation is better than all other nations. (124) | X | Chauvinist belief; nonsense in ideal frame. |
| −4 | There should not be international law. (125) | W | Both frames. |

### Militarist (+) / Pacifist (−)
| L | Item (line) | Fit | Why / rewording |
|---|---|---|---|
| 4 | War is needed to make an economy thrive. (131) | X | False empirical claim. |
| 4 | Only those who serve in the military should be allowed to have influence on who is in power. (133) | W | Works, but belongs on Democratic (franchise). |
| 3 | There should be compulsory military service. (136) | W★ | Finland/Israel/Ukraine now vs ideal. |
| 3 | Countries that do not serve our interests should be toppled. (137) | W | Both frames. |
| 2 | Countries that violate human rights should be toppled (142) | W★ | The Iran-style case; strong frame dependence. |
| 2 | Military action by our nation is often necessary to protect it. (141) | R | Country-dependent empirical (Ukraine vs New Zealand) → "Our nation should be prepared to use force pre-emptively." |
| 1 | A government must maintain a strong military to defend itself. (146) | W | Both frames; ideal frame must say whether the *world* is also ideal (see design note). |
| 1 | We should respect those who have served in our military. (148) | X | Attitude, consensus. |
| −1 | Peace is preferable to war whenever possible. (153) | X | Tautology. |
| −2 | My country spends too much money on the military. (158) | R | Status-quo-relative. |
| −3 | We have no right to militarily intervene in other nations. (162) | W | Both frames. |
| −4 | War is never justified. (166) | W★ | Ideal frame answer depends on whether aggressors exist. |
| −4 | Nations should not maintain a military. (168) | W | Both frames. |

### Security (+) / Freedom (−)
| L | Item (line) | Fit | Why / rewording |
|---|---|---|---|
| 4 | Those who disagree with the government should be removed from the country. (173) | W | Works but belongs on Democratic/Autocratic. |
| 4 | The government should monitor all citizens to combat terrorism. (174) | W★ | Classic conditional power. |
| 4 | People should not have protections that could hinder discovering their criminal activity. (175) | W | Both frames. |
| 3 | Police need more power and protection. (178) | R | Status-quo-relative, double-barrelled. |
| 3 | It is very important to maintain law and order. (179) | X | Consensus valence. |
| 2 | If you have nothing to hide, then you have nothing to fear. (183) | X | Slogan. |
| 2 | The sacrifice of some civil liberties is necessary to protect us from acts of terrorism. (184) | W★ | Necessity-vs-principle exactly. |
| 1 | The government should have access to the emails of suspected terrorists. (188) | W | Add "with/without a warrant" to disambiguate. |
| −1 | Marijuana should be legal. (193) | W | Both frames (off-axis-ish: personal liberty). |
| −2 | The right to bear arms should not be infringed. (198) | W★ | US-centric phrasing → "Citizens should have a right to own firearms." Strong context dependence. |
| −3 | Victimless crimes (such as drug use) should not be crimes at all. (203) | W | Both frames. |
| −3 | Taxation is theft. (204) | X | Moral slogan; economic; duplicated. |
| −4 | People's freedom should have no limits. (210) | W | Both frames. |

### Collectivize (+) / Privatize (−)
| L | Item (line) | Fit | Why / rewording |
|---|---|---|---|
| 4 | Communism, if implemented correctly, would be a good form of economics. (215) | R★ | Already smuggles in an ideal frame ("if implemented correctly"); split into the two frames instead. |
| 4 | Equality of outcome is important. (217) | R | Value, not action → "The state should aim to equalise outcomes." |
| 3 | Private property should be abolished. (220) | W | Both frames. |
| 3 | Most, if not all corporations are inherently evil. (222) | X | Moral sentiment. |
| 2 | I support single-payer, universal healthcare. (225) | W★ | Reword to non-first-person, non-US term; US-now vs ideal. |
| 1 | The wealthy have far more than they need. (230) | R★ | → "The state should redistribute wealth concentrated in a few hands." — Max's Denmark/Iran example verbatim. |
| 1 | Services like roads should be publicly owned. (231) | W | Both frames. |
| 1 | People born to wealthy families have unfair success even when they aren't skilled and don't work hard. (232) | R | Empirical and context-dependent. |
| −1 | People should have the right to leave their wealth to their descendents. (235) | W★ | Inheritance tax: now vs ideal. |
| −2 | Economic classes are inevitable. (242) | X | Prediction. |
| −3 | People should have to work for anything they get. (246) | W | Both frames. |
| −4 | Private charities are a better means of helping the poor than public welfare is. (252) | R | Comparative empirical, context-dependent → "Poverty relief should be left to private charity." |

### Secular (+) / Religious (−)
| L | Item (line) | Fit | Why / rewording |
|---|---|---|---|
| 4 | Religion should be banned. (257) | W | Both frames. |
| 4 | Faith is complete nonsense. (258) | X | Personal belief. |
| 3 | I consider myself an Atheist. (262) | X | Identity. |
| 3 | The government should not fund any religious organizations in any way. (264) | W | Both frames. |
| 2 | Creationism is a myth. (267) | X | Empirical → "Creationism should not be taught in public schools." (W) |
| 1 | Laws should not be based on religion. (273) | W | Both frames. |
| 1 | There must be a separation between church and state. (274) | W★ | UK (established church) vs Iran vs ideal. |
| −1 | I believe there is something after death. (277) | X | Personal belief. |
| −1 | People must be allowed to follow a religion. (279) | W | Mis-keyed; fine as a liberty item. |
| −2 | Children should be educated in religious values. (284) | R | By whom? → "State schools should teach religious values." |
| −3 | My religion is true. (287) | X | Personal belief. |
| −4 | Theocracy is a good system of government (292) | W★ | Philosopher-king analog for religion. |
| −4 | The government should support and only recognize one religion (293) | W | Both frames. |

### Progressive (+) / Traditional (−)
| L | Item (line) | Fit | Why / rewording |
|---|---|---|---|
| 4 | We should pay reperations for the descendants of slaves. (299) | R★ | US-specific → "A just state compensates descendants of historic state injustice." Necessity-vs-principle case. |
| 4 | White guilt is sometimes justified. (300) | X | Moral sentiment, US-centric. |
| 3 | Gender is a social construct. (304) | X | Philosophical/empirical → a policy item (e.g. legal gender self-ID). |
| 3 | Affirmative action is mostly beneficial. (306) | R★ | → "Government should use affirmative action." Remedy-now vs ideal is the cleanest example of "necessary vs just". |
| 2 | Abortion should be legal. (310) | W | Both frames. |
| 2 | Statues of certain people should be taken down. (311) | R | Vague. |
| 1 | I support the BLM movement. (314) | X | Movement identity, US, dated. |
| 1 | Environmental regulations are essential. (315) | R | Off-axis (environment). |
| 1 | Same sex marriage should be legalized. (316) | W | Both frames. |
| −2 | Homosexuality is immoral. (325) | X | Personal moral judgement (use 335 instead). |
| −3 | Society has become too progressive. (329) | R | Status-quo-relative; no ideal-frame meaning. |
| −4 | Homosexuality should be criminalized. (335) | W | Both frames. |
| −4 | Sharia law isn't as bad as people think it is. (336) | X | Mis-keyed, perception-relative. |

### Assimilationist (+) / Multiculturalist (−)
| L | Item (line) | Fit | Why / rewording |
|---|---|---|---|
| 4 | Foreigners should never enter the country. (341) | W | Works but measures immigration volume, not assimilation. |
| 4 | We should not allow any refugees. (342) | W★ | Refugee crisis now vs ideal. |
| 4 | Only our national language(s) should be spoken in our country. (343) | W | Assimilation proper. |
| 3 | Immigrants can never really adapt to our way of life. (348) | X | Empirical/prejudicial. |
| 2 | In general, immigrants are bad for the country. (351) | X | Empirical, context-dependent. |
| 1 | Illegal immigrants should be deported in most or all cases. (356) | W | Both frames. |
| 1 | Immigrants should be expected to learn the language of the country. (357) | W | Assimilation proper. |
| −1 | We should be taking in more refugees. (361) | R | Status-quo-relative. |
| −1 | I enjoy some foreign cultures. (363) | X | Taste, consensus. |
| −2 | No cultures are superior to others. (366) | X | Philosophical. |
| −4 | Anybody who wants to enter the country should be able to. (377) | W★ | Open borders now vs ideal. |
| −4 | The benefits of open borders would outweigh the costs. (378) | R | Empirical → merge with 377. |

### Planned (+) / Markets (−)
| L | Item (line) | Fit | Why / rewording |
|---|---|---|---|
| 4 | I prefer a planned economy over a free and open economy. (383) | W | De-first-person. |
| 4 | Most, if not all businesses must be owned by the government. (384) | W | Both frames. |
| 4 | The state knows best what an economy needs. (385) | R | Empirical belief. |
| 3 | Economic planning ensures maximum prosperity and growth. (388) | X | Empirical. |
| 3 | Taxation for the rich should be very high. (390) | W | Works, but off-axis (redistribution → Collectivize). |
| 2 | The government must break up monopolies to ensure fairness within the market. (394) | W★ | Conditional power; both frames. |
| 2 | The hourly minimum wage should be 15 USD or more. (395) | R | US/time-specific → "There should be a legal minimum wage set high relative to the median wage." |
| 1 | Taxation for the rich should be higher than it is now. (400) | R | Status-quo-relative — textbook case of the confound. |
| −2 | UBI is a better means of providing welfare when compared to the current welfare system. (410) | R | Comparative + status-quo; off-axis. |
| −3 | The government actively works with large corporations to destroy small businesses. (414) | X | Conspiratorial empirical claim. |
| −3 | The government should control the market as minimally as possible. (415) | W | Both frames. |
| −4 | Taxation is theft. (420) | X | Duplicate slogan. |

### Protectionist (+) / Globalist (−)
| L | Item (line) | Fit | Why / rewording |
|---|---|---|---|
| 4 | All products should be made in my country. (425) | W | Autarky; both frames. |
| 4 | Foreign products should be banned or heavily restricted from entry. (426) | W | Both frames. |
| 4 | I only buy products that are made in my country. (427) | X | Personal behaviour. |
| 3 | High tariffs are needed to protect local industries. (430) | W★ | Infant-industry (developing country now) vs ideal. |
| 3 | Without tariffs, my country's economy will likely fail. (432) | X | Country-specific empirical. |
| 2 | Export subsidies should be used for protecting local industries. (435) | W | Both frames. |
| 2 | Technical and scientific knowledge should be protected from other countries. (437) | R★ | Security-driven tech controls; good "if conditions arose" item once reworded. |
| 1 | The government should prioritize my country over all others. (440) | R | Off-axis nationalism. |
| −1 | Trade is often beneficial to both parties. (446) | X | Empirical consensus; duplicate of 104. |
| −2 | Tariffs should be lowered. (450) | R | Status-quo-relative. |
| −3 | Tariffs should be eliminated. (456) | W | Both frames. |
| −4 | Local products are often poor in quality. (462) | X | Empirical, country-dependent. |

### Technology (+) / Bioconservative (−)
| L | Item (line) | Fit | Why / rewording |
|---|---|---|---|
| 4 | If AI could rule more effectively than humans, then AI should rule. (467) | W★ | The philosopher-king question in silicon. |
| 4 | Genetic modification is a force for good, even on humans. (468) | R | Belief → "Human genetic enhancement should be permitted." |
| 4 | We should continue developing AI even if that means we are going to be replaced. (469) | W | Both frames. |
| 3 | Technological progress and innovation cannot be stopped. (472) | X | Prediction. |
| 3 | I am a transhumanist. (473) | X | Identity. |
| 3 | When people have already suffered for technology to be developed, we should use that technology. (474) | W | Ethical rule; both frames. |
| 2 | We should put effort into getting a person on Mars in the near future (477) | W | Both frames (priority depends on conditions). |
| 1 | The quality of life is generally going up decade by decade. (482) | X | Empirical. |
| −1 | Technology must be slowed down to protect the environment. (487) | W★ | Conditional ("if conditions arose") by nature. |
| −2 | I oppose human genetic modification. (492) | R | De-first-person into a policy. |
| −2 | The threat of machines taking over humanity is very real. (494) | X | Empirical; mis-keyed. |
| −4 | Traditional medicines are often more effective than modern medicines. (502) | X | False empirical claim. |
| −4 | The Internet should be banned. (503) | W | Both frames. |

Tally over the 146 rows above (one is a suggested new item): 70 W (48%), 38 R (26%), 38 X (26%). Extrapolated, roughly a quarter of the 288-item bank is unusable for a policy-preference quiz under any framing, and ~10 items are status-quo-relative and therefore only answerable in the here-and-now column.

---

## 7. Implications for 12xx2 (brief; detail belongs in the design doc)

1. Write every item as a **frame-neutral action/rule** ("The state should be able to X [when Y]") so it can be answered under both frames; ban comparatives ("more than now"), empirical claims, identity/belief items, slogans.
2. Use a **fixed, balanced** item set (equal per pole, matched extremity, no random sampling), or all items; version the bank and encode the version in the share URL.
3. Use the extremity information: either unfolding/ideal-point scoring, or at minimum don't let rejection of an extreme count as full support for the opposite pole.
4. Separate **Neutral** from **Unsure/Skip**; exclude skips from the denominator; report coverage.
5. Disentangle conflated constructs (personal faith vs church–state; immigration volume vs integration; direct vs representative democracy) and remove cross-axis duplicates (f/j, c/k, c/i, e/j).
6. If ideology matching is kept, use all axes, fix polarity, show distance/confidence (top-3 + "how close"), and author our own profiles (not Wikipedia text).
7. **Open design question for Max:** in the "ideal system" frame, is only *our* polity ideal, or the whole world? Militarism, trade, aid and borders items answer very differently in each case. Recommendation: "Your country's system is ideal; the rest of the world is as it realistically could be" — keeps "if the conditions arose" meaningful (threats can still exist).

---

## Critic addendum (completeness critic, 2026-10-31)

Not a rewrite of the sections above. Re-verification + gaps found when reading 01–05 together.

**Re-verified directly against `UP/12axes/`:** short-quiz `t=[1,2,3,5,7]` / `8-t` (`quiz.html:39,45`); sign-only scoring (`quiz.html:91,109`); `screenshotmachine.com` button (`results.html:127-128`; doc 05 §1.1 cites `:126-127`, off by one); `../12axes.html` back link (`results.html:130`); `dipl`↔`k` comparison (`results.html:263`); "Bicemeral" (`results.html:154`); 38 entries in `ideologies.js` (38 `"name"` keys). Arithmetic in §3 (60 / 62.5 for the symmetric moderate; 39 reachable short-quiz values; long range [2,98]) re-derived by hand: correct.

**Unsupported / imprecise claims here:**
- §4 "All 38 are reachable" — the method (grid search? which inputs?) is not stated; treat as UNVERIFIED until sim12.py's procedure is documented.
- §6 tally "~10 items status-quo-relative" undercounts vs doc 04 §2.1, which adds `:185, :409, :410, :497`. Union of both lists ≈ 14 lines (14, 30, 94, 158, 178, 185, 329, 361, 400, 404, 409, 410, 450, 497).

**Missing topic A — state-as-agent conflation (affects our rewrites, not just upstream).** Economic items that name the state as the actor conflate *economic egalitarianism* with *statism*. Upstream example: "The government should not regulate the economy at all." (`questions.js:250`, keyed −4 Privatize) — an anarcho-communist agrees (no government) and is scored as maximally pro-market. The rewrites proposed in §6 and doc 04 §2.3 ("The state should redistribute wealth concentrated in a few hands") reproduce this: a libertarian-socialist/anarchist will disagree with *state* redistribution while wanting the outcome. Design rule needed: on Economy/Control items, separate the *outcome/ownership* question ("Wealth should not be allowed to concentrate in a few hands") from the *agent/means* question (who does it), and put agent/means on the Power/Structure axes. Otherwise the anarchist quadrant is unreachable, which doc 04 §3 rows 2, 6 need.

**Missing topic B — which "12axes" are users expecting?** Max's request refers to "a recent popular … survey called 12axes" = 12axes.vercel.app (doc 02), whose axis labels differ from MIT's (Intervention re-poled; "Morality" vs "Culture"; Public/Private vs Collectivize/Privatize — doc 02 §3). Docs 01–03 assume the MIT axis set. Decision for design: adopt MIT axis *concepts* (licence-clean), but the results page should include a one-line crosswalk to the vercel names so viral-wave users recognise their axes. Do not adopt vercel's re-poled Intervention (doc 02 §3: r = −0.87 with Diplomacy).

**Missing topic C — "12" is a product constraint, not a measurement fact.** Docs 01 §5C/D and 03 §5 recommend merging f/j and c/k and splitting Religion and Immigration. Doing all of that changes the axis count. The design phase must choose explicitly between (i) keep 12 named axes but redefine each to one construct (e.g. Religion = church–state only; Immigration = integration model, volume moved to a sub-facet), grouped under 3 super-dimensions; or (ii) change the count and the name. Rec: (i) — it keeps the brand and the doc 03 §12 "facets" framing honest.

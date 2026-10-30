# 04 — Ideal vs non-ideal theory: grounding and design guidance for 12 Axes²

Status: research input for the 12xx2 scoring/question design. Written 2026-10-31.

Evidence tags used throughout:
- **[V]**: verified this session against the fetched primary source.
- **[S]**: verified this session from search-result snippets or secondary sources. The claim is solid, but exact wording and page numbers come from the secondary source.
- **[K]**: from background knowledge. **UNVERIFIED** this session. Check before quoting it in UI or marketing copy.

---

## 0. TL;DR

1. The user's grid (Here and now × Ideal system) matches a central distinction in contemporary political philosophy. That distinction comes from Rawls: *ideal theory* assumes strict compliance and reasonably favourable conditions, and *non-ideal theory* handles partial compliance, unfavourable conditions and transition. The literature is large and well developed. The design is grounded in it and not ad hoc.
2. The user's framing of "ideal" is close to Rawls's **realistic utopia**: "men as they are and laws as they might be". It is **not** a world without problems. Rawls's ideal theory keeps the Humean *circumstances of justice* (moderate scarcity, conflicting interests) [K]. The quiz must say this explicitly. Otherwise every remedial item collapses to "never needed" in the ideal frame.
3. Economics adds a warning (Lipsey & Lancaster 1956, second best). Moving one dimension toward its ideal value while others stay non-ideal can make things worse. Off-diagonal answers are therefore **not inconsistency or hypocrisy**, and the UI must never label them that way.
4. The grid bundles three things that Valentini separates: compliance, feasibility and transition. One cheap fix is an optional "why?" chip on off-diagonal answers (emergency / not ready yet / can't trust the current government / fixing past wrongs / the other side would abuse it). It makes the gap self-explained instead of inferred.
5. Meaningful derived measures:
   - per-axis signed gap (Now − Ideal);
   - item-level divergence magnitude, measured against a noise floor;
   - within-axis gap coherence;
   - a short **System Confidence** block (rule of law, voice, exit, legitimation);
   - an optional **status-quo slider** per axis. With it, gap *direction* can be typed as reformist, corrective-overshoot, status-quo-holding or counter-directional (second-best).
6. Ideologies have separate ideal and transitional programmes. 16 worked examples are in §3. They justify storing **two 12-vectors per ideology** and matching on the joint 24-vector. Example: Marxism-Leninism and anarcho-communism share an ideal but have opposite transitions. Only the joint vector separates them.
7. With no backend and no telemetry there are no population norms. Every interpretive threshold must be defined in advance and disclosed. Never claim "you are more X than 80% of people".

---

## 1. Literature grounding

### 1.1 Rawls: ideal vs non-ideal theory

- *A Theory of Justice* (1971) defines ideal theory as **strict-compliance theory**: everyone acts justly and upholds just institutions. It defines non-ideal theory by negation. Non-ideal theory splits into **partial-compliance theory** (how to respond to injustice: punishment, civil disobedience, just war, compensatory justice) and **transitional theory** for unfavourable natural or historical conditions. TJ §2 and §39 [S: https://kantinternational.blogspot.com/2010/06/rawls-on-ideal-and-non-ideal-theory-i.html ; https://philarchive.org/archive/FULBSA-2].
- The second ideal condition is **reasonably favourable conditions**: enough material and cultural resources for just institutions to be possible. *The Law of Peoples* (1999) makes the non-ideal part explicit with **"outlaw states"** (deliberate non-compliance) and **"burdened societies"** (historical, social or economic circumstances make just institutions hard to establish) [S: https://philarchive.org/archive/FULBSA-2].
- Rawls says ideal theory is prior because it supplies the *target* that non-ideal theory steers toward [S]. Whether the target is actually needed is disputed; see Sen below.
- **Realistic utopia.** *The Law of Peoples* opens with Rousseau's formula: take "men as they are and laws as they might be" [K: LoP §1, p. 7, UNVERIFIED page]. This is the user's "ideal system" almost word for word. Institutions are as good as they could be. People are ordinary.
- **Circumstances of justice.** TJ §22 (after Hume) says justice is needed only under moderate scarcity and conflicting claims [K]. An ideal society in Rawls's sense still has disputes, accidents, recessions and wealth concentration. It deals with them through good rules. This is the textual warrant for the user's point that the ideal is "a working system, and we ask whether it would ever do X if the conditions arose".
- Simmons ("Ideal and Nonideal Theory", *Philosophy & Public Affairs* 38(1):5–36, 2010) defends the priority of ideal theory. He distinguishes kinds of non-ideal condition, such as burdened societies vs outlaw states [S: https://dc2.philarchive.org/rec/SIMIAN]. His exact taxonomy is [K, UNVERIFIED].

### 1.2 Sen: transcendental vs comparative

- Sen, "What Do We Want from a Theory of Justice?", *J. Phil.* 103(5):215–238 (2006), and *The Idea of Justice* (2009). He attacks **"transcendental institutionalism"**, the search for perfectly just institutions, and proposes a **comparative** approach that ranks feasible alternatives [S: https://www.politics.ox.ac.uk/sites/default/files/inline-files/SJ011_Valentini_ParadigmShiftinTheorising.pdf].
- Core claims:
  - Knowing the perfect society is **neither sufficient** for comparative judgements (they are not automatically derivable from it) **nor necessary** (we can rank Picasso over Dalí without knowing the ideal painting, the Mona Lisa) [S for sufficiency; K for the Mona Lisa analogy].
  - Reasonable people may hold several defensible ideals, so a single transcendental answer may not exist [K].
- **Design implication.** "Here and now" answers are *comparative* judgements about real options and are fully legitimate without a coherent ideal. Some respondents (Sen-ian comparativists, Burkeans, Popperians) will reject the ideal frame or be unsure in it. Allow an explicit "no view / depends" in the ideal frame. Do not force a value.

### 1.3 Charles Mills: "Ideal Theory as Ideology"

- *Hypatia* 20(3):165–184 (2005) [S: https://www.cambridge.org/core/journals/hypatia/article/ideal-theory-as-ideology/A75BA915A4A78F6AE67FA99036C4FC10]. Mills distinguishes *idealisation* (abstracting away from oppression) from *abstraction*, which is harmless. He argues that idealised theory treats the perspective of the advantaged as universal and pushes existing structural injustice (race, gender, class) out of view [S].
- **Design implications:**
  - (a) Never present the Ideal answer as the respondent's "true" politics and the Now answer as a "compromise". Both are co-equal outputs.
  - (b) For respondents in unjust conditions, the Now column may be *the* morally central one.
  - (c) The ideal stipulation ("best realistic starting point") must not quietly assume away history in a way that makes rectification items trivially "no". Ask whether the good system *would* rectify if wrongs occurred within it. That is the user's "if the conditions arose" framing.

### 1.4 Valentini's conceptual map

- Valentini, "Ideal vs. Non-ideal Theory: A Conceptual Map", *Philosophy Compass* 7(9):654–664 (2012), DOI 10.1111/j.1747-9991.2012.00500.x [S: https://philarchive.org/rec/VALIVN-2]. She separates three distinctions that the literature runs together:
  1. **full compliance vs partial compliance**;
  2. **utopian vs realistic**: should feasibility constrain the theory?;
  3. **end-state vs transitional**: describe the goal, or how to improve from here?
- **Mapping to 12 Axes².** The Ideal frame = full compliance + realistic (human nature fixed, no fantasy resources) + end-state. The Now frame = partial compliance + realistic + transitional. The grid therefore **crosses all three at once**, and a single gap cannot say which one drove it. Mitigation: the optional reason chips (§2.4) roughly map onto them: "can't trust current government" → compliance; "not ready / prerequisites missing" → feasibility; "step toward the goal" → transition; "emergency" → circumstances.
- Related work:
  - Gilabert & Lawford-Smith on **feasibility**: binary vs scalar; *Political Studies* 60(4):809–825 (2012) [S: https://ideas.repec.org/a/bla/polstu/v60y2012i4p809-825.html].
  - Estlund, "Utopophobia", *PPA* 42(2):113–134 (2014), and the 2019 book. "Ought implies can" does not license "won't implies can't". An ideal standard is not defective merely because people predictably won't meet it [S: https://philarchive.org/archive/ESTHNA-2].
  - **Implication of Estlund:** the ideal frame may legitimately be demanding. It assumes institutions *work*. It does not assume people are saints.

### 1.5 Bernard Williams: realism and the Basic Legitimation Demand

- *In the Beginning Was the Deed* (2005, posthumous). Williams contrasts **political moralism** (politics as applied ethics) with **political realism** [S: https://moodle.ruhr-uni-bochum.de/pluginfile.php/1022450/mod_resource/content/1/Matt%20Sleat_B_Williams%20and%20the%20Possibility%20of%20Realsit%20Political%20Theory.pdf].
- **First political question:** securing "order, protection, safety, trust, and the conditions of cooperation". It is first because solving it is the condition of posing any other question, and it has to be re-answered continually [S: secondary quotations of IBWD pp. 3–5].
- **Basic Legitimation Demand (BLD):** a state must offer a justification of its power to *each* person subject to it. A state that merely dominates is "part of the problem", not a solution. The BLD is not a morality prior to politics. Slogan: "BLD + Modernity = Liberalism" [S: same sources; https://core.ac.uk/download/42152358.pdf].
- **Design implications:**
  - (a) The Ideal frame should be defined by legitimacy in Williams's thin sense: the system can explain itself acceptably to those it governs. It should not be defined by any one ideology's thick conception of justice. This keeps the frame neutral between a liberal, a theocrat and a socialist. Each imagines *their* working, accepted system.
  - (b) The System Confidence block should include a BLD-style item.
  - (c) Realism predicts that low-legitimacy contexts push Now answers toward "first question" goods: order and security first.

### 1.6 Lipsey & Lancaster: the theory of the second best

- "The General Theory of Second Best", *Review of Economic Studies* 24(1):11–32 (1956), DOI 10.2307/2296233 [S: https://www.encyclopedia.com/social-sciences/applied-and-social-sciences-magazines/theory-second-best]. If one optimality condition cannot be met, it is **in general no longer optimal to satisfy the others**. **Nothing can be inferred a priori** about the direction or size of the second-best deviations [S].
- Political translation (Goodin; Wiens; Brennan & Pettit apply it to institutional design) [K, UNVERIFIED specific cites]:
  - moving partway toward the ideal on one axis while others remain non-ideal can be worse than staying put;
  - the best non-ideal policy can lie on the *opposite side* of the status quo from the ideal.
  - Examples:
    - open borders + generous welfare state (one libertarian argument for restriction now);
    - unilateral disarmament in an armed world;
    - free trade before domestic industry exists (List).
- **Design implications:**
  - (a) Off-diagonal answers are exactly what second-best theory predicts of a thoughtful respondent. Never score them as incoherence.
  - (b) The gap-direction typology (§2.3) needs a "counter-directional" category, where Now moves away from both the status quo and the ideal.
  - (c) There is no license to assume "closer to ideal is better".

### 1.7 Transitional programmes: the canonical political examples

- **Marx, *Critique of the Gotha Programme* (1875)** [V: https://www.marxists.org/archive/marx/works/1875/gotha/ch01.htm, ch04.htm]:
  - the *first phase* of communism is "still stamped with the birthmarks of the old society from whose womb it emerges";
  - "In a higher phase of communist society … From each according to his ability, to each according to his needs!";
  - "Right can never be higher than the economic structure of society and its cultural development conditioned thereby";
  - "Between capitalist and communist society there lies the period of the revolutionary transformation of the one into the other. Corresponding to this is also a political transition period in which the state can be nothing but *the revolutionary dictatorship of the proletariat*."
  - This is the textbook case of an ideology carrying different positions in its ideal and in its transition.
- **Lenin, *The State and Revolution* (1917), ch. 5 "The Economic Basis of the Withering Away of the State"** argues that a special transitional phase must exist between capitalism and communism, and that the transitional state is one that is withering away [S: https://www.marxists.org/archive/lenin/works/1917/staterev/ch05.htm].
  - Practice diverged. The New Economic Policy (1921) is a market retreat inside the transition, which is second best in action [K].
- **Trotsky, *The Transitional Program* (1938).** Social democracy had a "minimum programme" (reforms) and a "maximum programme" (socialism) with "no bridge" between them. Transitional demands are meant to be that bridge [S: https://www.marxists.org/francais/trotsky/livres/trans/tran3.html ; https://en.wikipedia.org/wiki/The_Transitional_Program].
- **Rothbard: abolitionism vs gradualism.** The abolitionist "would blister his thumb pushing a button that would abolish the State immediately", but knows no such button exists. So he "will take a bit of the loaf if necessary". Transitional demands, such as a 50% tax cut, are legitimate "way stations" as long as they don't imply that the next step would be improper. "Abolitionist in theory, gradualist in practice if necessary" [S: https://mises.org/mises-wire/we-must-be-opportunists-dismantling-state ; https://mises.org/mises-wire/gradualism-or-abolitionism]. **Minarchism is commonly argued as the transitional stage to anarcho-capitalism** [S: Rothbard lists "anarcho-capitalism vs. limited government" as a live dispute].
- **Nozick, *Anarchy, State, and Utopia* (1974).** Ideal: the minimal state. But the *principle of rectification* means "past injustices might be so great as to make necessary in the short run a more extensive state in order to rectify them" [K: ASU p. 231, UNVERIFIED page/wording]. A libertarian ideal can coexist with redistribution as rectification now.
- **Burke, *Reflections on the Revolution in France* (1790):** "A State without the means of some change is without the means of its conservation" [S: 1793 printing p. 29, via https://en.wikipedia.org/wiki/Reflections_on_the_Revolution_in_France and search snippet]. Burke's gradualism distrusts blueprint ideals. The Burkean expectation is Ideal ≈ Now ≈ (status quo + careful repair).
- **Popper, piecemeal vs utopian social engineering.** *The Open Society and Its Enemies* (1945) vol. 1 ch. 9; *The Poverty of Historicism* (1957). Fight concrete evils step by step and avoid holistic blueprints; their errors are uncorrectable and their transitions breed tyranny [S: https://en.wikipedia.org/wiki/The_Open_Society_and_Its_Enemies; pp. 162–163 / 58–59 per secondary, UNVERIFIED].
- **Bernstein, *Evolutionary Socialism* (1899):** "the final goal … is nothing to me, the movement is everything" [K, UNVERIFIED wording]. This collapses the ideal into the transition, which is the founding move of revisionist social democracy.
- **Sun Yat-sen, *Fundamentals of National Reconstruction* (1924)** codifies three explicit stages: military government → political tutelage → constitutional democracy [K]. It is an unusually explicit transitional programme on the Democratic/Autocratic axis.
- **Friedrich List, *National System of Political Economy* (1841)**, following Hamilton's *Report on Manufactures* (1791): infant-industry protection *now* and free trade *eventually*, once industries mature [K]. This is second best on the Globalist/Protectionist axis.

### 1.8 Emergency powers: the canonical "only in non-ideal conditions" measures

- **Roman dictatorship.** The dictator *rei gerundae causa* was a constitutional office for war, sedition or crisis. He was expected to resign when the task was done or after **six months**, whichever came first. The six-month limit was never legally exceeded before Sulla [S: https://en.wikisource.org/wiki/1911_Encyclop%C3%A6dia_Britannica/Dictator].
  - **Key point for the user's framing:** this emergency power belonged to a *functioning republic's* design. A good system can contain a bounded exception mechanism.
- **Schmitt.**
  - *Dictatorship* (1921) distinguishes **commissarial** dictatorship, which suspends law to restore the existing order, from **sovereign** dictatorship, which suspends it to create a new order [S: https://cambridge.org/core/journals/canadian-journal-of-law-and-jurisprudence/article/abs/dilemmas-of-dictatorship-carl-schmitt-and-constitutional-emergency-powers/BA22E752F9FA9394910E28F636B7D2A3].
  - *Political Theology* (1922) opens: "Sovereign is he who decides on the exception" [S].
- **Constitutional dictatorship and the emergency constitution.**
  - Rossiter, *Constitutional Dictatorship* (1948), set conditions for crisis government in democracies [K].
  - Ackerman, "The Emergency Constitution", 113 *Yale L.J.* 1029 (2004), proposes a "supermajoritarian escalator": emergency powers expire unless renewed by increasing legislative supermajorities [K].
- **Design implication: this is the clearest case for the user's ideal definition.**
  - An *ideal* system would, per most respondents, have bounded, commissarial-style emergency powers. Sunsets, purpose limits and legislative renewal are design features of good systems.
  - Sovereign-dictatorship-style measures (suspend elections indefinitely, rule by decree to remake society) are where Ideal and Now should most often split.
  - **Items should write the bounds into the wording** ("for at most six months, renewable only by parliament") so the two kinds can be told apart. If not, Liberty/Security and Democratic/Autocratic answers mix respondents with very different views.

### 1.9 Legitimacy and whether problems can be fixed within the existing legal framework

- **Hirschman, *Exit, Voice, and Loyalty* (1970)**: decline in firms, organisations and states draws two responses, *exit* (leave) and *voice* (push for change from inside). *Loyalty* slows exit and gives voice time to work. Easy exit can undercut voice; Hirschman later qualified this [S: https://en.wikipedia.org/wiki/Exit,_Voice,_and_Loyalty].
  - **Mapping to the user's "soluble within the existing legal framework":** this is the *efficacy of voice*.
  - Where voice works (Denmark), extraordinary measures are rarely needed now.
  - Where voice is blocked (Iran), people turn to exit (emigration) or extra-legal remedies. Remedial items then become reasonable *now*.
- **Acemoglu & Robinson, *Why Nations Fail* (2012)**:
  - **extractive** institutions steer rents to a narrow elite; **inclusive** ones spread political voice and economic opportunity;
  - extractive economic and political institutions reinforce each other;
  - change tends to come at "critical junctures" [S: https://en.wikipedia.org/wiki/Why_Nations_Fail ; https://www.cato.org/regulation/spring-2013/book-review-why-nations-fail].
  - This explains the user's Iran/Denmark intuition. Redistributing wealth held by the elites of an *extractive* order differs in kind from redistributing within an *inclusive* one. In the first case the wealth *is* the political problem.
- **Measures of system quality** (these support an optional context panel; never use them to *score* respondents):
  - **Transparency International CPI 2025** (released Feb 2026): Denmark 89/100 (1st for the 8th year), Iran 23/100 (rank reported as 151 or 153 depending on source) [S: https://en.wikipedia.org/wiki/List_of_countries_by_Corruption_Perceptions_Index]. CPI measures *perceived public-sector corruption* (expert/business surveys). It does not measure rule of law or democracy.
  - **WJP Rule of Law Index 2025**: Denmark ranks 1st [S: https://worldjusticeproject.org/rule-of-law-index/downloads/WJPIndex2025.pdf]. Iran was 128/142 in 2024 [S: https://worldjusticeproject.org/sites/default/files/documents/Iran_2.pdf]; its 2025 rank is UNVERIFIED. There are 8 factors, including *Constraints on Government Powers* and *Absence of Corruption* [S]. These are the closest operationalisation of "soluble within the legal framework".
  - **V-Dem**: Liberal Democracy Index `v2x_libdem` (0–1, higher = more democratic). The Political Corruption Index `v2x_corr` runs the *other* way (higher = more corrupt) and combines executive, legislative, judicial and public-sector corruption. Both are expert-coded [S: https://ourworldindata.org/grapher/liberal-democracy ; https://archive.ourworldindata.org/20250801-110809/grapher/political-corruption-index.html].
  - Licensing for bundling these datasets in a static site: **UNVERIFIED** (V-Dem is believed CC BY-SA; CPI and WJP terms not checked). Check before shipping any embedded country table. Linking out is safe.

### 1.10 Survey science relevant to a two-frame grid

- **Converse (1964)**, "The Nature of Belief Systems in Mass Publics": low *constraint* across issues in mass publics, and high over-time **response instability** ("non-attitudes") [S: https://adambrown.info/p/notes/converse_the_nature_of_belief_systems_in_mass_publics].
- **Zaller (1992)**: answers sample whichever considerations are salient at the moment (RAS model) [S: https://adambrown.info/p/notes/zaller_the_nature_and_origins_of_mass_opinion].
- **Implication:** part of any Now≠Ideal difference is noise. The quiz must estimate a noise floor before calling someone "situational".
- **Difference scores are less reliable than their components**, especially when the components are highly correlated. Lord (1956); Cronbach & Furby, "How we should measure 'change' — or should we?", *Psych. Bull.* 74(1), 1970 [K]. Per-axis gaps therefore need item aggregation and conservative display thresholds.

---

## 2. Design guidance for 12 Axes²

### 2.1 Respondent-facing definitions

**Ideal system** (paragraph):
> Picture a country whose system already works. Courts are honest. Officials mostly follow the rules. Decisions are made through institutions, not by one wise ruler. The people living under it broadly accept it as legitimate by their own lights. It starts from the best realistic position, but its people are ordinary humans: self-interested, sometimes wrong, often in disagreement. Bad things still happen there: recessions, wars, pandemics, new technologies, fortunes that grow very large. For each statement, ask: **would a system like that ever do this, as a standing rule or as something it does when the conditions arise?**

**Ideal system** (one sentence):
> A well-run, legitimate system with ordinary people and real problems: would it ever do this if the situation called for it?

**Here and now** (paragraph):
> Now think about your actual country (or the one whose politics you care about most), as it is today: its real institutions, leaders, laws, corruption, history and current problems. For each statement, ask: **should this be done or allowed there, now, all things considered?** Take into account who would actually be carrying it out, whether it would work, and what it would cost.

**Here and now** (one sentence):
> Your country as it actually is: should this happen there now, given who would really be doing it?

Notes on the wording:
- **"would ever do this … if the conditions arose"** is the guard against the utopia trap. "Ideal" does not mean "no problems". It means "best response when problems occur". This is directly backed by Rawls's circumstances of justice and the Roman and Ackerman emergency-constitution examples (§1.1, §1.8).
- **"not by one wise ruler"** implements the user's no-philosopher-king stipulation. **Design tension:** the stipulation moves Democratic/Autocratic ideal answers toward non-personal rule. It must not rule out *non-democratic institutional* designs (epistocracy, technocratic councils, theocratic councils, one-party institutional rule). Otherwise the ideal Dem/Aut axis is decided by definition. Keep "institutions, not a single ruler" and stay silent about *which* institutions. List this in the criticisms doc as a deliberate, disclosed stipulation.
- **"broadly accept it as legitimate by their own lights"** is Williams's thin BLD. It keeps the frame ideology-neutral, so a theocrat, a socialist and a libertarian each imagine their own working system.
- **"ordinary humans"** is Rawls/Rousseau realistic utopia. It stops respondents from answering "no state needed because everyone is good". Respondents can still choose the anarchist poles; they just must do so for ordinary humans.
- **Grid quadrant hints** (respondent-facing, small text):
  - top-right (agree in both): "Yes, in any decent system";
  - bottom-left (disagree in both): "No, never";
  - ideal-yes / now-no: "In principle, but not here, not yet";
  - now-yes / ideal-no: "Only because things are broken here".
- **Item-writing rule (important).** The original 12axes has status-quo-relative (deictic) wording, which is undefined in the ideal frame. Examples, all in `/tmp/claude-1000/-home-xertrov-src-12x2/6f22d232-cf93-470e-949f-6728e7611f5a/scratchpad/upstream/pt-site/12axes/questions.js`:
  - :14 "Local governments should have more power than they currently do";
  - :158 "My country spends too much money on the military";
  - :400 "Taxation for the rich should be higher than it is now";
  - :409 "Currently, taxation is too complex…";
  - :410 "…compared to the current welfare system";
  - :497 "Society was better many years ago than it is now";
  - :185 "…necessary in the modern world".
  
  Rewrite every item as either
  - a **standing rule** ("Religious leaders should have a formal role in making law"), or
  - a **condition → action** pair ("If a small group comes to own most of the wealth, the state should redistribute it").
  
  Never write "more than now", "too much", "currently".
- **Bound emergency items** with explicit limits on time, purpose and renewal, so commissarial and sovereign exceptions can be told apart (§1.8).
- **Defaults:** put the grid cursor at the centre (neutral/neutral), not on the diagonal. A diagonal default nudges respondents toward consistency, and the 2-D format itself may push them to exaggerate difference. Let users click the "same in both" diagonal with one tap: a keyboard shortcut, or a "same answer" toggle per item. Do not preselect it.
- Allow **"no view"** separately per frame (Sen: an ideal answer may be indeterminate).

### 2.2 Derived measures

Notation:
- each item *i* has axis *a(i)* and polarity *w_i* ∈ {−1,+1}, plus a strength weight if the scoring doc adopts one;
- responses r_{i,N} (Now) and r_{i,I} (Ideal) on −2…+2;
- Δ_i = r_{i,N} − r_{i,I}.

**(a) Two axis profiles.** Score Ideal and Now separately with the same algorithm (defined in the scoring doc): S_I(a), S_N(a) ∈ [−1,1]. Present both as first-class results: "Your principles" and "Your programme for here and now".

**(b) Per-axis signed gap** G(a) = S_N(a) − S_I(a) ∈ [−2,2]. Label it neutrally: "Here and now pulls you toward **Security** (+0.31)". Never use "hypocrisy", "inconsistent" or "compromise" (Lipsey–Lancaster, §1.6; Mills, §1.3).

**(c) Item-level divergence (Context-sensitivity / "Situationalism").**
- D = mean_i |Δ_i| / 4 ∈ [0,1]. Its complement is **Constancy**. Prefer the neutral pair *Constancy ↔ Context-sensitivity* to "principled ↔ situational", which carries a value judgement.
- **Noise floor:** put 3–4 *repeat items* (same item, reworded, far apart in the run) into the quiz. Estimate the respondent's own instability as σ = mean |r_first − r_repeat| / 4 per frame. Report D_adj = max(0, D − σ̄). If D_adj is about 0, say "your differences are within your own answer-to-answer variation" (Converse/Zaller, §1.10).

**(d) Within-axis coherence.** C(a) = |Σ_{i∈a} w_i Δ_i| / Σ_{i∈a} |Δ_i| ∈ [0,1]. High C means the axis's item gaps point one way, so the axis gap is meaningful. Low C with high Σ|Δ| means large gaps that cancel, so the respondent is context-sensitive item by item and not axis-wide. Show the axis gap arrow only when C(a) ≥ 0.5 **and** |G(a)| ≥ 0.15 **and** at least 2 items agree in sign. These thresholds are fixed in advance and disclosed (difference-score reliability, §1.10).

**(e) System Confidence (SC): the calibration block.** About 6 short items, answered once, about the respondent's own country, mean-scored to [0,1]. The block calibrates interpretation. It is never added to axis scores.
1. Courts here treat powerful people and ordinary people the same. (rule of law, WJP-style)
2. Officials here mostly do their jobs without needing bribes or connections. (corruption, CPI-style)
3. When something is seriously wrong here, it can be fixed through legal channels: courts, elections, press, petitions. (**Hirschman voice**; the user's "soluble within the existing legal framework")
4. Elections here can remove the people in charge. (V-Dem electoral component)
5. The people who govern here can give a justification for their power that most people subject to it could accept. (**Williams BLD**)
6. If things got bad enough, I would rather leave than try to change things. (**Hirschman exit**; reverse-keyed; report separately as an exit-propensity flag as well)

**(f) SC × D interpretive map.** A 2-D plot with a-priori quadrant labels, theory-defined because there are no norms:
- High SC, low D: **Settled**. The system works, and practice matches principle.
- Low SC, high D: **Realist reformer**. The system is broken here, so the medicine differs (the Iran case).
- High SC, high D: **Transitional**. The system works, but the respondent still wants a different path now than the end state (the Bernstein/Popper/Rothbard-gradualist case).
- Low SC, low D: **Purist**. Ideal norms applied regardless of conditions (*fiat justitia*; the stance Mills criticises).

Stated hypothesis, shown as theory and not as a norm: lower SC predicts larger D on remedial items. Never print percentiles.

**(g) Gap direction typology** (needs an optional status-quo input). Add one quick slider per axis: "Where is your country *now* on this axis?" (12 inputs, about 40 s). This gives Q(a). Then for axes with a shown gap:
- **Reformist** (Burke/Popper): S_N lies between Q and S_I. Move toward the ideal, but less far.
- **Corrective overshoot** (rectification, affirmative action, Nozick's rectification): S_N lies beyond S_I on the far side from Q. Temporary over-correction.
- **Holding** (conservative of the current order): S_N ≈ Q while S_I is far from Q. "Not now; stability first."
- **Counter-directional / second-best** (Lipsey–Lancaster, the Leninist state, infant-industry protection): S_N moves away from both Q and S_I.
- **Settled**: Q ≈ S_N ≈ S_I.

Without the status-quo sliders, show only the signed gap. Do not infer the type.

**(h) Reason chips (strongly recommended).** When |Δ_i| ≥ 2, offer an optional one-tap "why the difference?":
- *emergency / crisis here*
- *not ready yet: prerequisites missing*
- *can't trust the people currently in charge*
- *fixing past wrongs*
- *a step toward the goal*
- *the other side would abuse it*
- *other*

These map onto Valentini's three distinctions (§1.4), the second-best and transitional logics (§1.6–1.7) and emergency (§1.8). Aggregate them into a "Your reasons" bar (e.g., "Most of your differences: *can't trust current government*"). It is highly shareable, and the respondent's own testimony stands behind it. That is the most defensible way to interpret a gap.

**(i) Ideology matching on three vectors.** Match S_I against ideology *ideal* vectors, S_N against ideology *transitional* vectors, and the joint 24-vector against joint profiles. Headline result: "Ideal: Anarcho-Communist · Programme: Marxist-Leninist", or a joint label when one profile wins both. §3 shows why the joint vector carries real information.
- Disclose that transitional vectors are specified for a reference context ("a present-day developed liberal democracy").
- Show a caveat when SC is low: "ideology programmes were written for a different starting point than yours".

### 2.3 Worked example (the user's redistribution case)

Item: "If a small group comes to hold most of the country's wealth, the state should take steps to redistribute it."
- **Iran-based respondent**, SC ≈ 0.15 (voice blocked; elite wealth is entangled with state power, an extractive institution in Acemoglu–Robinson's sense). Now = +2, Ideal = +1. Δ = +1, chip "can't trust the people currently in charge". Collectivize gap reads as remedial; the SC × D map gives *Realist reformer*.
- **Denmark-based respondent with the same ideals**, SC ≈ 0.85 (CPI 89; WJP #1). Now = 0, Ideal = +1. Δ = −1, or Δ = 0 if they judge that concentration has not happened. Map: *Settled*.
- Same principles, different necessity. The two-frame design is built to capture exactly this difference, and a single-frame quiz would score the two respondents differently on "Collectivize" for reasons that have nothing to do with their values.

---

## 3. Ideologies with distinct ideal vs transitional positions

The axes are written by pole name. "Now → X" means the transitional or here-and-now programme sits further toward pole X than the ideal does. Mechanism codes: **P** prerequisite-building, **E** emergency/defence, **2B** second-best compensation, **R** rectification, **T** tactical/coalitional, **D** distrust of current agents.

| # | Ideology | Ideal (end-state) source | Axes where Now ≠ Ideal (direction) | Mech. | Evidence |
|---|---|---|---|---|---|
| 1 | **Marxism-Leninism** | Higher-phase communism: stateless, classless | Fed/Uni: Now → **Unitary** (democratic centralism). Dem/Aut: Now → **Autocratic** (dictatorship of the proletariat). Lib/Sec: Now → **Security** (Cheka). Mil/Pac: Now → **Militarist** (revolutionary defence). Int/Nat: Now → **Nationalist** (Stalin's "socialism in one country", 1924). Glob/Prot: Now → **Protectionist** (state foreign-trade monopoly). Plan/Mkt: briefly → **Markets** (NEP 1921), then Planned. | P, E, 2B | Marx Gotha IV [V]; Lenin S&R ch5 [S]; NEP / socialism in one country [K] |
| 2 | **Anarcho-communism** | Same stateless communism as #1 | Ideal ≈ Now on most axes (rejects a transitional state; Bakunin vs Marx). Main gap: Mil/Pac: Now → **Militarist** (revolutionary militias, e.g., Spain 1936). | E | [K] |
| 3 | **Trotskyism** | Communism | Like #1, except Int/Nat: Now stays **Internationalist** (permanent revolution vs socialism in one country), and Dem/Aut: Now less autocratic than Stalinism (soviet democracy; disputed in practice) | P | Transitional Program [S]; [K] |
| 4 | **Revisionist social democracy** | Originally socialism (Collectivize, Planned) | Plan/Mkt: Now → **Markets** (regulated). Coll/Priv: Now → **Privatize** (mixed economy + redistribution). Democratic in both. In modern Nordic form Ideal ≈ Now ("the movement is everything"). | P, T | Bernstein 1899 [K] |
| 5 | **Democratic socialism** | Worker or social ownership | Coll/Priv and Plan/Mkt: Now → **Privatize/Markets** (reforms within capitalism); Democratic in both | P | Trotsky's minimum/maximum framing [S] |
| 6 | **Anarcho-capitalism via minarchism** (Rothbardian gradualist) | Stateless polycentric law and private defence | Fed/Uni: Now → **Unitary** (the minimal state keeps courts, police and defence). Lib/Sec: Now → **Security**. Mil/Pac: Now → **Militarist** (national defence retained). Coll/Priv: Now slightly → **Collectivize** (interim taxation, "a bit of the loaf"). | T, P | Rothbard [S] |
| 7 | **Hoppean paleolibertarian** | Private-property anarchy with free association | Int/Nat and Mul/Ass: Now → **Nationalist/Assimilationist** (restrict immigration while a welfare state and public property exist: "forced integration") | 2B | Hoppe 1998 [K, UNVERIFIED] |
| 8 | **Nozickian libertarianism** | Minimal state, entitlement theory | Coll/Priv: Now → **Collectivize** (rectification of past injustice may require a "more extensive state" in the short run) | R | ASU p. 231 [K, UNVERIFIED page] |
| 9 | **Liberal egalitarian with temporary affirmative action** | Colour-blind equal opportunity | Prog/Trad: Now → **Progressive**. Mul/Ass: Now → **Multicultural** (group-conscious remedies). The item mapping is imperfect (see criticism below). | R | O'Connor in *Grutter v. Bollinger* (2003): "We expect that 25 years from now, the use of racial preferences will no longer be necessary…" [K, UNVERIFIED exact wording] |
| 10 | **Sun Yat-sen Three Principles / political tutelage** (also Kemalist single-party modernisation) | Constitutional democracy | Dem/Aut: Now → **Autocratic** (military rule → tutelage). Fed/Uni: Now → **Unitary**. Kemalism adds Irr/Rel: Now → **Irreligious** (enforced laïcité) and Mul/Ass: Now → **Assimilationist**. | P | Fundamentals of National Reconstruction (1924) [K] |
| 11 | **"Primary stage of socialism"** (post-1978 CCP) | Communism | Plan/Mkt: Now → **Markets**. Glob/Prot: Now → **Globalist** (opening up, WTO 2001). Coll/Priv: Now → **Privatize**. Dem/Aut: **Autocratic** in both (Now more so). | P, 2B | CCP 13th Congress 1987 [K] |
| 12 | **Listian / Hamiltonian developmentalism** | Free trade among mature economies | Glob/Prot: Now → **Protectionist** (infant industry). Plan/Mkt: Now → **Planned** (industrial policy). | P, 2B | List 1841; Hamilton 1791 [K] |
| 13 | **Kantian liberal internationalism and nuclear deterrence** | Perpetual peace, federation of free states, no standing armies "in time" | Mil/Pac: Now → **Militarist** (deterrence, alliances). Int/Nat: Now → **Nationalist** (sovereign defence until a federation exists). Cf. NPT Art. VI disarmament "in good faith" while arsenals remain. | 2B, E | Kant 1795 prelim. art. 3 [K]; NPT [K] |
| 14 | **Left accelerationism** | Post-work, fully automated, collectively owned abundance | Plan/Mkt: Now → **Markets** (use capitalism's productive dynamism). Glob/Prot: Now → **Globalist**. Tech/Bio: max **Technology** in both. Coll/Priv: Now → **Privatize** (platforms repurposed, not abolished). | P | #Accelerate Manifesto, Srnicek & Williams 2013 [S: https://www.publicbooks.org/on-accelerationism/] |
| 15 | **Eco-socialism / degrowth** | Decentralised, low-throughput, localist economy | Fed/Uni: Now → **Unitary** (central climate mobilisation). Plan/Mkt: Now → **Planned**. Tech/Bio: Now → **Technology** (rapid build-out of renewables and storage) vs a more bioconservative ideal. | E, P | [K] |
| 16 | **Burkean conservatism** | Deliberately underspecified; inherited order, improved | Small gaps on all axes. Now tracks the status quo (Holding/Reformist types, §2.2g). The signature is *low D* together with Q ≈ S_N. | — | Burke 1790 [S] |
| 17 | **Neoreaction (Yarvin)** | "Patchwork" of competing sovereign corporations with exit | Fed/Uni: Ideal → **Federal** (patchwork) but Now → **Unitary** (consolidate executive power first). Dem/Aut: **Autocratic** in both. | T | [K, UNVERIFIED characterisation] |
| 18 | **Interwar Italian Fascism** (historical) | Corporatist totalitarian state | Plan/Mkt: early Now → **Markets** (De Stefani's liberal finance ministry, 1922–25), later Planned/corporatist. Irr/Rel: Now → **Religious** (Lateran Pacts 1929, a tactical accommodation). | T | [K] |

Takeaways for the data model:
- Store `ideal: number[12]`, `now: number[12]`, `nowContext: "liberal-democracy-baseline"`, and `sources[]` per ideology. Rows 1–3 share an ideal and differ on `now`, so ideal-only matching cannot separate them.
- Low-gap ideologies (Burkean, Nordic social democracy, anarcho-communism) are informative too: their signature *is* small D.
- Rows 9 and 15 show **a gap in the 12-axis framework**. It has no *rectification / historical-justice* axis and no *emergency-powers* axis, so remedial measures get scattered across Progressive, Collectivize and Security. Raise this in the criticisms doc. The gap typology and reason chips partly cover for it.

---

## 4. Issues to carry into the criticisms doc

1. **Status-quo-relative item wording** in the original 12axes (questions.js:14, 158, 185, 400, 409, 410, 497). Answers then depend on the respondent's country even inside one frame, so a single-frame score confounds values with circumstances. This is the user's core complaint, and here it appears in the item text itself.
2. **The original 12axes bundles necessity and justice.** A Danish and an Iranian respondent with identical values get different Collectivize and Liberty/Security scores. The quiz cannot say whether it measured values or conditions.
3. **No remedial axis** (rectification, emergency powers), as noted in §3.
4. **Stipulations in our own Ideal frame** (institutions not a ruler; "legitimate by their own lights") are value-laden. Disclose them; don't hide them.
5. **No population norms are possible without telemetry.** Every threshold must be fixed in advance and printed in a "How scoring works" page.

---

## 5. Primary citation list (quick reference)

- Rawls, *A Theory of Justice* (1971) §§2, 22, 39; *The Law of Peoples* (1999) §1. Secondary: https://philarchive.org/archive/FULBSA-2
- Sen, "What Do We Want from a Theory of Justice?", *J. Phil.* 103(5) 2006; *The Idea of Justice* (2009). Secondary: https://www.politics.ox.ac.uk/sites/default/files/inline-files/SJ011_Valentini_ParadigmShiftinTheorising.pdf
- Mills, "Ideal Theory as Ideology", *Hypatia* 20(3) 2005: https://www.cambridge.org/core/journals/hypatia/article/ideal-theory-as-ideology/A75BA915A4A78F6AE67FA99036C4FC10
- Valentini, *Philosophy Compass* 7(9) 2012: https://philarchive.org/rec/VALIVN-2
- Simmons, *PPA* 38(1) 2010: https://dc2.philarchive.org/rec/SIMIAN
- Estlund, "Utopophobia", *PPA* 42(2) 2014: https://philarchive.org/archive/ESTHNA-2
- Gilabert & Lawford-Smith, *Political Studies* 60(4) 2012: https://ideas.repec.org/a/bla/polstu/v60y2012i4p809-825.html
- Williams, *In the Beginning Was the Deed* (2005). Secondary: https://core.ac.uk/download/42152358.pdf
- Lipsey & Lancaster, *RES* 24(1) 1956: https://www.encyclopedia.com/social-sciences/applied-and-social-sciences-magazines/theory-second-best
- Marx, *Critique of the Gotha Programme*: https://www.marxists.org/archive/marx/works/1875/gotha/
- Lenin, *State and Revolution* ch. 5: https://www.marxists.org/archive/lenin/works/1917/staterev/ch05.htm
- Trotsky, *Transitional Program*: https://www.marxists.org/archive/trotsky/1938/tp/transprogram.pdf
- Rothbard on gradualism: https://mises.org/mises-wire/gradualism-or-abolitionism ; https://mises.org/mises-wire/we-must-be-opportunists-dismantling-state
- Burke, *Reflections*: https://en.wikipedia.org/wiki/Reflections_on_the_Revolution_in_France
- Popper, *Open Society* ch. 9: https://en.wikipedia.org/wiki/The_Open_Society_and_Its_Enemies
- Roman dictator (1911 Britannica): https://en.wikisource.org/wiki/1911_Encyclop%C3%A6dia_Britannica/Dictator
- Schmitt / emergency powers: https://cambridge.org/core/journals/canadian-journal-of-law-and-jurisprudence/article/abs/dilemmas-of-dictatorship-carl-schmitt-and-constitutional-emergency-powers/BA22E752F9FA9394910E28F636B7D2A3
- Hirschman: https://en.wikipedia.org/wiki/Exit,_Voice,_and_Loyalty
- Acemoglu & Robinson: https://en.wikipedia.org/wiki/Why_Nations_Fail
- CPI 2025: https://en.wikipedia.org/wiki/List_of_countries_by_Corruption_Perceptions_Index
- WJP 2025: https://worldjusticeproject.org/rule-of-law-index/downloads/WJPIndex2025.pdf
- V-Dem via OWID: https://ourworldindata.org/grapher/liberal-democracy
- Converse / Zaller notes: https://adambrown.info/p/notes/converse_the_nature_of_belief_systems_in_mass_publics ; https://adambrown.info/p/notes/zaller_the_nature_and_origins_of_mass_opinion
- [K, UNVERIFIED]: Nozick ASU p. 231; Grutter v. Bollinger 539 U.S. 306 (2003); Ackerman 113 Yale L.J. 1029 (2004); Rossiter 1948; Cronbach & Furby 1970; Lord 1956; Bernstein 1899; List 1841; Sun Yat-sen 1924; Hoppe 1998; Kant 1795.

---

## Critic addendum (completeness critic, 2026-10-31)

### A. Citation upgrades (this session)
- **Nozick, ASU p. 231**: [K] → **[S]**. A course reading quotes "past injustices might be so great as to make necessary in the short run a more extensive state in order to rectify them" with p. 231 (https://www.ocf.berkeley.edu/~ngkolodny/S10Phil2H26.pdf). The ch. 7 excerpt at https://www.laits.utexas.edu/poltheory/sidgwick/shortrefs/asu.c07.html carries the same sentence and adds that socialism as punishment for past sins "would be going too far". Table row 8 stands.
- **Grutter (row 9)**: the wording is **disputed between secondary sources**: "We expect that 25 years from now…" vs "The Court expects…" (https://en.wikipedia.org/wiki/Grutter_v._Bollinger and others). Check against the slip opinion before quoting. Also relevant: Grutter was effectively overruled by *SFFA v. Harvard* (2023). Any UI example built on it must say so.
- **Rawls / Rousseau "men as they are and laws as they might be"**: [K] → [S] for the attribution. Multiple secondary sources tie the realistic-utopia framing to Rousseau's opening of *The Social Contract* (https://en.wikipedia.org/wiki/The_Law_of_Peoples; https://albertalawreview.com/index.php/ALR/article/download/1423/1412/1534). The page number (LoP p. 7) is still UNVERIFIED.
- TL;DR item 6 says "16 worked examples", but the §3 table has **18 rows**.

### B. Modal asymmetry between the two definitions (high severity)
§2.1 defines Ideal as "would a system like that **ever** do this … when the conditions arise?" and Now as "**should** this be done or allowed there, now?" These are different questions (existential/permissive vs present deontic). Ideal answers on remedial and emergency items get pushed toward agree by the wording alone, and that biases every gap. Both frames should evaluate the same conditional proposition and differ only in which system acts. Full argument and fix: doc 03 critic addendum §A. The respondent-facing paragraphs in §2.1 need rewording to match. Suggested pair:
- **Ideal:** "In a well-run, legitimate system with ordinary people and real problems: should it do this (in this situation)?"
- **Here and now:** "In your country as it actually is, run by the people who actually run it: should it do this (in this situation)?"

### C. Conditional items: the Now column has two readings
The worked example in §2.3 already shows it: "Δ = −1, or Δ = 0 if they judge that concentration has not happened". The design must choose between:
- the **hypothetical** reading: if this happened here, should our institutions act?
- the **actual** reading: it isn't happening here, so no.

Rec: hypothetical in both columns. Add the missing reason chip **"this doesn't happen / isn't needed here"** to §2.2(h). It is plausibly the commonest reason for a Denmark-type gap, and the current chip list has no slot for it. Decision for Max (doc 03 addendum §B).

### D. The §2.2(d) display thresholds fire on pure noise
Simulation: `/tmp/claude-1000/-home-xertrov-src-12x2/6f22d232-cf93-470e-949f-6728e7611f5a/scratchpad/analysis/gap_noise_sim.py`. Setup: seeded; 12 axes × 5 items keyed 3:2. The respondent has **no true gap** (true N = I on every item), and each frame's answer gets independent Gaussian noise. The thresholds are C ≥ 0.5, |G| ≥ 0.15 and ≥ 2 agreeing items.

| scale | respondent | mean Gap (0–100) | axes showing an arrow (of 12) | P(≥1 arrow) | mean max \|G\| |
|---|---|---|---|---|---|
| 7-pt | noise SD 0.5 | 9.0 | 1.8 | 0.86 | 0.23 |
| 7-pt | noise SD 0.8 | 13.7 | 3.4 | 0.98 | 0.33 |
| 7-pt | noise SD 1.0 | 16.6 | 4.1 | 0.995 | 0.40 |
| 7-pt | random clicking | 38.1 | 5.1 | 0.999 | 0.82 |
| 5-pt | noise SD 0.5 | 13.1 | 4.3 | 0.995 | 0.34 |
| 5-pt | random clicking | 40.0 | 5.3 | 0.999 | 0.87 |

- Independent noise across the two frames is a **pessimistic** model, because the paired UI makes exact N = I easy. The direction of the finding still holds: |G| ≥ 0.15 sits *below* the noise level of a 5-item axis.
- Thresholds must be calibrated by simulation before build. Choose |G| and C cut-offs such that a zero-gap respondent at SD 0.8 shows an arrow on ≤ 5% of axes. Publish the calibration.
- The share-card claim "biggest gap on {axis}" (doc 05 §6.1) should appear only when that axis passes the calibrated gate. Otherwise use "your gaps are spread across axes".

### E. The noise-floor repeat items (§2.2c) are unlikely to work
- A σ estimated from 3–4 *reworded* repeats has very high sampling variance.
- The rewording confounds noise with item difference.
- D − σ̄ is not an unbiased correction, because E|Δ| does not combine additively with noise.
- The repeats also cost 6–8 extra decisions.

Rec: drop the repeat items. Report Gap against fixed, simulation-derived baselines: the random clicker at about 38/100 (7-pt), and a stated "noise-only" band.

### F. Smaller issues
- **Value-laden quadrant labels** in §2.2(f). "Purist" annotated as "the stance Mills criticises" contradicts §2.2(b)'s own neutrality rule. Use descriptive labels only, e.g. "Constant, high confidence" / "Constant, low confidence".
- **SC item 6 (exit)** is a preference, not a perception of the system. Keep it out of the SC mean (the doc half-says this already).
- **Is the rest of the world ideal too?** Doc 01 §7.7 raises this. §2.1 implies a non-ideal world ("wars … still happen") but never says it. Militarism, Trade, Intervention and Immigration items depend on the answer. State it explicitly in the respondent-facing definition. Rec (from doc 01): "your country's system is ideal; other countries are as they realistically could be".
- **Transitional vectors (§2.2i) are context-bound** ("present-day developed liberal democracy"). The respondents who most need the Now column (low SC) are exactly the ones for whom those vectors fit worst. That is a further reason to make Ideal matching the headline and transitional matching secondary (doc 03 addendum C7).
- **Agent conflation:** the §2.3 worked item names *the state* as the actor. Anarchist ideals (§3 rows 2, 6) then score as anti-redistribution. See doc 01 critic addendum, topic A.

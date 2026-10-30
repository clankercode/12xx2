# 07 - Provenance check: 12axes.vercel.app question bank

Date: 2026-10-31. Researcher: Haiku 5.5 subagent (prov-vercel). Status: PARTIAL. The web-search budget ran out after 21 of about 82 planned exact-phrase searches. Local analysis is complete. Public-survey and 8values/Sapply checks were not run.

Bank under review: `/tmp/claude-1000/-home-xertrov-src-12x2/6f22d232-cf93-470e-949f-6728e7611f5a/scratchpad/upstream/12axes/backend/src/main/resources/data/i18n/en/questions.json` (English, 240 statements) and `.../upstream/12axes/backend/src/main/resources/data/questions-pool.json` (Portuguese source, 240 statements, same IDs).

Comparison original: `/tmp/claude-1000/-home-xertrov-src-12x2/6f22d232-cf93-470e-949f-6728e7611f5a/scratchpad/upstream/pt-site/12axes/questions.js` (288 English strings).

Excerpts below are at most 12 words. The full bank is not republished.

## Bottom line

- **Original, or close to it?** The sampled items look natively authored in Portuguese for Brazil, not translated from the MIT original. At least 6 of the 41 sampled statements contain Brazil-specific referents, and the Portuguese IDs and wording are consistent with Brazilian authorship. The English file reads as a translation of the Portuguese, not of the MIT English. The direction of translation is inferred, not verified.
- **Derived from the MIT original?** No sentence-level derivation found. Zero of 240 English statements match an MIT string exactly after normalisation. Only 2 pairs score 0.5 or higher on token overlap, and both are short generic phrasings. Topical overlap exists (the same 12 axes), which is expected for any 12-axis quiz.
- **Are clones copying it?** No evidence found. The visible statements on the clone sites do not match this bank. Several clone pages show only one or two statements, so this is inconclusive for hidden items. One clone (12axestest.com) claims its statements come from an MIT-licensed bank. That claim is UNVERIFIED and does not identify this bank.
- **License status:** the upstream repo is all rights reserved (see Licensing). Do not reuse this bank in 12x2. Write our own statements.

## Method

1. Local overlap: every English statement (240) compared with every MIT string (288) using token Jaccard overlap, stop-words removed (`/tmp/claude-1000/-home-xertrov-src-12x2/6f22d232-cf93-470e-949f-6728e7611f5a/scratchpad/scripts/prov_overlap.py`). Also a normalised exact-match check.
2. Sample: 41 statements, at least 2 per axis (all 12 axes covered). Chosen to include distinctive, Brazil-specific and generic items.
3. Web: exact-phrase WebSearch with quoted statements, English and Portuguese. Only 21 searches ran before the budget was exhausted (see Gaps).
4. Clones: direct WebFetch of the homepages. Statement text in WebFetch output is a small-model summary, so quoted clone statements are approximate.

## Local overlap with the MIT original (English only)

- Vercel English statements: 240. MIT strings: 288.
- Exact normalised matches: 0.
- Token Jaccard at least 0.50: 2 pairs. Both are short generic phrasings:
  - diplomacia_09 "Military service should be compulsory..." vs MIT "There should be compulsory military service." (0.50)
  - controle_13 "I prefer a state-planned economy..." vs MIT "I prefer a planned economy over a free and open economy." (0.50)
- At least 0.25: 35 pairs. These are topical, not textual (for example, "Patents should be protected..." matching trade items).
- Close paraphrase noted by hand: economia_10 "Taxes should be voluntary." vs MIT "Taxation should be voluntary or abolished." (Security-Freedom). Short, generic idea; not a copy.
- The MIT original is English only, so the Portuguese pool was not compared locally. The Portuguese is checked by web search only (see table).

## Results table

Key: EN = exact-phrase English search. PT = exact-phrase Portuguese search. "not run" = budget exhausted. "MIT local" = normalised and Jaccard check against the MIT English. Likely origin is a judgement, not a finding. UNVERIFIED marks any claim not checked.

| # | ID | Statement excerpt (EN, at most 12 words) | Search | Found where | Likely origin |
|---|---|---|---|---|---|
| 1 | estrutura_07 | "Most tax revenue should remain in the region..." | EN: no match; PT: not run | MIT local: no exact | Generic federalism item; PT original likely |
| 2 | estrutura_09 | "Regions should have the right to secede if..." | EN: no match; PT: not run | MIT local: no exact | Generic; secession debate |
| 3 | estrutura_11 | "Indigenous and traditional peoples should be free to live by..." | EN: no match; PT: no match | MIT local: no exact | Brazil-specific (quilombolas): Brazilian authorship |
| 4 | estrutura_14 | "When a regional and a national leader disagree..." | EN: no match; PT: not run | MIT local: no exact | PT names governor and president: Brazilian framing |
| 5 | representacao_01 | "Free elections must be kept even when they elect bad governments." | EN: no match; PT: not run | MIT local: no exact | Generic liberal-democracy item |
| 6 | representacao_02 | "In serious crises, a strong leader should govern without the legislature." | EN: no match; PT: not run | MIT local: no exact | Topical match to "strong leader" survey themes (UNVERIFIED; WVS not checked) |
| 7 | representacao_05 | "Independent judges should be able to overturn government decisions." | EN: no match; PT: no match (PT names STF) | MIT local: no exact | Brazil-specific (STF): Brazilian authorship |
| 8 | representacao_06 | "There should be no term limits for a good leader." | EN: no match; PT: not run | MIT local: no exact | Generic |
| 9 | representacao_11 | "Voters should be able to recall a bad politician..." | EN: no match; PT: not run | MIT local: no exact | Generic recall item |
| 10 | representacao_12 | "I would prefer an authoritarian regime to democracy if it accelerated..." | EN: no match; PT: not run | MIT local: no exact | Generic; resembles development-vs-democracy survey items (UNVERIFIED; not checked) |
| 11 | poder_02 | "Adult cannabis use should not be a criminal offense." | EN: no match; PT: not run | MIT local: no exact | Generic policy-debate item |
| 12 | poder_05 | "Facial recognition cameras in the streets should be expanded..." | EN: no match; PT: no match | MIT local: no exact | Topical (Brazilian city deployments in results); PT wording original |
| 13 | poder_12 | "Voluntary euthanasia should be legalized for terminal illnesses." | EN: no match; PT: not run | MIT local: no exact | Generic |
| 14 | poder_20 | "No one should be forced to unlock their phone for the police." | EN: no match; PT: not run | MIT local: no exact | Generic; results are US-law framed |
| 15 | imigracao_09 | "The country should give preference to immigrants from similar cultures." | EN: no match; PT: not run | MIT local: no exact | Generic |
| 16 | imigracao_12 | "My country should continue to welcome immigrants from countries facing severe crises." | EN: no match; PT: no match (PT names Venezuelans and Haitians) | MIT local: no exact | Brazil-specific: Brazilian authorship |
| 17 | imigracao_18 | "Borders should be open to any peaceful person." | EN: no match; PT: not run | MIT local: no exact | Generic; open-borders advocacy wording differs |
| 18 | diplomacia_07 | "My country should develop nuclear weapons." | not run | MIT local: no exact | Generic; PT names Brazil |
| 19 | diplomacia_15 | "My country should develop lethal autonomous weapons." | not run | MIT local: no exact | Generic, contemporary |
| 20 | intervencao_07 | "My country should not intervene militarily, even to stop a genocide..." | not run | MIT local: no exact | Generic framing; PT names a neighbouring country |
| 21 | intervencao_19 | "My country should not maintain military bases in other countries." | not run | MIT local: no exact (best Jaccard 0.30, unrelated item) | Generic |
| 22 | economia_10 | "Taxes should be voluntary." | not run | MIT local: close paraphrase of "Taxation should be voluntary or abolished." (Security-Freedom) | Generic libertarian idea; short wording |
| 23 | economia_14 | "Cash assistance programs should have a maximum duration." | EN: no match; PT: no match (PT names Bolsa Família) | MIT local: no exact | Brazil-specific: Brazilian authorship |
| 24 | economia_15 | "My country should redistribute large rural estates through land reform." | not run | MIT local: no exact | Brazil-specific framing (PT "reforma agrária") |
| 25 | controle_09 | "In serious crises, the government should be able to freeze rents." | not run | MIT local: no exact | Generic |
| 26 | controle_12 | "Cryptocurrencies like Bitcoin should compete freely with government money." | not run | MIT local: no exact | Generic, contemporary |
| 27 | controle_18 | "The central bank should be abolished..." | not run | MIT local: no exact | Generic libertarian |
| 28 | controle_19 | "I prefer a legal minimum wage to free wage negotiation." | not run | MIT local: no exact | Generic |
| 29 | comercio_11 | "Domestic food production should take priority over cheap imports." | not run | MIT local: no exact | Generic |
| 30 | comercio_15 | "Cheap imported electric cars should pay tariffs..." | not run | MIT local: no exact | Contemporary; PT names Chinese EVs |
| 31 | religiao_05 | "Churches and temples should pay taxes like any other organization." | not run | MIT local: no exact | Generic |
| 32 | religiao_15 | "The word 'God' should not appear in the constitution." | not run | MIT local: no exact | PT names the Constitution; the 1988 Brazilian preamble names God (knowledge-based, UNVERIFIED here) |
| 33 | moral_05 | "I support race-based quotas in university admissions." | not run | MIT local: no exact | Brazil-specific framing (university quotas) |
| 34 | moral_09 | "I consider abortion early in pregnancy morally acceptable." | not run | MIT local: no exact | Generic |
| 35 | moral_10 | "I consider abortion morally wrong." | not run | MIT local: no exact | Generic |
| 36 | moral_13 | "Sex work should be recognized as legitimate work." | not run | MIT local: no exact | Generic |
| 37 | moral_18 | "Caring for the family should be the main priority in a woman's life." | not run | MIT local: no exact | Generic traditional-values item |
| 38 | tecnologia_07 | "Mining should be allowed in protected forests, even with some impact." | not run | MIT local: no exact | Brazil-specific framing (PT "Amazônia") |
| 39 | tecnologia_11 | "Humanity should invest in exploring other planets." | not run | MIT local: no exact | Generic |
| 40 | tecnologia_15 | "Brain implants to enhance the mental abilities of healthy people..." | not run | MIT local: no exact | Generic, contemporary |
| 41 | tecnologia_17 | "Lab-grown meat should replace some livestock farming." | not run | MIT local: no exact | Generic, contemporary |

Summary by search status:
- English searched: 16 of 41. No verbatim matches on any.
- Portuguese searched: 5 of 41 (estrutura_11, representacao_05, economia_14, imigracao_12, poder_05). No verbatim matches on any.
- Local MIT check: all 240 English statements. No exact matches.

## Clone and sister-site checks (direct WebFetch of homepages)

| Site | What was visible | Does it reuse this bank? | Notes |
|---|---|---|---|
| https://12axestest.org | Statement 1 of 60: "Protectionism, such as tariffs on imports, is justified..." Footer "© 2026 12 Axes Test". | No, for the visible statement. Topical match to comercio_01 only. | No licence stated. |
| https://12axestest.com | No statements visible. States "Statements come from the open-source 12axes question bank (MIT license)." | Cannot tell. | The MIT claim is UNVERIFIED. It does not name this bank. |
| https://12axes.org | Statement 01 of 60: "Reducing income inequality should be a priority..." Offers 60- and 288-question versions. | No, for the visible statement. | The 288 count matches the MIT string count. This is UNVERIFIED as a link to MIT. |
| https://12axes.lol | Title only. | Cannot tell. | Nothing to assess. |
| https://12axes.vercel.app | Portuguese and English. No footer text in the fetched content. | This is the bank under review. | Upstream README lists "Portuguese and English". |

Limit: WebFetch returns a summary. Visible clone statements are approximate and only one or two per site. A complete comparison needs the clone question files, which were not available.

## Licensing

- Upstream repo LICENSE (`/tmp/claude-1000/-home-xertrov-src-12x2/6f22d232-cf93-470e-949f-6728e7611f5a/scratchpad/upstream/12axes/LICENSE`): "Copyright (c) 2026 Enzo Xavier Santos. All rights reserved." It states the repo "is not open source" and grants no licence beyond limited permissions. The README links the project to a GitHub repo under the RomanCypherpunk account. Consequence: the bank cannot be reused in 12x2 without permission.
- Original 12axes clone (`/tmp/claude-1000/-home-xertrov-src-12x2/6f22d232-cf93-470e-949f-6728e7611f5a/scratchpad/upstream/pt-site/12axes/`): the task text says MIT, (c) 8values/SapplyValues. The local folder has no LICENSE file. The MIT claim is UNVERIFIED from the local copy. Check the upstream repo before relying on it.
- 12axestest.com's MIT claim is UNVERIFIED (see above).

## Gaps (not done)

1. Web search budget exhausted after 21 searches (shared session limit, `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION`). Not run: 25 English and 36 Portuguese exact-phrase searches (the rest of the 41-item sample).
2. Public surveys (WVS, ESS, ISSP, ANES, Latinobarómetro, ESEB Brazil): not checked. Several representacao and poder items resemble survey themes, but wording was not compared. All such similarity is UNVERIFIED.
3. 8values, SapplyValues and other quizzes: not checked.
4. Datasets and clone question files: not available.

## Recommendations

1. Do not reuse this bank or its wording in 12x2. The upstream licence forbids it, and our statements must be original.
2. The Brazilian-specific items show the Portuguese-original structure is likely. If 12x2 is Brazil-facing, Portuguese authorship of our own bank would be the cleaner route.
3. Before publishing, rerun the blocked searches (the 61 not run). Priority: Portuguese searches for poder_05, tecnologia_07 and moral_09, and English searches for the 25 unrun items. Check WVS and ESEB wording for representacao_02 and representacao_12.
4. Verify the MIT licence on the original 12axes repo (the local pt-site copy has no LICENSE file). If we derive anything from it, keep its copyright notice.
5. Ask the 12axestest.com operators which bank they use. Their MIT claim is unverified.

## Sources

- https://12axestest.org (WebFetch, 2026-10-31)
- https://12axestest.com (WebFetch, 2026-10-31)
- https://12axes.org (WebFetch, 2026-10-31)
- https://12axes.lol (WebFetch, 2026-10-31)
- https://12axes.vercel.app (WebFetch, 2026-10-31)
- Local: upstream/12axes/LICENSE and README.md (paths above)
- Background search results were not used as evidence.

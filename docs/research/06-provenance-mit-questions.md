# 06 Provenance check: original MIT 12axes question bank

Status: partial. 36 statements searched by exact phrase (33 statement queries plus 3 bank-level queries), 7 more sampled but not searched, 288-statement bank tested for verbatim overlap against the Vercel bank locally. The WebSearch budget for this session (200 calls, shared by all agents) ran out after 36 queries, so the planned comparison against the 8values/9axes question banks was not done. Treat the verdict below as provisional.

Subject: `/tmp/claude-1000/-home-xertrov-src-12x2/6f22d232-cf93-470e-949f-6728e7611f5a/scratchpad/upstream/pt-site/12axes/questions.js` (MIT, politicaltests.github.io, repo https://github.com/politicaltests/politicaltests.github.io/tree/main/12axes).

## Bottom line

- Project level: derivative. The original 12axes site says it is "based off of 9axes" and that it "is released under the same license" as 8values and 9axes (`pt-site/12axes/index.html` lines 19, 68-69). Its LICENSE is MIT, "Copyright (c) 2020 8values (SapplyValues)".
- Item level: none of the 36 searched statements matched a source verbatim in the indexed web. The lookups are weak evidence in both directions (see Method limits). Most statements read as generic political phrases, not as lifted from a named bank.
- Validated instruments: no sampled item matched a WVS, ESS, ISSP, ANES, GSS or Pew item. These were not queried item by item, so this is UNVERIFIED.
- Verdict: the bank is a derivative of the 8values/9axes family at the project level and is probably not a copy of a validated instrument. Whether individual items were copied from the 8values/9axes banks is UNRESOLVED until a verbatim comparison is run against those files.
- License: MIT. Verbatim reuse is allowed if the MIT copyright and permission notice is kept in copies or substantial portions. The Vercel 12axes repo is "All rights reserved" and must not be reused.

## Local evidence (verified in the clones)

| # | Evidence | Location | What it shows |
|---|---|---|---|
| L1 | "12axes, based off of 9axes ... tries to improve the 9axes test by reorganizing, improving, and patching errors" | `pt-site/12axes/index.html` line 19 | Declared derivation from 9axes |
| L2 | "The 8values and 9axes project's license ... This project is released under the same license." | `pt-site/12axes/index.html` lines 68-69 | Declared license inheritance from the 8values family |
| L3 | MIT text, "Copyright (c) 2020 8values (SapplyValues)" | `pt-site/LICENSE` | Copyright holder is the pseudonymous project name |
| L4 | The Vercel repo README: "inspired by the original [12 Axes test](https://politicaltests.github.io/12axes/)" | `upstream/12axes/README.md` line 39 | Vercel version is a rewrite that cites the original, not a fork of its text |
| L5 | Vercel LICENSE: "Copyright (c) 2026 Enzo Xavier Santos. All rights reserved." "It is not open source." | `upstream/12axes/LICENSE` | Reuse of the Vercel version is not permitted |
| L6 | Git history of the MIT clone: two 2025-02-27 commits by Technet8394, "Fixed typo" (`c0e7c09`, "idustries" to "industries") and "Fixed another typo" (`db197e3`, "toghether" to "together") | `git log` in `pt-site` | Community typo fixes only. The clone is shallow (`rev-parse --is-shallow-repository` = true), so the original authorship of the bank is not visible |
| L7 | Verbatim overlap, MIT bank (288 statements, extracted with grep) against Vercel `data/i18n/en/questions.json`: 0 matches | `grep -o -F -f` | The two banks share no sampled full statement text |
| L8 | Same test against Vercel `data/questions-pool.json`: 0 matches | `grep -o -F -f` | Same result |
| L9 | Sanity check on the method: the loose phrase "national government" hits 2 lines in `questions.json` | `grep -c -i -F` | The pipeline does match when text is present, so the 0 results are not a broken grep |

Note on L7 and L8: exact-match only. Punctuation or spacing differences would make a match fail, so these counts can undercount near-duplicates. The 0 result is still a strong sign the Vercel bank is an independent rewrite, not a copy.

## Statement-level table (36 searched)

Searches were WebSearch (standard mode) on the quoted statement. "No verbatim hit" means no returned page contained the quoted sentence. Nearest hits are thematic only.

| # | Statement (as in MIT bank) | Axis (sign) | Found where | Likely origin |
|---|---|---|---|---|
| 1 | There is no need for a national government. | Federal-Unitary (+4) | No verbatim hit. Nearest: C4SS, FEE and Independent Institute essays on limited or no central government | Generic phrase |
| 2 | Subdivisions of nations should have their own militaries. | Federal-Unitary (+4) | No verbatim hit. Nearest: Federalist Nos. 8 and 28 (thematic); a Straight Dope thread on subdivision forces | Generic or unknown |
| 3 | Laws should vary from area to area and culture to culture within a country. | Federal-Unitary (+2) | No verbatim hit. Only debate-essay pages | Generic phrase |
| 4 | Strong states weaken a nation | Federal-Unitary (-4) | No verbatim hit. Academic work treats state strength as conditional (Acemoglu, cited in results, UNVERIFIED) | Generic phrase |
| 5 | Democracy is the worst form of government, except for all the others we've tried. | Democratic-Autocracy (+2) | Variant of a Churchill-attributed saying. Langworth says Churchill quoted an unknown predecessor in a 1947 Commons speech ([richardlangworth.com](https://richardlangworth.com/worst-form-of-government), [Quote Investigator](https://quoteinvestigator.com/page/37/?o=7620), [Barry Popik](https://www.barrypopik.com/new_york_city/entry/democracy_is_the_worst_form_of_government_except_for_all_the_others)) | Widely circulated saying. Attribution doubtful. Not traced to a quiz |
| 6 | Public opinion swings too much with emotional events to be useful for policy making. | Democratic-Autocracy (-3) | No verbatim hit. Nearest: [arXiv 1009.4019](https://arxiv.org/pdf/1009.4019) and a Norwegian dissertation on opinion stability | Generic phrase |
| 7 | We are first and foremost citizens of Earth. | Internationalist-Nationalist (+4) | No verbatim hit. Nearest: a passage from the book *Earth Citizen: Recovering Our Humanity* (author UNVERIFIED) ([Goodreads quotes](https://www.goodreads.com/work/quotes/20289257)) | Generic phrase, close to a book passage |
| 8 | Nobody in other countries has our best interests in mind. | Internationalist-Nationalist (-3) | No verbatim hit. Nearest: [Pew 2023 global foreign-policy survey](https://www.pewresearch.org/global/2023/12/06/foreign-policy-and-international-engagement/markdown), which uses different items | Generic phrase |
| 9 | Countries that violate human rights should be toppled | Militarist-Pacifist (+2) | No verbatim hit. Nearest: a 2001 forum thread, Codepink's arms-sales campaign, a 2017 US statement at the UN HRC | Generic phrase |
| 10 | Diplomatic options should always be tried before war is even considered. | Militarist-Pacifist (-1) | No verbatim hit. Nearest: a [Votesmart issue-position paraphrase](https://votesmart.org/public-statement/850363/issue-position-foreign-policy) and a Bush quote ("The military option is always the last option...") | Generic phrase, close to common political paraphrase |
| 11 | If you have nothing to hide, then you have nothing to fear. | Security-Freedom (+2) | Widely used surveillance-debate phrase: [Snowden critique](https://quotewise.io/q/i349wx/), [Mullvad rebuttal](https://mullvad.net/ja/why-privacy-matters/nothing-to-hide), [Stossel teachers guide](https://stosselintheclassroom.org/wp-content/uploads/2025/09/Nothing-to-Hide-Teachers-Guide.pdf). A different quiz, [jarick.works/spekr](https://jarick.works/spekr/quiz), has a rephrase. Relation to the MIT bank UNVERIFIED | Common phrase |
| 12 | Those who would give up essential Liberty to purchase a temporary Safety deserve neither. | Security-Freedom (-1) | Variant of Franklin's 1755 Pennsylvania Assembly line. Attribution disputed ([Reason/Volokh](https://reason.com/?p=354014), [Creators/Napolitano](https://www.creators.com/read/judge-napolitano/08/23/neither-liberty-nor-safety)) | Adaptation of a public-domain quotation. Not from a quiz |
| 13 | Taxation is theft. | Security-Freedom (-3) | Libertarian slogan; Rothbard popularized it ([Wikipedia: Taxation as theft](https://en.wikipedia.org/wiki/Taxation_as_theft)) | Common slogan |
| 14 | The very existence of the state is a threat to our liberty. | Security-Freedom (-4) | No verbatim hit. Nearest: Mises Institute essays on the state and liberty | Generic libertarian phrase |
| 15 | Victimless crimes (such as drug use) should not be crimes at all. | Security-Freedom (-3) | No verbatim hit. Concept is standard ([Wikipedia: Victimless crime](https://en.wikipedia.org/wiki/Victimless_crime)) | Generic (standard term) |
| 16 | Most, if not all corporations are inherently evil. | Equality-Markets (-3) | No verbatim hit. Nearest: [Folland, "Are Corporations Evil?" (Oakland U.)](https://our.oakland.edu/handle/10323/7761); Chomsky 1996 remarks | Generic phrase |
| 17 | Class war is a real and important issue. | Equality-Markets (+2) | No verbatim hit. Nearest: Chomsky and Sanders statements on class war | Generic phrase |
| 18 | Economies without any capitalism will collapse. | Equality-Markets (-1) | No verbatim hit. Forum and essay debate only | Generic phrase |
| 19 | People born to wealthy families have unfair success even when they aren't skilled and don't work hard. | Equality-Markets (+1) | No verbatim hit. Nearest: Robert Frank's *Success and Luck* (as summarised in results, UNVERIFIED) | Generic, thematic link to Frank |
| 20 | Private charities are a better means of helping the poor than public welfare is. | Equality-Markets (-4) | No verbatim hit. Nearest: [Cato, "civil society rescue"](https://www.cato.org/commentary/civil-society-rescue) and [FEE](https://fee.org/articles/the-shortcomings-of-government-charity/); same proposition, different wording | Generic free-market proposition |
| 21 | Huamnity has progressed beyond the need for religion. | Secular-Religious (+2) | No hit, even for the typo. Nearest: debate essays on whether we have outgrown religion ([Open to Debate](https://opentodebate.substack.com/p/more-we-evolve-less-we-need-god)) | Unknown. The typo is absent from indexed pages. This is weak evidence that the text was typed, not copied from a sourced page |
| 22 | Most organized religions contradict themselves. | Secular-Religious (+2) | No verbatim hit. Forum threads ([Straight Dope](https://boards.straightdope.com/t/are-there-any-religions-that-arent-self-contradicting/94191)) | Generic phrase |
| 23 | Religious organizations often provide better assistance to the poor than the government does. | Secular-Religious (-2) | No verbatim hit. Nearest: [America magazine 2001](https://www.americamagazine.org/from-our-archives/2001/04/09/bushs-faith-based-initiative/) | Generic phrase |
| 24 | Tradition just hinders the progress of humanity. | Progressive-Traditional (+4) | No verbatim hit. Opinion pieces on both sides | Generic phrase |
| 25 | White guilt is sometimes justified. | Progressive-Traditional (+4) | No verbatim hit. Nearest: [Virginia Tech paper](https://vtechworks.lib.vt.edu/bitstreams/43545289-3895-4dd8-ad9d-817ff7e1c2f3/download) (pro), Shelby Steele critique | Generic (topic-level debate) |
| 26 | Sharia law isn't as bad as people think it is. | Progressive-Traditional (-4) | No verbatim hit. Nearest: [Lehigh report on Abou El Fadl](https://news.lehigh.edu/news/shariah-law-widely-misunderstood-islamic-expert-says) and [Mic on the Pew survey](https://mic.com/articles/38931/sharia-law-is-not-what-you-think-it-is) | Generic phrase |
| 27 | Immigrants can never really adapt to our way of life. | Assimilationist-Multiculturalist (+3) | No verbatim hit. A Straight Dope thread is titled "Political Compass #36: First generation immigrants can never be fully integrated" ([thread](https://boards.straightdope.com/t/political-compass-36-first-generation-immigrants-can-never-be-fully-integrated/263900?page=2)). That is a close proposition in another quiz family; wording UNVERIFIED | Generic, with a possible Political Compass-family parallel |
| 28 | Governments should be as concerned about foreign citizens as they are about those within their borders. | Assimilationist-Multiculturalist (-4) | No verbatim hit. Nearest: [PRIO duty-of-care book](https://www.prio.org/publications/14572) | Generic debate motion |
| 29 | Our culture would be better with other cultures mixed in more. | Assimilationist-Multiculturalist (-3) | No verbatim hit. Student essays and forum posts | Generic phrase |
| 30 | The government actively works with large corporations to destroy small businesses. | Planned-Laissez-Faire (-3) | No verbatim hit. Nearest: [Reason on Carney](https://reason.com/2021/07/07/how-big-business-uses-big-government-to-kill-competition/printer/); Carol Roth's book title *The War on Small Business* | Generic phrase |
| 31 | Protectionism is an unnecessary and unrealistic idea. | Protectionism-Globalism (-4) | No verbatim hit. Nearest: [Cato Journal 1984](https://cato.org/cato-journal/winter-1984/realism-free-trade-policy) (inverted framing) | Generic phrase |
| 32 | Economic globalism caused more negative impacts than positive ones. | Protectionism-Globalism (+1) | No verbatim hit. Study-aid cards and essays | Generic phrase |
| 33 | Local products are often poor in quality. | Protectionism-Globalism (-4) | No verbatim hit. Thematic reports on local-product perception | Generic phrase |
| 34 | Transhumanism isn't as radical as many people think it is. | Acceleration-Bioconservative (+2) | No verbatim hit. Nearest: Levin 2024, "The Less Visible Side of Transhumanism Is Dangerously Un-radical" ([PhilArchive](https://dc2.philarchive.org/rec/LEVTLV)). Same idea, different framing; UNVERIFIED as a source | Generic, close to a 2024 paper's thesis |
| 35 | Modern technology and the modern lifestyle made life meaningless and dull. | Acceleration-Bioconservative (-3) | No verbatim hit. Essays ([Aquila Report](https://archive.theaquilareport.com/why-technology-makes-our-lives-easier-yet-more-meaningless)) | Generic phrase |
| 36 | Traditional medicines are often more effective than modern medicines. | Acceleration-Bioconservative (-4) | No verbatim hit. Advocacy and anecdote | Generic phrase |

### Not searched (7 sampled, budget exhausted)

- Representatives rarely represent the nation well. (Democratic +4)
- Elections are a waste of resources. (Democratic -4)
- Catering to popular opinion is detrimental to a nation. (Democratic -4)
- The Enlightenment should never have happened. (Progressive -4)
- In the modern era, militaries aren't really necessary. (Militarist -4)
- Most, if not all economic crises are caused by government intervention. (Planned -4)
- Technology is making people lose jobs, which is ultimately harmful for humanity. (Acceleration -1). Locally confirmed present in the bank; typo fix at `c0e7c09`.

## Bank-level and family-level searches

- "Assimilationist-Multiculturalist" / "Planned - Laissez-Faire" / 12axes questions: no hit for the bank labels or the question file. Results covered general definitions only.
- "12axes questions.js" / label phrases on GitHub: no 12axes question file was found. Results included forks of 8values-family tests ([leftvalues](https://github.com/haunted-loaf/leftvalues.github.io), [infvalues](https://github.com/infvalues/infvalues.github.io), [MGValues2Test](https://github.com/pyroblocks/MGValues2Test.github.io)). A [2026 blog](https://lovableapp.org/blog/12axes-political-test-2026) also says 12axes is based on 9axes.
- SapplyValues: its index page says 8values, 9axes and SapplyValues share an Expat/MIT-style license ([SapplyValues index.html](https://github.com/SapplyValues/SapplyValues.github.io/blob/master/index.html)). The same results describe SapplyValues as "a clone of the Sapply political compass, made to use 8values' UI". This supports a shared lineage, but the question text was not compared.
- Not done: the WorldValues Survey, ESS, ISSP, ANES, GSS and Kaggle or HuggingFace datasets were not queried item by item. Kaggle and HuggingFace are not searchable by phrase here. This is UNVERIFIED.

## Interpretation

1. Lineage is declared, and it runs through 9axes into the 8values/SapplyValues family, which is MIT. The MIT bank is therefore derivative at the project level.
2. The sampled items show no verbatim source. Most statements are generic political phrases or common slogans. A few have near-paraphrases in debate material and in another quiz family (for example, #27 and #34). This points to a bank that either wrote its own items or took them from a source that is not in the indexed web. It does not prove originality.
3. The decisive test is missing. Exact comparison of the 288 MIT statements against the 8values/SapplyValues and 9axes question files would show whether items were copied. This could not be done in this session.
4. The Vercel bank has no sampled verbatim overlap with the MIT bank (L7, L8). It is an independent rewrite. Its own license forbids reuse.

## License implications

- MIT (L3): reuse, modification and redistribution are allowed. Copies or substantial portions must keep the copyright notice and permission notice. Plan for a credits file that names "8values (SapplyValues)", the MIT notice text, and the 12axes and 9axes lineage. Attribution in the UI is not required by MIT but is good practice.
- Copyright in short statements: short phrases are generally thin or unprotectable. The bank as a selection and arrangement may still be protected. This is an UNVERIFIED legal view, not legal advice. MIT removes most of the risk when the notice is kept.
- Vercel 12axes (L5): "All rights reserved" with "not open source". Do not copy its questions, profiles or vectors. The Vercel repo is a reading reference only.
- Public-domain quotations (items 5, 12): not licensed. Attribution is disputed, so do not present them as attributed quotes.
- Recommendation: write original statements for 12x2 (the plan says "license-clean"). If any MIT item is kept verbatim, keep the MIT notice and mark those items. Do not claim validation: nothing in this check shows the MIT items were psychometrically validated.

## Method limits

- WebSearch is a fuzzy search engine. Quoted search does not guarantee an exact-phrase match, so "no verbatim hit" is weak evidence of originality.
- The sample is 43 statements out of 288 (about 15%). The sample was chosen for distinctive wording, which biases it toward phrases that should be easy to find if copied.
- No GitHub code search, Google Books, or database search was run.
- No WebFetch of the 8values, SapplyValues or 9axes repos was made. The budget ran out first.
- The clone is shallow, so its git history does not reach the original commit that added the bank.

## Next steps

1. Fetch the SapplyValues and 9axes question files, then run the same `grep -o -F -f` overlap check against the 288 MIT statements. This is the decisive test. It needs a web budget reset or a higher `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION`.
2. Run the 7 unsearched statements and the statement "Foreigners should never enter the country." (not sampled) through exact-phrase search.
3. Check the Political Compass item list for a near-match to #27 ("Immigrants can never really adapt to our way of life").
4. Check `~/.llm-general/clankercode/license-defaults.md` for the 12x2 license default before choosing how to package any MIT-derived text. Not read in this run.

## Sources

Local (verified by reading or grep in the clones):
- `/tmp/claude-1000/-home-xertrov-src-12x2/6f22d232-cf93-470e-949f-6728e7611f5a/scratchpad/upstream/pt-site/12axes/questions.js`
- `/tmp/claude-1000/-home-xertrov-src-12x2/6f22d232-cf93-470e-949f-6728e7611f5a/scratchpad/upstream/pt-site/12axes/index.html` (lines 11, 19, 68-69)
- `/tmp/claude-1000/-home-xertrov-src-12x2/6f22d232-cf93-470e-949f-6728e7611f5a/scratchpad/upstream/pt-site/LICENSE`
- `/tmp/claude-1000/-home-xertrov-src-12x2/6f22d232-cf93-470e-949f-6728e7611f5a/scratchpad/upstream/12axes/LICENSE`
- `/tmp/claude-1000/-home-xertrov-src-12x2/6f22d232-cf93-470e-949f-6728e7611f5a/scratchpad/upstream/12axes/README.md` (line 39)
- `/tmp/claude-1000/-home-xertrov-src-12x2/6f22d232-cf93-470e-949f-6728e7611f5a/scratchpad/upstream/12axes/backend/src/main/resources/data/i18n/en/questions.json`
- `/tmp/claude-1000/-home-xertrov-src-12x2/6f22d232-cf93-470e-949f-6728e7611f5a/scratchpad/upstream/12axes/backend/src/main/resources/data/questions-pool.json`
- `/tmp/claude-1000/-home-xertrov-src-12x2/6f22d232-cf93-470e-949f-6728e7611f5a/scratchpad/mit_statements.txt` (extracted 288 statements, scratch)

Web (search results read in this run, cited by URL as returned):
- https://richardlangworth.com/worst-form-of-government
- https://quoteinvestigator.com/page/37/?o=7620
- https://www.barrypopik.com/new_york_city/entry/democracy_is_the_worst_form_of_government_except_for_all_the_others
- https://arxiv.org/pdf/1009.4019
- https://www.goodreads.com/work/quotes/20289257
- https://www.pewresearch.org/global/2023/12/06/foreign-policy-and-international-engagement/markdown
- https://votesmart.org/public-statement/850363/issue-position-foreign-policy
- https://quotewise.io/q/i349wx/
- https://mullvad.net/ja/why-privacy-matters/nothing-to-hide
- https://stosselintheclassroom.org/wp-content/uploads/2025/09/Nothing-to-Hide-Teachers-Guide.pdf
- https://jarick.works/spekr/quiz
- https://reason.com/?p=354014
- https://www.creators.com/read/judge-napolitano/08/23/neither-liberty-nor-safety
- https://en.wikipedia.org/wiki/Taxation_as_theft
- https://en.wikipedia.org/wiki/Victimless_crime
- https://our.oakland.edu/handle/10323/7761
- https://www.cato.org/commentary/civil-society-rescue
- https://fee.org/articles/the-shortcomings-of-government-charity/
- https://opentodebate.substack.com/p/more-we-evolve-less-we-need-god
- https://boards.straightdope.com/t/are-there-any-religions-that-arent-self-contradicting/94191
- https://www.americamagazine.org/from-our-archives/2001/04/09/bushs-faith-based-initiative/
- https://vtechworks.lib.vt.edu/bitstreams/43545289-3895-4dd8-ad9d-817ff7e1c2f3/download
- https://news.lehigh.edu/news/shariah-law-widely-misunderstood-islamic-expert-says
- https://mic.com/articles/38931/sharia-law-is-not-what-you-think-it-is
- https://boards.straightdope.com/t/political-compass-36-first-generation-immigrants-can-never-be-fully-integrated/263900?page=2
- https://www.prio.org/publications/14572
- https://reason.com/2021/07/07/how-big-business-uses-big-government-to-kill-competition/printer/
- https://cato.org/cato-journal/winter-1984/realism-free-trade-policy
- https://dc2.philarchive.org/rec/LEVTLV
- https://archive.theaquilareport.com/why-technology-makes-our-lives-easier-yet-more-meaningless
- https://github.com/SapplyValues/SapplyValues.github.io/blob/master/index.html
- https://github.com/haunted-loaf/leftvalues.github.io
- https://github.com/infvalues/infvalues.github.io
- https://github.com/pyroblocks/MGValues2Test.github.io
- https://lovableapp.org/blog/12axes-political-test-2026

UNVERIFIED items: Acemoglu (strong states), Robert Frank (wealth and luck), the author of *Earth Citizen*, the Franklin attribution, the 8values/SapplyValues copyright-holder identity beyond the LICENSE text, and every legal statement in the License section.

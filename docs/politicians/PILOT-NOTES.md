# Politicians: pilot method notes

Method lessons from the 2026-10-31 says-vs-does pilot. **No person-specific findings appear here**, and examples are kept generic so that, read with the office list in §1, they do not point at any pilot subject. The pilot page and raw evidence (including per-person details) are outside the repo, in Max's private pilot folder, and must not be committed or shared until legal review.

## 1. Setup

- **Sample:** 6 office-holders, pre-registered by office as of 2026-10-31: the US President and the most senior congressional leader of the other party; the UK and Australian Prime Ministers and Leaders of the Opposition.
- **Agents:** one researcher agent (Claude Opus 5.5) per person, all six in parallel, working from a shared brief. The brief covered the evidence rules, the statement bank plus R1–R10, the four-question charity check and a JSON schema, and told researchers to pick statements where the record is rich, not where a contradiction looks likely.
- **Verification:** every cited page was fetched through a helper that cached its text. A verifier then checked each quote verbatim against that cached text.
- **No adversarial reviewer, no human sign-off and no right of reply.** These are the main gaps between the pilot and a publishable version.

## 2. Numbers

| Measure | Value |
|---|---|
| Statement rows mapped | 87 (13–18 per person) |
| Row status | 38 consistent · 25 mixed · 17 words only · 7 actions only |
| Confidence | 18 high · 48 medium · 21 low |
| Quotes | 432, all verbatim in the cached page (0 failures) |
| Evidence source type | 275 primary · 60 reporting |
| Action types | 64 votes · 45 executive · 29 bills · 5 litigation · 4 enforcement · 3 pardons · 1 appointment · 5 other |
| Candidates | 36 (33 contradiction, 3 rules-for-thee): **1 decisive · 20 arguable · 15 refuted** |
| Cost per profile | 18–24 min agent time, 81–162 tool calls, 239–291k tokens (about 1.5M in total) |
| Total wall time | about 25 min in parallel, plus assembly |

The charity check did real work: it refuted 15 of 36 candidates (42%) and left only 1 decisive.

## 3. What the verbatim check does and does not prove

It proves the words are on the cited page. It does **not** prove the context, the attribution, or that the mapping onto a statement is fair. Researchers caught three classes of error that verbatim checking cannot catch:

1. A search-engine summary misreported a vote; the official division record showed no vote. **Never take votes from search summaries.**
2. A roll-call table flattened to text was misread. **Calibrate any roll-call parser against a known vote first.**
3. A secondary source contained an obvious error (it listed a senator in a lower-house division).

Other accuracy notes:

- Some individual votes were inferred from tallies ("the only member of party X opposed"). Flag these.
- Some vote trackers do not tell a pair or leave apart from an abstention.
- Interview quotes often come from partisan outlets or wire reports, because primary transcripts are not published.
- One old personal site rendered em-dashes as mojibake, so quotes had to avoid those characters. Normalise text before verbatim checks.

## 4. Statement coverage

**Coverage by axis** (rows mapped across all six people):

| Axis | Rows | ✔ | ≈ | words only | actions only |
|---|---|---|---|---|---|
| col | 1 | 0 | 1 | 0 | 0 |
| dem | 0 | 0 | 0 | 0 | 0 |
| fed | 4 | 4 | 0 | 0 | 0 |
| glo | 5 | 4 | 1 | 0 | 0 |
| int | 5 | 4 | 1 | 0 | 0 |
| lib | 13 | 5 | 3 | 3 | 2 |
| mil | 8 | 4 | 3 | 0 | 1 |
| mul | 9 | 3 | 2 | 3 | 1 |
| pla | 10 | 5 | 5 | 0 | 0 |
| pro | 9 | 5 | 0 | 3 | 1 |
| rel | 1 | 0 | 0 | 1 | 0 |
| tec | 0 | 0 | 0 | 0 | 0 |
| R1–R10 | 22 | 4 | 9 | 7 | 2 |

**Red-line coverage** (people with a mapped row): R1 0/6, R2 2/6, R3 1/6, R4 4/6, R5 0/6, R6 6/6, R7 1/6, R8 5/6, R9 1/6, R10 2/6.

**Statements that map well** are concrete, binary policy statements that match a bill or an order: glo-01, glo-06, int-01, int-02, mul-08, mul-09, pla-05, pro-01, pro-04, lib-04, R4, R8. With lib-06, mil-05 and R6 added for importance, this is the recommended fixed core (README §5).

**Statements that map poorly:**

- Conditionals whose condition never arises (mul-04 "if housing is scarce…", mil-07 "even when no one has attacked").
- Wording stronger than any real policy (mil-01 "defeat any likely enemy"). Or the statement is about one thing (lib-02, home searches) while the record is about a neighbouring one (bulk-data querying).
- lib-06 is about criminal hate speech. Much of the record is about civil vilification, campus rules or platform misinformation rules.
- R6 asks about jailing peaceful critics. Several speech-related actions in the record sat next to R6 rather than on it. On-point record statements for common speech-related action types are proposed in README §5.
- **Almost nothing** on tec (future technologies nobody has voted on), dem and col (framed at regime level, such as "hereditary ruler" or "owned in common", where mainstream politicians never take positions), or rel.
- Federalism was rich only for people who had held regional or federal power and clashed over it.

**Issues no statement covers:** net zero and climate, ID cards and digital ID, under-16 social media bans and platform rules, filibuster rules, electoral reform. These need profile-only "record statements".

**Structural gaps:**

- *Words without actions* is the norm for red lines. Mainstream leaders rarely act on them, and a fetched page cannot prove an absence.
- *Actions without words* is common for whipped or collective votes that a leader never explained.
- Opposition leaders have mostly words. Their actions come from earlier roles.

## 5. The speech and protest test

Max's motivating test (supporting jail for peaceful criticism, or relabelling speech as violence or hate to justify punishing it) was applied evenly to all six. **None came out decisive.** Candidates turned up on more than one side, and every one ended *arguable* for the same structural reason: the action is framed as incitement, hate, terrorism support or immigration enforcement, and the charity check cannot settle whether that framing is fair without a published definition of "peaceful". Lesson: the definition (QUESTIONS Q1) has to come before any speech verdict. It is what makes verdicts reproducible.

## 6. Fetching and sources

- **About a third of fetch attempts failed.** Blocked or bot-challenged: congress.gov, senate.gov, hansard.parliament.uk, TheyWorkForYou, TheyVoteForYou, OpenAustralia, a social platform, and late in the session aph.gov.au. The Wayback Machine rate-limited the six parallel agents (shared IP). Other failures were JS-only shells, empty "archived content" pages and guessed URLs.
- **What worked:** the UK Parliament JSON APIs (commonsvotes, hansard, bills), govinfo.gov's daily Congressional Record (it prints each Senate roll call with the full name lists; its per-day MODS index helps locate pages), clerk.house.gov, the American Presidency Project (it also archives social posts and interviews), whitehouse.gov, gov.uk, pm.gov.au (full-text search with date filters), and the politicians' own sites.
- **Lesson:** use the official APIs with keys (congress.gov, UK Parliament, TheyWorkForYou, OpenAustralia/TheyVoteForYou), and archive pages ourselves instead of depending on Wayback. Stagger parallel agents.

## 7. Bias and selection lessons

- **Coordinator leads are a channel of selection.** The coordinator gave researchers "neutral" leads, several of which were shaped like contradictions, and one researcher said so. Do not supply leads, or supply them symmetrically and log them.
- **Record size drives candidate count.** Candidate counts grew with record length. Counts measure how big and how well covered a record is (a warning from a sample of six, not a measured law).
- **Recency.** Searchable sources skew to 2024–26. Two of the six had been in their current office for under a year, so their "actions" came from earlier roles in local and national government while their recent "words" were opposition or campaign speech. Comparing across roles with different powers is a weak test, so flag it.
- **Office changes.** Two of the four non-US offices had changed hands during 2026. A snapshot date in the selection rule is essential.
- **Ambiguous rules.** "Most senior congressional leader" fitted two people, and the pick between them was a judgement call. Write rules that name one office, or include both.
- **Mapping risk.** About a quarter of rows were low confidence, mostly because the action sat next to the statement rather than on it. A wrong mapping is the easiest way to manufacture a contradiction.

## 8. Legal note from the pilot

Researchers avoided motive language and kept to the record, and every quote was verbatim, but there was no right of reply. Nothing from the pilot should be published without legal review. Detail: README §11.

## 9. Recommendation carried into the spec

Build it as a record card, not a hypocrisy score: README §2 and §8.

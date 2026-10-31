# Politicians: open questions for Max

Each question lists the options and a recommendation (**Rec**). Context is in [README.md](README.md) and [PILOT-NOTES.md](PILOT-NOTES.md). The letter in the Rec column is the option `Qn rec` selects.

## Quick answers

Reply with one line, for example `Q1 rec, Q2 b, Q4 a, rest rec`, or just `all rec`.

| # | Question | Rec |
|---|---|---|
| Q1 | Definition of "peaceful speech" | (d) Speech is peaceful unless it is a true threat or incitement to imminent violence; local legal framing shown beside each case |
| Q2 | Countries | (b) US, UK, AU, CA, NZ first; then IE, DE, FR and the EU Parliament |
| Q3 | Sample size and rule | (b) Heads of government plus opposition leaders, with both US chamber leaders: about 12 people |
| Q4 | Consistent / inconsistent lists and trust language | (c) Build your lists to a fixed three-way rule (K = 8, X = 25%); publish them once legal review clears them; per-entry verdicts until then; never the word "trustworthy" |
| Q5 | Right of reply | (b) Notify the office before publishing, 14-day window, reply shown verbatim next to the entry |
| Q6 | Who signs off decisive verdicts | (b) Max plus one reviewer from a different political leaning |
| Q7 | Public verdict labels | (b) Keep the internal names and show the public wording "direct conflict / disputed / resolved" |
| Q8 | Scope of rules-for-thee | (b) Personal conduct only with an official finding; decisions that exempt allies (party, appointees, family) always count |
| Q9 | Self-labels such as "classical liberal" | (b) A published label→statement table, applied only where the label is quoted verbatim; label-only conflicts capped at arguable |
| Q10 | Legal route and publisher | (b) AU and UK defamation review before naming anyone; publish via an entity |
| Q11 | Where it lives | (b) A route on the quiz site, with the data in a private repo until cleared |
| Q12 | Record statements | (b) Profile-only statements RS-1 to RS-7 (four speech, three issue), written to quiz standards |
| Q13 | Model roles | (b) Opus researcher, GPT recall researcher and refuter (different family), human sign-off |
| Q14 | Update cadence | (b) Monthly sweep plus event triggers |
| Q15 | Disputes | (b) Dispute form that requires a counter-source; no open editing |
| Q16 | Whipped or collective votes | (b) Count them and flag them; never decisive alone |
| Q17 | Quiz integration | (b) A "you" column on the card, computed locally; no grid placement in v1 |
| Q18 | Former office-holders | (a) Incumbents only; archive people who leave office |
| Q19 | Balance sign-off for the core statement set | (b) A reviewer of a different leaning approves the core set before research |
| Q20 | Electoral law and election timing | (b) Legal review covers electoral law; no publishing or updates in a country's regulated or campaign period |
| Q21 | Archived snapshots and copyright | (b) Publish hash, link and short quote; keep full snapshots private |
| Q22 | Long gap with no acknowledged change | (b) More than 10 years apart → capped at arguable, labelled "long gap" |
| Q23 | Role mismatch | (a) Never decisive |

## Details

### Q1. Definition of "peaceful speech" (blocks every R6, RS-1 to RS-4 and lib-06 verdict)

In the pilot, every speech candidate ended as *arguable* for the same reason: the action was framed as incitement, hate, terrorism support or immigration enforcement, and without a definition the charity check could not settle whether that framing was fair.

- **(a) Imminence standard:** speech is peaceful unless it is a true threat, incitement to imminent lawless action, or conduct beyond expression (for example material support, or blocking a road). Expressing support for a banned group, burning a flag and offensive insults all count as speech.
- **(b) ICCPR Art. 19/20 standard:** like (a), but it also allows restricting "advocacy of national, racial or religious hatred that constitutes incitement to discrimination, hostility or violence". This fits UK, AU and EU law better, and resolves fewer candidates.
- **(c) Each country's own law:** this makes contradictions nearly undetectable, because anything legal by definition passes.
- **(d) (a) as the standard, with local legal framing shown beside each case.**

**Rec: (d).** It makes verdicts reproducible and puts the disagreement in one visible place. Together with the relabelling rule (README §3 Fit) it matches Max's example: calling speech "violence" does not change whether it is peaceful. Publish the edge-case list: harassment campaigns, doxxing, defamation (civil, not jail), and speech by non-citizens (deportation for speech counts as punishment for speech).

### Q2. Countries

- **(a)** US, UK, AU only (the pilot's set).
- **(b)** v1: US, UK, AU, Canada and New Zealand (English-language, good open data). v2: Ireland, Germany, France and the European Parliament (HowTheyVote.eu); quotes kept in the original language with translations.
- **(c)** Include the EU from the start.

**Rec: (b).** Translation doubles the verbatim-check problem, and GDPR needs advice first (README §11).

### Q3. Sample size and selection rule

- **(a)** Heads of government only (about 5).
- **(b)** Heads of government plus opposition leaders. For the US: the President plus both congressional leaders of the opposition party, which removes the pilot's ambiguity. About 12 people.
- **(c)** (b) plus cabinets and shadow cabinets (about 150 people).

**Rec: (b) for v1, then (c) by the same rule.** Fix a snapshot date. Never add people because they are in the news.

### Q4. Consistent / inconsistent lists, and trust language

Max's original framing asks for lists of who acts consistently with their stated values and who does not, and calls a contradiction "an indicator of untrustworthiness".

- **(a) Lists, to a fixed rule.** Each person gets one of three labels (README §3 "Person label"):
  - **Inconsistent:** at least one published decisive candidate.
  - **Consistent:** at least K on-point rows with both says and does, no decisive candidate, and at most X% of those rows ≈.
  - **Insufficient record:** everyone else.

  K and X are fixed before research. The label is always shown with the record span and row count, and lists are alphabetical within each label. Proposed values: K = 8, X = 25%. Under these, a long record is not penalised by its count alone (one decisive entry is enough for "inconsistent", for anyone), and a short record lands in "insufficient", not "consistent".
- **(b) No lists.** Verdicts appear per entry only; users filter a statement to see everyone's row and draw their own conclusion.
- **(c) (a), gated on legal review.** Build the labels and lists to the rule in (a) from the start, and show them publicly only once the defamation review (Q10) clears them. Per-entry verdicts until then.

In every option, the word "trustworthy" (or "hypocrite") does not appear; the label describes the record, not character.

**Rec: (c).** It keeps the feature Max asked for, and the three-way rule is testable and not a ranking. The caution is legal: "inconsistent" next to a name is at least as risky as a "decisive" entry under UK and AU law, so it waits for advice. A weaker point against early lists: in the pilot, candidate counts grew with record length, but that was 6 people with 1 decisive candidate, so it is a warning sign rather than a finding. Pick (a) to publish lists without waiting, or (b) to drop them.

### Q5. Right of reply

- **(a)** None.
- **(b)** Notify each office before publishing, with a 14-day window. Show the reply verbatim (length-capped) next to the entries it answers. Replies stay open after publication.
- **(c)** Replies after publication only.

**Rec: (b).** This is a key part of the UK and AU defences, and it is fair.

### Q6. Who signs off decisive verdicts

- **(a)** Max alone.
- **(b)** Max plus one reviewer who leans differently. Both must agree.
- **(c)** A panel of three, balanced across sides.

**Rec: (b) for v1, (c) at scale.** If they disagree, the lower verdict wins (README §3 "Verdict rules").

### Q7. Public wording of verdicts

"Decisive" is the riskiest word on the card.

- **(a)** Show decisive, arguable and refuted as they are.
- **(b)** Keep those names internally and show "direct conflict", "disputed" and "resolved" publicly.
- **(c)** Show only the evidence pairs, with no verdict label.

**Rec: (b).**

### Q8. Scope of rules-for-thee

"Allies" means the person's party or coalition, their appointees, and their family; not donors or sympathisers (README §3).

- **(a)** Anything, including reported personal conduct.
- **(b)** Personal conduct only when an official body has made a finding. Decisions that exempt self or allies from a standard the person set always count.
- **(c)** Decisions only.

**Rec: (b).**

### Q9. Self-labels ("classical liberal", "conservative", "progressive")

Max's motivating example is a contradiction between a label and an action.

- **(a)** Ignore labels; use stated principles only.
- **(b)** Publish a label→statement table (for example: "classical liberal" implies agreeing with R6, RS-1 to RS-4 and lib-03). Apply it only where the person used the label of themselves, verbatim. **A conflict reached through a label alone is capped at arguable**; it can be decisive only if the person also stated the principle directly.
- **(c)** Let researchers interpret labels case by case.

**Rec: (b).** Be clear what this costs: a pure "calls themselves a classical liberal, jailed a critic" case shows as *arguable*, not *direct conflict*. Max's example reaches decisive only when the person has also stated the principle (for example, opposing jail for peaceful critics) in their own words. Pick (c) to let labels alone carry decisive verdicts, at the cost of reproducibility.

### Q10. Legal route and publisher

- **(a)** Publish personally, on opinion framing alone.
- **(b)** Get AU and UK defamation review before naming anyone, publish through an entity, and keep evidence out of the public repo until cleared.
- **(c)** Publish US profiles only (lower risk) at first.

**Rec: (b).** (c) is a fallback if review is slow.

### Q11. Where it lives

- **(a)** Inside the quiz SPA, with data in this public repo.
- **(b)** A route on the quiz site, with data in a private repo until cleared and then published as static JSON.
- **(c)** A separate site.

**Rec: (b).**

### Q12. Record statements

Draft wording is in README §5.

- **(a)** Add them to the quiz.
- **(b)** Profile-only statements, written to quiz item standards, which can be promoted to the quiz later. The set is RS-1 to RS-4 (on-point speech statements: banned-group support, flag desecration, deporting non-citizens for speech, withdrawing funds over expression) plus RS-5 to RS-7 (net zero, digital ID, under-16 social media).
- **(c)** Skip them.

**Rec: (b).** RS-1 to RS-4 are what let the speech test reach decisive, because without them that evidence is only adjacent to R6.

### Q13. Model roles

- **(a)** One model family for every agent role, human sign-off.
- **(b)** Claude Opus as researcher; GPT-6.1-sol as recall researcher and adversarial refuter (a different family, so the two are less likely to share blind spots); human sign-off. The refuter can only downgrade a candidate.
- **(c)** (b), plus a third family (for example GLM) as a second recall researcher.

**Rec: (b).**

### Q14. Update cadence

- **(a)** Quarterly. **(b)** A monthly sweep plus triggers on major votes and orders. **(c)** Continuous.
- **Rec: (b).**

### Q15. Disputes

- **(a)** None. **(b)** A form that requires a counter-source (URL plus verbatim quote), with public status and reasons. **(c)** Open, wiki-style editing.
- **Rec: (b).**

### Q16. Whipped or collective-responsibility votes

- **(a)** Exclude them. **(b)** Count them and flag them; never decisive alone. **(c)** Treat them like free votes.
- **Rec: (b).**

### Q17. Quiz integration

- **(a)** None. **(b)** A "you" column on the card, computed client-side from the user's local result. **(c)** Place politicians on the 7×7 grid, or match users to politicians.
- **Rec: (b).** (c) would turn the feature into a voting-advice tool and needs its own design.

### Q18. Former office-holders

- **(a)** Incumbents only; archive anyone who leaves office. **(b)** Include recent former leaders.
- **Rec: (a).**

### Q19. Balance sign-off for the core statement set

A fixed set is the same for everyone but not necessarily balanced: three speech items were added for importance, and the red lines have one author.

- **(a)** No extra review; the set is fixed and published.
- **(b)** A reviewer from a different political leaning approves the core set (and RS-1 to RS-7) before research, checking that each side faces comparable exposure. The set is then frozen.
- **(c)** (b), plus a public comment period on the set.

**Rec: (b).**

### Q20. Electoral law and election timing

- **(a)** Ignore it; this is commentary, not campaigning.
- **(b)** The legal review (Q10) covers AU electoral-matter authorisation and UK non-party campaigner rules. No new profiles or verdicts are published for a country during its regulated or campaign period; existing pages stay up unchanged.
- **(c)** (b), and take profiles offline during campaigns.

**Rec: (b).**

### Q21. Archived snapshots and copyright

- **(a)** Publish full snapshots next to each citation.
- **(b)** Publish the hash, the link, the public-archive link and the short quote; keep full snapshots private, available to a reviewer or court on request.
- **(c)** Do not keep our own snapshots; rely on public archives.

**Rec: (b).** (c) failed in the pilot: the public archive rate-limited the agents.

### Q22. Long gap with no acknowledged change

Words from 20 years ago, an action today, and no public statement of a change of view.

- **(a)** Treat it like any other pair.
- **(b)** If the two are more than 10 years apart, the candidate is capped at arguable and labelled "long gap".
- **(c)** Exclude pairs more than 10 years apart.

**Rec: (b).** People change their minds without announcing it; the cap avoids treating that as a contradiction while keeping it visible.

### Q23. Role mismatch

Words in one role (for example, in opposition) against an action in a role with different powers (for example, as a minister years earlier).

- **(a)** Never decisive; shown as arguable at most, with the role-mismatch flag.
- **(b)** Can be decisive if both sides are on-point and the roles had the power to act on the statement.

**Rec: (a).** The pilot found that comparing across roles was the weakest test it ran.

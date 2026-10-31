# Politicians: says vs does (draft spec, PARKED)

Status: **parked** (2026-10-31). Nothing here is built. This doc records the intent, the draft design and what the pilot taught, so the feature can be picked up later. Open decisions are in [QUESTIONS.md](QUESTIONS.md). Method lessons from the pilot are in [PILOT-NOTES.md](PILOT-NOTES.md).

This repo is public. These docs contain **no findings about named or identifiable people**. Examples use fictional people only. The pilot's raw evidence is kept outside the repo (see PILOT-NOTES) and must not be committed until it has had legal review.

Passages marked **(pending Qn)** depend on an open question and are written to the recommended answer. They change if Max picks differently.

## 1. Intent

Max's request, paraphrased:

- Profile a sample of politicians from the US, the EU, the UK, Australia and similar democracies.
- Derive every position from public statements and records that can be cited.
- Main feature: show which politicians act consistently with their stated values and which say one thing and do another.
- Motivating example: someone who calls themselves a classical liberal but supports jailing people who peacefully criticise the government, including by relabelling speech as "violence". That breaks their own stated values and is a sign they cannot be trusted. Quotes should show the contradiction. "Rules for thee, not for me" counts too.
- Each politician gets a profile of what they **claim** and what they **are**. Words decide the claim and actions decide what they are. For legislators the two overlap.

How it fits 12 Axes²: the quiz asks each user where they stand on a statement "in your ideal system" and "here and now". This feature asks the same statements of a politician's public record, as "what they say" and "what they do". The shared statement bank is what makes a politician's card comparable to the user's own answers.

## 2. Goals, non-goals, anti-goals

**Goals**

- A **sourced record card** per person. Each row is one statement: what they said (dated, verbatim, linked), what they did (dated, linked, with the role they held at the time), and a cell status.
- Contradictions that hold up. Every candidate passes a written charity check and an adversarial review. Candidates that fail are still shown, marked refuted.
- Comparability: everyone is mapped on the same core statements, so an empty cell means something.
- Reproducibility: anyone can follow a citation to an archived, hashed copy and find the quoted words. Verdicts follow written rules (§3), so two reviewers applying them reach the same result.
- Symmetry: the same standards apply to every side, and the selection rule is fixed in advance.
- **Consistent / inconsistent lists (pending Q4).** Max asked for lists of who acts on their stated values and who does not. The recommended route builds them to a binary, testable rule (§3 "Person label") and publishes them only once legal review clears it (Q10). Until then the card shows per-entry verdicts only.

**Non-goals**

- Fact-checking factual claims ("unemployment fell by X"). That is a separate discipline.
- A complete voting-record database. We link to official ones.
- Predicting future votes, or placing politicians on the user's 7×7 grid (v1).
- Personal lives, except conduct that breaches a standard the person set for others and that an official body has found (see rules-for-thee).

**Anti-goals** (things the feature must never become)

- A numeric hypocrisy score, league table or ranking by number of contradictions. Candidate counts grow with how long and how well documented a record is (PILOT-NOTES §7, from a small sample). A three-way person label (pending Q4) is not a ranking, because it is a fixed rule applied per person and always shown with the record span.
- Motive language ("lied", "cynical", "doesn't really believe"). We report what was said and done.
- People picked because they are in the news, or picked by side.
- AI verdicts published without human sign-off on anything decisive.
- Party scorecards.

## 3. Definitions

| Term | Meaning |
|---|---|
| **Claim** | The person's own public words, dated and attributable: speech, transcript, media release, floor speech, signed article, own post, platform. A paraphrase by a journalist is a weaker claim and is labelled as reporting. |
| **Self-description** | A special claim: a label the person applies to themselves ("a classical liberal", "a conservative"). It is recorded verbatim. It counts as a claim about a specific statement only through a published label→statement table (see QUESTIONS Q9), or where the person defined the label in their own words. |
| **Action** | Something done with the power of an office: a vote, sponsoring or introducing a bill, an executive order or regulation, an appointment, a pardon, an enforcement or prosecution decision, litigation, a budget line, a signed directive. Each action records the role held at the time. |
| **Overlap (legislators)** | Introducing or sponsoring a bill is an action whose text is also words. A floor speech is words. A recorded vote is an action. A whipped or collective-responsibility vote is an action, flagged as such, and can never be decisive on its own. |
| **Position** | Where the claim or action sits on the statement, on a five-step scale: agree (+2), lean agree (+1), mixed (0), lean disagree (−1), disagree (−2). Or n/a when there is no evidence. |
| **Fit** | How directly the evidence addresses the statement: **on-point** (it is the statement) or **adjacent** (next to it). **Relabelling rule:** an action that punishes speech meeting the published definition of peaceful speech (Q1) is on-point for R6, whatever the actor calls it ("violence", "hate", "terrorism support", "immigration enforcement"). The record statements RS-1 to RS-4 (§5) give each common action type its own on-point statement. |
| **Cell status** | Derived by rule, see "Cell status rule" below. Icons: ✔ consistent · ≈ mixed or in tension · ? one side only · ✘ contradiction. |
| **Contradiction candidate** | A pair on the same statement (a principle claim plus an action, or two claims) that cannot both hold when read literally. A candidate is a hypothesis, not a finding. |
| **Charity check** | Four tests answered in writing for every candidate. Each has a rule for when it **dissolves** the candidate; see "Charity check rules" below. |
| **Decisive** | Passes every gate in "Verdict rules" below. |
| **Arguable** | The residue: not refuted and not decisive. The written reason names which decisive gate failed. |
| **Refuted** | At least one charity test dissolves it by rule. It stays on the card, with the reason. |
| **Pending** | Internal only: the candidate is still in research or review. Never published. |
| **Rules for thee** | The person asserts a standard for others (opponents, citizens, other countries) and then exempts themselves or their allies from it, by their own conduct or their decisions. Personal conduct counts only when an official body has made a finding (a fine, ruling or inquiry report). |
| **Allies** | For rules-for-thee: (a) members of the person's own party or coalition; (b) people the person appointed, or who serve at their pleasure; (c) the person's family. Donors and ideological sympathisers do **not** count, because the link cannot be shown from the record without judgement. |
| **Peaceful speech** | Must be defined and published before any speech verdict can be reproducible. This is Max's decision (QUESTIONS Q1). |
| **Person label (pending Q4)** | **Inconsistent:** at least one published decisive candidate. **Consistent:** at least K on-point rows with both says and does, no decisive candidate, and at most X% of those rows ≈. **Insufficient record:** everyone else. The label is always shown with the record span and row count. K and X are fixed before research (Q4 recommends K = 8, X = 25%). |

### Cell status rule

With *s* and *d* the says and does positions (−2 to +2):

1. One of them n/a → **?** (`says-only` or `does-only`).
2. |*s* − *d*| ≤ 1 → **✔** (`consistent`). Examples: agree with lean agree; mixed with lean disagree.
3. Otherwise → **≈** (`mixed`). Examples: agree with mixed; lean agree with lean disagree.
4. Any row where one side is ≥ +1 and the other ≤ −1 (opposite sides) **must** have a contradiction candidate on file.

Candidate verdicts then override the row icon:

| Candidate verdict on the row | Row icon |
|---|---|
| Decisive | ✘ (`contradiction`), whatever the positions say |
| Arguable | ≈, even if the positions alone gave ✔ |
| Refuted | No effect; the icon follows the positions |
| Pending | Row not published |

If a row has several candidates, the strongest verdict sets the icon.

### Charity check rules

Each test dissolves the candidate (→ refuted) only if its rule is met. A test whose rule is not met does not dissolve it.

| # | Test | Dissolves only if |
|---|---|---|
| 1 | **Consistent reading** | A reading under which both hold is grounded in the person's **own words**, in the same source or one within 90 days. A reading the researcher constructs does not count. |
| 2 | **Acknowledged change** | The person publicly stated the change of view, the statement is dated, and it came **before** the action. The row then shows a dated change of position instead of a contradiction. |
| 3 | **Legally compelled** | A court order, statute, treaty or binding collective decision required the action **and left no discretion**. A choice among lawful options is not compelled. |
| 4 | **Context** | The full source reverses or materially qualifies the quoted words (for example, the quote was the speaker stating an opponent's view). |

**Drift (pending Q22).** If the principle claim and the action are more than 10 years apart and no change was acknowledged, the candidate cannot be decisive. It is arguable, labelled "long gap".

**Role mismatch (pending Q23).** If the words come from one role and the action from a role with different powers (for example, opposition speech versus a ministerial act ten years earlier), the candidate cannot be decisive.

### Verdict rules

A candidate is **decisive** only if all of these hold:

1. No charity test dissolves it.
2. Its fit is on-point (after applying the relabelling rule).
3. Both sides rest on primary sources.
4. No drift or role-mismatch cap applies, and the conflicting action is not a whipped or collective vote on its own.
5. If it was reached through a self-label only (Q9), it is capped at arguable.
6. The adversarial reviewer (§8) tried and failed to refute it.
7. Human sign-off (Q6).

**Reviewer disagreement:** if the researcher, reviewer and signers disagree, the lowest verdict wins (decisive → arguable → refuted). The disagreement and each party's reason are recorded in `review`.

## 4. Evidence standards

- **Verbatim and archived.** Every quote is checked mechanically against the archived text of the cited page. Every cited page is archived (our own snapshot plus a public archive where possible) and its SHA-256 recorded, so citations survive link rot and edits. Only the hash, the link and a short quote are published; our own snapshots stay private (copyright, Q21).
- **Primary first.** Prefer official records: parliament and congress APIs, official gazettes, government sites, the person's own site, transcripts. Reporting is allowed for quotes from interviews with no published transcript, and is labelled as reporting. Reporting is never the only source for a decisive verdict.
- **Votes from official records only.** Search-engine summaries of votes are not evidence (the pilot caught a wrong one). Votes inferred from tallies ("the only member of party X opposed") are marked as inferred.
- **Dated, with the role at the time.** Each entry carries its date and the office the person held then. Comparing words from one role with actions from another is allowed but flagged ("role mismatch") and cannot be decisive (Q23).
- **Absence is not evidence.** "Never did X" cannot be shown by a fetched page. Words without actions stay "?" even when the absence is widely known.
- **Neutral wording.** "Said X on date; voted Y on date." Use "tension" and "contradiction candidate". No motive language.
- **Symmetry.** The same core statements and the same standard of proof for everyone.

## 5. Selection

- **Pre-registered by office** before any research, with a fixed snapshot date. Start with heads of government and opposition leaders in 4–6 democracies (about 10–15 people). Then add cabinets and shadow cabinets by the same rule.
- Write the rule so it is unambiguous. The pilot's "most senior congressional leader of the other party" fitted two people. Recommended fix: include both chamber leaders.
- When an office changes hands, the snapshot date decides who is profiled. The outgoing holder is archived, not deleted.
- **Statements:** the same 12–15 core statements for everyone (statements that map well, see PILOT-NOTES §4), the red-line statements R1–R10, plus profile-only "record statements" (Q12).
- **Core set balance (pending Q19).** A fixed set is not automatically a balanced one: three speech items were added to the core for importance, and the red lines have a single author. Before research, a reviewer from a different political leaning checks that each side faces comparable exposure, and the core set is frozen with their sign-off.
- The R1–R10 red-line statements are being added to the quiz on another branch. They are the natural core of this feature, because they test principles that every side claims to hold. R9 now reads "target civilians on purpose, not just military targets".
- Researchers choose statements where the record is rich, not where a contradiction looks likely. Coordinators do not hand researchers contradiction-shaped leads.

**Record statements** (draft wording; written to quiz item standards so they can be promoted later):

| Id | Draft statement | Why |
|---|---|---|
| RS-1 | Non-violent expressions of support for a banned organisation should not be a crime. | On-point for a common R6-adjacent action type |
| RS-2 | Burning or defacing the national flag should not be a crime. | Same |
| RS-3 | Non-citizens should not be removed from the country for lawful political speech. | Same |
| RS-4 | Public funding should not be withdrawn from people or institutions because of their lawful political expression. | Same |
| RS-5 | The country should legislate a binding net-zero emissions target. | No quiz statement covers climate targets |
| RS-6 | Citizens should be required to hold a national digital ID. | No quiz statement covers ID schemes |
| RS-7 | Children under 16 should be banned from social media by law. | No quiz statement covers platform age rules |

RS-1 to RS-4 let Max's flagship test (speech relabelled as something else) reach decisive on an on-point statement, where R6 alone would usually be adjacent.

## 6. Data model (sketch)

One JSON file per person, validated against a schema. It extends the pilot's shape with archiving, roles, review and disputes. The example below is **fictional data** about a fictional person.

Changes from the pilot's shape: `status` values `claims-only` and `actions-only` are renamed `says-only` and `does-only`, and `contradiction` is added; candidates gain a `pending` verdict and a `review` trail.

```jsonc
{
  "schema": "says-does/1",
  "person": {
    "id": "xx-example-01",                   // stable id; no names in ids
    "name": "Example Person", "country": "XX",
    "selection": { "rule": "head-of-government", "snapshot": "YYYY-MM-DD" },
    "roles": [ { "office": "Head of government (fictional)", "from": "YYYY-MM-DD", "to": null } ]
  },
  "as_of": "YYYY-MM-DD",
  "self_description": [ "ev-000" ],          // evidence ids, like everything else
  "entries": [
    {
      "statement_id": "glo-01",              // shared with the quiz bank
      "says":  { "position": "agree",      "evidence": [ "ev-001" ] },
      "does":  { "position": "lean-agree", "evidence": [ "ev-002" ] },
      "status": "consistent|mixed|says-only|does-only|contradiction",
      "fit": "on-point|adjacent",
      "confidence": "high|medium|low",
      "note": "…"
    }
  ],
  "candidates": [
    {
      "id": "c-01", "kind": "contradiction|rules-for-thee",
      "statement_ids": ["glo-01"],
      "principle": "ev-001", "conflict": "ev-003",
      "charity_check": {
        "consistent_reading": { "dissolves": false, "evidence": [], "note": "…" },
        "acknowledged_change": { "dissolves": false, "evidence": [], "note": "…" },
        "legally_compelled":   { "dissolves": false, "evidence": [], "note": "…" },
        "context":             { "dissolves": false, "evidence": [], "note": "…" }
      },
      "caps": [ "long-gap|role-mismatch|whipped|label-only" ],
      "verdict": "pending|decisive|arguable|refuted",
      "reasoning": "…",
      "review": [
        { "by": "model:<id>|human:<handle>", "role": "researcher|recall|refuter|signoff",
          "verdict": "…", "date": "YYYY-MM-DD", "notes": "…" }
      ]
    }
  ],
  "evidence": {
    "ev-001": {
      "kind": "claim|action",
      "action_type": "vote|bill|executive|appointment|pardon|enforcement|litigation|budget|other",
      "whipped": false, "inferred": false,
      "date": "YYYY-MM-DD", "role_at_time": "…",
      "quote": "verbatim text", "source_title": "…",
      "source_type": "primary|reporting",
      "url": "…", "canonical_url": "…",
      "archive": { "snapshot": "archive/…html", "sha256": "…", "public_archive": "…" }
    }
  },
  "replies":  [ { "date": "…", "from": "office of …", "text": "…", "re": ["c-01"] } ],
  "disputes": [ { "id": "d-01", "re": "c-01", "counter_source": "ev-…",
                  "status": "open|upheld|rejected", "reason": "…" } ],
  "changelog": [ { "date": "…", "change": "…" } ],
  "research_log": { "tokens": 0, "tool_calls": 0, "pages_failed": [] }
}
```

Evidence is stored once and referenced by id, so a quote shared by an entry and a candidate cannot drift. Archives live next to the JSON in a **private** data repo until publication is cleared.

## 7. UI sketch

- **Index:** people grouped by country, then office, in alphabetical order. No sort by contradiction count and no totals. A filter by statement ("show everyone's row for R6") is the main comparison view.
- **Lists (pending Q4):** under the recommended answer, the index can later group people by person label (consistent / inconsistent / insufficient record), each shown with record span and row count, once legal review clears it. Within a group, order stays alphabetical.
- **Profile card:**
  - Header: name, office, the dates the record covers, "as of", the person label if enabled (pending Q4), and a link to the method.
  - "Says they are": self-description quotes.
  - The statement table, one row per statement: *you* (the user's own answer, if they took the quiz, shown locally only) · *says* · *does* · cell icon · fit · confidence. Rows expand to show quotes, dates, roles and archive links.
  - Candidates, including refuted ones, each with its charity check visible.
  - Rules for thee (same format).
  - Right of reply, shown next to the entries it answers.
  - Disputes: a button on every entry. It requires a counter-source (URL plus verbatim quote). Disputes are listed publicly with their status and reasons.
  - Changelog.
- Counts appear only per person and alongside the size of the record ("14 statements mapped, record 2003–2026"), never ranked across people.

## 8. Pipeline

1. **Freeze the selection** (office rule plus snapshot date) and the core statement set (with the balance sign-off, Q19).
2. **Harvest** from official APIs: congress.gov, govinfo, the UK Parliament APIs (Commons votes, Hansard, bills), TheyWorkForYou, OpenAustralia and TheyVoteForYou. Use scraping only as a fallback (about a third of the pilot's fetches failed).
3. **Researcher agent** per person: maps evidence onto the core statements, the red lines and the record statements; records consistencies as carefully as tensions; runs the charity check on each candidate. Fetched pages are treated as data, never instructions (prompt-injection guard: page text is passed in a quoted block, and the agent's output is schema-validated).
4. **Recall check:** an independent second researcher on a different model family maps a sample of each person's statements (at least a third, chosen at random from the core set) without seeing the first researcher's output. The two candidate sets are diffed; anything only one found goes to review. Miss rates are compared by side.
5. **Mechanical gates:** a verbatim quote check against the archived text, the archive with its hash, and schema validation.
6. **Adversarial reviewer** on a different model family. It tries to refute every candidate, checks the context, attribution and fit, and can downgrade a candidate but never upgrade it.
7. **Human sign-off** for anything decisive and for every rules-for-thee entry.
8. **Right of reply** window, then publish (timing checked against election periods, Q20).
9. **Maintenance:** a monthly sweep for incumbents, plus refreshes triggered by major votes or executive orders. Disputes are handled continuously.

## 9. Cost

Pilot measurements: about 250k tokens per profile (range 240–290k), 18–24 minutes of agent time, 81–162 tool calls. Most of the cost went on getting past blocked sites. Adversarial review roughly doubles this, to about 500k tokens per profile, and the recall check on a third of statements adds roughly another 80k, so a 10–15 person v1 costs about 6–9M tokens, plus human review time for decisive entries and the cost of legal advice. Using the official APIs should cut the research share noticeably. Monthly delta sweeps should cost much less than a first profile, but this has not been measured.

## 10. Risks and mitigations

| Risk | Mitigation |
|---|---|
| **Selection of people** | Office rule pre-registered, with a snapshot date. |
| **Selection of statements and events** (the bigger channel) | Fixed core statements for everyone, with a balance sign-off from a reviewer of a different leaning (Q19). No contradiction-shaped leads. Consistencies recorded. Refuted candidates shown. |
| **Omission bias** | The refuter only catches false positives. A researcher that misses contradictions for one side (model bias, slanted leads) is caught only by the recall check (§8 step 4), which diffs two independent researchers and compares miss rates by side. |
| **Record length** | More record means more candidates. Show the record span and statement count, and never rank. |
| **Recency** | Sources skew to the last two years, and new office-holders' actions come from earlier roles. Mitigate with role-at-time and role-mismatch flags, plus targeted archive searches for older material. |
| **Mapping fairness** | A wrong mapping is the easiest way to manufacture a contradiction. Use the fit rating; adjacent fit is never decisive; the reviewer checks fit. |
| **Definition dependence** (speech, peaceful, violence) | Publish the definitions and score every case against them, so the disagreement sits in one visible place. |
| **Accuracy** (search summaries, roll-call parsing, bad secondary sources) | Votes come only from official records. Parse roll calls against a known vote. Inferred votes are flagged. |
| **Asymmetry across sides** | Same statements and standards for everyone. Review the distribution of verdicts and recall misses by side before publishing, as a check on the method, not as a target. |
| **Prompt injection** | Fetched partisan pages can carry text aimed at agents. Pages are passed as quoted data, outputs are schema-validated, every quote is verified against the archive, and the reviewer runs on a different model. |
| **Defamation** | See §11. |
| **Electoral law** | See §11 and Q20. |
| **Copyright** | Publish hash, link and a short quote; keep full snapshots private (Q21). |
| **Gaming and brigading of disputes** | Disputes need a counter-source. Decisions are public, with reasons. |

## 11. Legal (not legal advice)

- **UK and Australia:** labelling a named person's words and conduct "contradictory" carries an imputation. The relevant defences are honest opinion based on facts that are stated, and public interest. They depend on verbatim sourcing, clear framing as opinion with the facts shown, and a right of reply. Both jurisdictions now have a serious-harm threshold. "Decisive" is the highest-risk label, and a published "inconsistent" person label (pending Q4) is at least as risky.
- **US:** public-figure plaintiffs must show actual malice, so the risk is lower, but sourcing still matters.
- **Electoral law (Q20):** in Australia, material that could affect how people vote may count as "electoral matter" and need an authorisation statement. In the UK, spending on material that could be seen as promoting or opposing parties during a regulated period can trigger non-party campaigner rules. Publishing or updating close to an election raises both risks; a pre-election freeze is one option.
- **Copyright (Q21):** republishing full archived news pages is likely infringement. Short quotes for criticism and review are generally covered (fair dealing in AU and UK, fair use in the US). Publish the hash, link and quote only.
- **EU expansion:** political opinions are special-category personal data under GDPR Art. 9. Data that the person has "manifestly made public" (Art. 9(2)(e)) and national journalism exemptions (Art. 85) probably apply, but this needs advice before any EU profile.
- **Before publishing anything with a named person:** get a defamation review (AU and UK) that also covers electoral law, decide who the publisher is (Max personally or an entity), and keep evidence out of this public repo until cleared.

## 12. Phased plan

| Phase | Work | Exit criterion |
|---|---|---|
| **P0 Decide** | Answer QUESTIONS.md, especially Q1 (peaceful speech), Q4 (lists and trust language), Q10 (legal), Q19 (core balance) | Decisions recorded here |
| **P1 Tooling** | Schema plus validator, API harvesters, archiver plus hash, verbatim verifier, the record statements, the label→statement table | Runs end to end on one person privately |
| **P2 Private v1** | 10–15 people by office: researcher, recall check, refuter, human sign-off | All entries reviewed. Verdicts and recall misses checked by side |
| **P3 Private UI** | Card, index, statement view, dispute and reply plumbing, served locally | Max sign-off on the presentation |
| **P4 Legal and reply** | Defamation and electoral-law review, right-of-reply letters, replies included | Legal clearance |
| **P5 Publish** | Public route, changelog, monthly sweeps; person labels only if Q4 and legal allow | First sweep completed |
| **P6 Expand** | Cabinets, more countries, EU institutions | Per QUESTIONS Q2 and Q3 |

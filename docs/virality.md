# 12 Axes²: launch and virality playbook

Status: playbook for Max, 2026-10-31. Sources are `docs/research/05-virality.md` (cited as **R05 §n**), `docs/research/02-popular-12axes-vercel.md` (**R02**), and the design spec (`docs/superpowers/specs/2026-10-31-12xx2-design.md`, cited as **spec §n**). Feature claims were checked against `src/ui/ShareSheet.tsx`, `src/share/card.ts`, `src/ui/ComparePage.tsx`, `src/ui/SharedPage.tsx`, `src/ui/ResultsPage.tsx`, `src/ui/router.ts` and `src/ui/Landing.tsx` as of today. Reddit and X rules are **UNVERIFIED**, because their pages were blocked during research. Read each sidebar before you post.

## 0. The hook

> **12 Axes² asks every political question twice: once for your ideal system, once for your country here and now. Then it shows you the gap.**

Why it spreads. People share labels, not methods (R05 §0.1). Most quizzes hand you one label. This one hands you a **pair** ("In theory: A · Here and now: B") and a story to go with it:

- **The pair is a conversation starter.** "I'm an anarcho-capitalist… *in theory*" invites the question "and in practice?". Every result carries its own follow-up question, and that question is the CTA: **"What's your gap?"** It's already printed in the footer of every card (`card.ts`, `drawCard`).
- **It flatters the sharer without insulting anyone.** A gap reads as pragmatism, not partisanship, so posting it says "I'm nuanced" rather than "I'm on team X". That lowers the spiral-of-silence cost of posting politics (R05 §2).
- **It's comparative by construction.** "Same ideals, different country" is the natural friend-compare and cross-border story. That's the Dane-vs-Iranian framing (spec §1).
- **It answers the most common complaint about these quizzes.** "Every answer is 'it depends'" now gets a real answer: *depends on where*.

The headline stat to lead with is the **pair**, not a number. The Reality Gap is a noisy statistic: random clicking scores about 38, which is why the card prints that baseline. Never make "Gap NN/100" the hero claim (R05 critic addendum B).

---

## 1. Positioning and hooks

**Name in text:** "12 Axes²", and write "12 Axes Squared" or "12axes2" where people will search for it. The superscript isn't searchable, and "12 Axes" now refers to at least three projects (R05 §1.2). Wherever the original 12axes is mentioned, add: *"Inspired by the open-source 12axes test. Not affiliated with 12axes.vercel.app."*

**Primary tagline** (already the landing H1): **"Your politics, in theory and in practice."**

| Audience | Headline / opener |
|---|---|
| General social | "Every political quiz asks what you believe. This one asks twice: in a perfect world, and in your country right now." |
| Quiz veterans (PCM, r/political_compass) | "The test that finally lets you answer 'it depends' — and tells you *on what*." |
| Pragmatists / centrists | "Same ideals. Different country. Different answer." |
| Ideologues (any side) | "Find out how far your here-and-now politics drift from your ideal system." |
| International / non-US | "Would you vote the same way in Denmark as in a country where the courts are for sale?" |
| Tech / HN | "A political quiz with no backend: results live in the URL fragment, acquiescence-proof scoring, thresholds calibrated by seeded simulation." |
| Privacy-minded | "No analytics, no cookies, no third-party requests. Open DevTools and watch." |
| Friend-compare | "Send me yours. Let's see if we agree in theory, in practice, or neither." |

**Language rules for all copy:**
- Call the gap *context*, *pragmatism* or *distance from ideal*. Never call it hypocrisy (spec §1 anti-goals).
- Don't use out-group bait ("finally proves the left/right is…"). It would add reach and cost us the defensibility claim (R05 §6.3).
- Don't use accuracy hype. Avoid "scientific", "100% precise", "reveals your true ideology". Prefer "honest labels, error bars, published method".

---

## 2. Pre-launch checklist

### 2.1 Blockers (must be done before any public post)
- [ ] **Real archetype catalogue wired in.** `src/data/archetypes.ts` currently imports `content/archetypes/archetypes.json`, which holds 4 placeholder archetypes ("Placeholder Left" and so on). The coded catalogue (`content/archetypes/catalogue.json`, ~49 entries) must be scored, validated and wired in, with `CATALOGUE_VERSION` frozen. Share links decode against that version forever (spec §6.1).
- [ ] **Domain chosen**, with an ASCII-searchable form (`12axes2.*` or `12xx2.*`).
- [ ] **`BASE_PATH` set** for the host (`vite.config.ts` reads it). Load the deployed build under its real path and confirm there are zero 404s for the favicon, `theme.js`, fonts and the routes.
- [ ] **`SITE_ORIGIN` + OG stubs.** The spec makes `SITE_ORIGIN` a required build variable, and `just build` calls `scripts/og.ts`. **Neither the variable nor that script exists yet**, and `index.html` still has an empty `<!--og-->` placeholder. Until the stub pages under `/p/<ideal>/<now>/` and `/p/<slug>/` are emitted, **"Link with preview" points at pages that 404 on a static host.** Either ship the stubs or hide that option for launch.
- [ ] **Root OG tags** with an absolute 1200×630 `og:image`, `twitter:card=summary_large_image`, and `theme-color` (`#141726`, already present). Discord uses `theme-color` for the embed bar.
- [ ] **Item review frozen**: external review, including a hostile reviewer from each side, plus the blind keying audit (spec §2.3). Mocked questions are the #1 streamer clip risk (R05 §5).
- [ ] **Methodology, Criticisms, Ideologies and Privacy pages final.** Criticism replies will link to them constantly.

### 2.2 Share-surface tests (real posts from a test account, not just validators)
| Surface | Check |
|---|---|
| X, Bluesky, Discord, Slack, WhatsApp, iMessage, Telegram, LinkedIn, Facebook | Root link and one preview link: image shows, title right, the full `#r=…Z` link isn't mangled |
| Reddit | The "Post to Reddit" intent (link post, title = share text) renders a thumbnail; the title fits |
| iOS Safari, Android Chrome | "Share image" opens the native sheet with the PNG attached |
| Desktop Firefox | Falls back to downloading the PNG (no `navigator.share` by default) |
| Instagram / TikTok / WhatsApp Status | Upload the **Story 9:16** card. See the safe-zone issue below |
| Each card size × Minimal on/off × a long archetype name | No text overflow; names readable at 300 px wide |
| Decode errors | Truncate a link by one character: you should get "looks cut off"; a corrupted link should say so |

**Known card issue:** in the 9:16 story layout the wordmark sits about 100 px from the top and the URL footer about 48 px from the bottom. Both are inside the Instagram/TikTok UI overlay zones (top ~250 px, bottom ~250–340 px; R05 §3.1), so the URL will be hidden behind the reply bar. Fix this before pushing story shares.

### 2.3 Accessibility, performance and privacy
- [ ] Keyboard-complete grid (arrows, Enter, `S`/`P`/`I`/`N`), visible focus, and the two-row mode working with a screen reader. Creators clip broken UIs.
- [ ] Contrast ≥ 4.5:1; `prefers-reduced-motion` respected; the light theme checked.
- [ ] Lighthouse on a mid-range phone over throttled 4G. First result card drawn in under 1 s after the share sheet opens.
- [ ] **The no-tracking promise as a feature.** CSP `connect-src 'none'` in the production build; the Playwright same-origin network test is green; **host-side analytics off.** That means no Cloudflare Web Analytics beacon and no "free analytics" toggle. Write the privacy page so anyone can verify the claim: "Open DevTools → Network, take the whole test, and see that nothing goes anywhere."
- [ ] The Privacy page states what the host can see: a preview link's path names the headline archetypes; the fragment is never sent (`PrivacyPage.tsx` already says this).

### 2.4 Assets to prepare
- 6–8 **example result cards** from personas, balanced across the spectrum, covering split, constant and "very constant" results. Personas are not real people, and they aren't tagged with real countries ("a citizen of a high-corruption state", not "Iran") (R05 critic D4).
- A **20–30 s vertical demo video**. Hook: "Do you think the same thing in a perfect world as you do right now?" → one statement answered on the grid, with chips appearing on a big split → results pair reveal → the dumbbell chart → a compare page. Spend about two-thirds of the runtime on results (R05 §6.4).
- The creator kit (§4) and canned replies (§7).

---

## 3. Launch sequence

**Timing.** US midterms are **Tue 2026-11-03**. Don't launch election week: subs lock political posts, and the noise drowns everything. Target **T0 = Tue 2026-11-17** (or the first Tue–Thu after the §2.1 blockers clear), mid-morning US Eastern. Post-election "why did that happen?" talk is a natural trigger for theory-vs-practice framing.

### 3.1 T0 order
1. Repo public (if open-sourcing), with description, topics and a README hero card.
2. **Show HN** (§3.4).
3. **r/political_compass** or r/PoliticalCompass (§3.2).
4. **X + Bluesky thread** (§3.3).
5. Stay in every thread for 6–8 hours. Fix real bugs live and say so ("fixed, thanks; deployed").

**T+1 to T+7:** PCM meme post; Discord servers; creator-kit outreach; r/SideProject; r/webdev "Showoff Saturday"; a "fixes from your feedback" changelog post.
**T+2 to T+4 weeks:** an LLM data post (§3.4); translations (PT-BR, ES) if demand shows up. The 12axes wave was multilingual (R05 §1.2).

### 3.2 Reddit
Norms that apply to every sub: post from an account with real history; disclose ("I made this"); never ask for upvotes; answer criticism in the comments; one post per sub, no cross-post blitz.

| Sub | Approach |
|---|---|
| r/political_compass, r/PoliticalCompass | The friendliest home: results-posting culture, and alt-tests are welcome (R05 §4.1). Post your own card as an image with a disclosure and the link in the body/comment. |
| r/PoliticalCompassMemes | **Meme-only in practice.** A bare quiz link will be removed or mocked. Post a meme (§6) and put the link in a comment only if the rules allow it. Users need a flair to post. Expect mockery of you personally; brings reach and some reputation risk (R05 §1.3). |
| r/samplesize | `[Casual]` flair, with "(Everyone)" at the end of the title (2022 mirror). Check the current rules allow a quiz that collects nothing. |
| r/SideProject, r/webdev (Showoff Saturday) | Build story: static SPA, Canvas cards, fragment links, CSP. |
| r/PoliticalDiscussion | **Don't post the quiz.** Optionally post a linkless discussion question: "Should the same policy be right in Denmark and wrong in a country with captured courts?" |
| r/politics, news subs | Don't. |

Ready-to-paste title (r/political_compass):
```
I made a 12-axis test that asks every question twice: your ideal system vs your country right now. Mine: [Ideal: A · Here and now: B]
```
Body:
```
I built this (disclosure: it's mine, free, no ads, no tracking). Every statement is answered on a 7×7 grid —
"in your ideal system" across, "here and now, in your country" down. You get matched twice, plus where and why
your two answers split. Pass is never counted as neutral; agreeing with everything scores dead centre.
Method and thresholds are published; criticisms of the originals are listed. Tear it apart — I'll fix what's wrong.
<link>
```

### 3.3 X and Bluesky
- **Launch thread (5 posts, one card each):** (1) hook + your own card; (2) the grid explained in one image ("same statement, two frames"); (3) two personas with identical ideals and different here-and-now results; (4) a "very constant" persona ("the unshakeable"); (5) privacy + method link.
- Post 1:
  ```
  Every political quiz asks what you believe. 12 Axes² asks twice: in your ideal system, and in your country right now.
  In theory I'm closest to A. Here and now, B. What's your gap?
  <link>
  ```
- Use the cards, not link previews, as the main media. Image posts outperform link cards, and the link goes in the post text.
- Quote-post existing "12 axes" discussion **once, with disclosure**. Never mass-reply under creator or celebrity posts; that's spam, and it gets screenshotted.
- Bluesky skews left. Keep the example set visibly balanced there anyway, because people will screenshot it across platforms.

### 3.4 Hacker News (once)
Politics is off-topic on HN, and past political-quiz Show HNs scored 1–6 points (n = 3, a weak prior; R05 §4.4). Lead with method and privacy.
```
Show HN: A political quiz that asks every question twice – ideal system vs. here and now
```
First comment (yours):
```
Single-frame quizzes mix up "what's right in principle" with "what my situation calls for". Here each statement is
answered on a 7×7 grid (ideal × here-and-now). Some details HN may like:
- No backend. Scoring runs on-device; share links carry scores (not answers) in the URL fragment, which browsers
  never send to the host. CSP has connect-src 'none'; a Playwright test asserts every request is same-origin.
- Acquiescence-proof: each axis averages the two key directions, so agreeing with everything scores 0, even with passes.
- Pass is missing data, not neutral.
- Every threshold (notable gaps, match labels, the careless-responding flag) is calibrated by a committed, seeded
  simulation; random clicking gets flagged, and the gap score always prints its random baseline (~38).
- It's not a validated instrument, and the method page says so.
Happy to be told where the method is wrong.
```
**Follow-up angle (T+2–4 wk):** "We ran N LLMs through both frames": publish their ideal-vs-now pairs. The 2022 "ChatGPT on the political compass" thread scored 243 points. It's honest data that we can produce without telemetry.

### 3.5 TikTok, Instagram, Shorts
- **Format:** a 9:16 story card (once the safe zones are fixed), a photo-mode carousel of 3–4 persona cards, and a 20–30 s screen recording of the grid.
- **On-screen hook:** "POV: you answer a political quiz honestly for once — 'it depends' is finally an option."
- **Caption:**
  ```
  Same question, twice: perfect world vs right now. Which one is the real you? 👇 Drop your gap.
  ```
- Link-in-bio or a sticker; don't put the URL in an unclickable caption alone.

### 3.6 Discord and group chats (the biggest invisible channel)
- Ask the mods first in political-debate, PCM-adjacent, philosophy and international-politics servers. Post in #self-promo or #quizzes channels only.
- The Discord play is the **compare loop**: "post your link; I'll compare". See §5.
- Paste-ready:
  ```
  New political quiz — every question answered twice (ideal system vs your country now). No tracking. Post your result link
  and anyone who's taken it can open "Compare with my result".
  <link>
  ```

### 3.7 YouTubers and streamers
The 2026 12axes spike came from a streamer taking the test live (R05 §1.2). One large creator matters more than every other channel combined.
- Build a list of about 20 political-commentary creators, **balanced** across left, right, libertarian and non-US, with mid-size creators (50k–500k) weighted over megastars. Non-English creators come after translations.
- One personal message each, with the creator kit. No follow-up spam. Don't pay for coverage; if anyone is ever paid, the platform's disclosure rules apply.

---

## 4. Creator / streamer kit

Contents: a one-paragraph pitch, the demo video, 4 persona cards, the run sheet below, and a Q&A cheat sheet.

**Pitch (DM / email):**
```
Hi <name> — I made 12 Axes², a free political quiz where every statement is answered twice: in your ideal system, and
in your country right now. You get two results ("in theory A, here and now B") and a breakdown of where they split.
It works well live: the split is a ready-made argument with chat. Quick mode is ~7 min (48 statements). No signup, no
tracking, nothing to promote. <link> — Max (I made it; method is public, criticism welcome).
```

**Run sheet for a live session:**
1. Pick **Quick** (48 statements, ~7 min, marked low precision) for a live stream, or **Standard** (72, ~11 min) for a video.
2. Read each statement aloud, then place the ideal column and the here-and-now row. On a big split, reason chips appear. Reading them out is good content ("can't trust those in charge").
3. Reveal: the pair, then the dumbbell chart, then the notable gaps.
4. **Chat challenge:** paste your result link (Share → Copy link) in chat or a pinned panel. Viewers who take the test get "Compare with the person who shared their link" on their results. Viewers who already have a result get "Compare with my result" straight away.
5. Card: Share → Story 9:16 for stories, Post 4:5 for X and Reddit, **Minimal** to hide the numbers.

**Things creators should know (pre-empts mockery):**
- Random clicking is detected: "No reliable match: your answers were too inconsistent to place". If chat trolls the test, the test says so. That's a bit, not a bug.
- "No close match — nearest shown" is honest output, not a broken result.
- A sensitive archetype (e.g. historical fascism, Marxism–Leninism) is never put on a card unless the user ticks the opt-in.
- The ideal-system frame stipulates fallible people and a realistic rest of the world.

---

## 5. The compare-with-a-friend loop (as built)

1. A shares a result link (`#r=…`). The link holds scores only, and stays in the fragment.
2. B opens it and sees A's result plus **"Take it yourself and compare"**. If B already has a saved result, B sees **"Compare with my result"** instead.
3. B finishes the quiz. Their results page offers **"Compare with the person who shared their link"** → `#c=<B>~<A>`.
4. The compare page shows both headlines, a **% overlap** for ideal systems and for here-and-now, the axis where they agree most and the axis where they differ most, and a side-by-side chart.

The quotable outputs are "we overlap 81% in theory and 54% here and now" and "agree most on trade, differ most on religion & state". Seed copy:
```
We agree in theory and disagree in practice. Apparently. <compare link>
```
```
Take this and send me your link — I want to see if we agree in theory, in practice, or neither. <link>
```
Gap: B currently gets the compare URL only from the address bar. There's no compare card and no compare share button (see §10).

---

## 6. Meme formats seeded from the card

Seed 2–3 of these yourself; the community will make the rest. Keep your own versions punching at *everyone*.

1. **The grid as an alignment chart.** The 7×7 grid's corners are "Agree in both", "Disagree in both", "Agree in ideal only" and "Agree here only". Put any statement on it, serious or silly ("pineapple belongs on pizza"). This works like the D&D alignment chart, and every remix advertises the grid.
2. **Ideal vs Here and now, two panels.** "How it started / how it's going", or the Drake format: ◆ ideal vs ● now. The card's own colors (ideal violet, now amber) make it recognizable.
3. **Every quadrant, in theory vs in practice.** A four-quadrant compass with each quadrant split diagonally into "in theory" and "here and now". This is the PCM-native entry point.
4. **"Very constant" as a flex vs "Splits a lot" as a confession.** Use the Reality Gap band labels, never the raw number.
5. **Same ideals, different country.** Two persona cards with identical ideal diamonds and diverging now dots.
6. **The dumbbell strip as a "spot the pattern" puzzle.** Post just the 12 rows and ask people to guess the pair.

---

## 7. Criticism and brigading response plan

Principles: answer the strongest criticism first; fix in public; never delete criticism on your own posts; one reply per thread, then disengage; never argue politics, only method.

| Criticism | Response (adapt; link the page) |
|---|---|
| "Biased question #X" | "Thanks — which statement? Each axis has equal statements keyed each way, and wording rules are on the method page. If it's loaded, I'll rewrite it and note it in the changelog." Then actually do it and post the fix. |
| "It called me X, that's wrong" | "Labels say how close and how stable they are — check the 'why' line and the stability. 'Loosely similar' or 'toss-up' means it's honestly unsure. Happy to look at your link." |
| "The gap means you're a hypocrite" | "It doesn't. Thinking something is right in principle and wrong for your country today is a coherent position. The gap only gets called out when it beats answer-to-answer noise." |
| "Fake/edited card" | "Cards are drawn deterministically from the link. Ask for the link; it renders the same card for anyone." |
| "Ripoff of 12axes" | "Built from the MIT-licensed original's axis concepts; all statements are new; not affiliated with 12axes.vercel.app. Credits are in the site footer and the method page crosswalk." |
| "Why include fascism / communism?" | "Historical fascism and Marxism–Leninism are a matched pair, and neither appears on a card without an explicit opt-in. Living people, parties and countries are never matched." |
| "Data harvesting?" | "There's no backend and nothing is sent anywhere. Open DevTools and watch the network tab." |

**Brigading.** There's no on-site surface to brigade: no comments, votes or leaderboards. Off-site:
- Don't feed raids; ask mods to lock if a thread turns into a raid.
- Never use alt accounts to "balance" a thread.
- If the site gets tagged as belonging to one camp, answer with the balanced persona set and the method page, once.

**Escalation.** If a real flaw goes viral (a broken item, a bad label), post a short "here's what was wrong, here's the fix" note in the original threads. Visible responsiveness is a credibility asset (R05 §6.4).

---

## 8. Measuring success without analytics

**Don't add trackers.** That rules out analytics scripts, pixels, Cloudflare Web Analytics, click-tracking shorteners (bit.ly and similar) and UTM parameters. Any one of them breaks the core promise, and the CSP would block most of them anyway.

| Signal | How |
|---|---|
| Unprompted card posts | Weekly manual search on X, Bluesky, Reddit, TikTok and YouTube for "12 Axes²", "12 axes squared", "12axes2", the domain, and "what's your gap". **This is the north-star metric.** |
| Thread performance | HN points/comments; upvotes/comments on your own Reddit posts |
| Creator coverage | Count of videos/streams found; views as shown publicly |
| Repo | Stars, forks, issues (especially "biased question" issues — a quality signal), plus the GitHub repo-traffic API (views of the *repo*, not the site) |
| Backlinks / press | Search alerts for the name and domain |
| Host aggregates | Only if the host shows **aggregate** request/bandwidth totals by default, server-side. Read totals only, and **don't mine per-path counts for `/p/…` stubs**: those paths name result archetypes. Disclose on the Privacy page that the host keeps standard logs. |

What we **can't** know, and should say so publicly: visits, completion rate, drop-off, result distribution, share-to-take conversion, demographics. Suggested line for the Privacy page or the HN thread: *"We don't know how many people finished the test. That's the point."*

Log the signals weekly in a private note. Rough week-1 bar for "it's working": ≥ 1 unprompted card post per day, ≥ 1 creator video, and the r/political_compass post in the sub's top posts of the week.

---

## 9. Ethics

- **No dark patterns.** No result gating behind a share, email or signup; no fake counters ("1M people took this"); no streaks or nags; no countdowns; no "your friends are waiting".
- **Don't misrepresent accuracy.** It's a values quiz, not a validated instrument, and the method page says so. Don't call it "scientific". Always pair the Reality Gap with its baseline (the card does). Never present the Gap as a personality verdict.
- **Sensitive ideologies.** Respect the opt-in. Never seed examples or memes with sensitive-archetype results, and never bait "it called me a fascist" content yourself.
- **Real people and countries.** No matches to living people, parties or countries (spec §1). Personas aren't attached to real countries.
- **Authorship and integrity.** Disclose "I made this" everywhere. No sockpuppets, vote rings or upvote requests; these are against HN and Reddit rules and would be fatal for a tool that claims neutrality.
- **Elections.** This isn't voting advice. Don't market it as "find out who to vote for", and avoid election-day pushes.
- **Privacy defaults stay on.** Country, System Confidence and status-quo placements are off on cards and links by default. Never encourage people to turn them on for virality.

---

## 10. Next steps: features worth adding (not built yet)

Ordered by expected impact on spread:

1. **OG stub pipeline** (`scripts/og.ts` + `SITE_ORIGIN`). Required for "Link with preview" to work at all (§2.1).
2. **Story-card safe zones.** Move the wordmark and URL footer out of the top ~250 px and bottom ~340 px in the 9:16 layout.
3. **Compare sharing.** Add a "Copy compare link" button and a compare card (Minimal by default and labeled "Them", per spec §6.3) on the compare page. Today the compare URL lives only in the address bar.
4. **"Challenge a friend" button** on results, with invite text ("Take it and send me your link").
5. **Copy-text share** (no image) plus a compact text/emoji result for Discord, SMS and comments (R05 §3.5). Today, text goes only into intents and the native share.
6. **Alt text for cards.** A generated description plus a "Copy alt text" button. The preview `<img>` alt is currently generic.
7. **Share-text grammar.** "In theory I'm Social democracy" reads badly. Use "In theory I'm closest to Social democracy" (`shareText` in `ShareSheet.tsx`).
8. **Source + "Report a biased question" link** (a GitHub issue template carrying only the item id). There's currently no repo or feedback link in the UI.
9. **Searchable name in metadata.** Add "12 Axes Squared" / "12axes2" to `<title>` and the OG text.
10. **Not-affiliated line** ("not affiliated with 12axes.vercel.app") next to the footer credit; the footer already credits the MIT original.
11. **QR code on story cards** that deep-links the result (built locally, no external service).
12. **Translations** (PT-BR, ES) if wave-1 demand shows up.

--- SUMMARY ---

- **Hook:** every question answered twice (ideal system × here and now). The shareable unit is the *pair* plus "What's your gap?". Lead with the pair, never a raw gap number (random ≈ 38).
- **Before launch:** wire the real archetype catalogue (it's placeholder today); pick a domain; set BASE_PATH/SITE_ORIGIN; build the OG stubs (otherwise "Link with preview" 404s); fix the story-card safe zones; freeze reviewed items; test cards on every platform; keep host analytics off.
- **Launch:** T0 ≈ Tue 2026-11-17, after the midterms. Order: Show HN (method/privacy angle), r/political_compass, then an X/Bluesky thread. PCM memes, Discord, and creator outreach follow over the next week. An LLM data post comes at 2–4 weeks.
- **Growth loops:** creators taking it live and posting their link (→ viewer compares); the shared → take → compare flow; grid-as-alignment-chart memes.
- **Defensibility:** fix bias reports in public; never call the gap hypocrisy; sensitive archetypes stay opt-in; disclose authorship; no vote manipulation.
- **Measurement:** public signals only (social search, threads, creators, repo). No trackers or shorteners, and say openly what we can't know.

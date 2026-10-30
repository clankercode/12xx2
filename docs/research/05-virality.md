# 05: Virality research and launch playbook for 12 Axes²

Status: research note, 2026-10-31. Sources are listed in §9. **UNVERIFIED** marks a claim that rests on search snippets, third-party blogs or pages we could not fetch, such as X posts (HTTP 402) or Reddit (blocked).
Scope: what makes political and personality quizzes spread; how the 2026 12axes wave spread; how to share results from a static, no-backend SPA; norms on each launch channel; risks; and a launch playbook for 12 Axes².

---

## 0. TL;DR

1. **People share the label, not the method.** Every quiz that spread had a compact result someone could post as part of their identity: a quadrant (Political Compass), a four-letter code (MBTI/16P), a coloured grid (Wordle), "Most compatible: X, 96%" (12axes.vercel.app). Our label has to be the **pair**: *"In theory: A · Here and now: B"*, plus one gap number.
2. **The 2026 12axes wave was driven by streamers and named matches, not by the methodology.** The best-documented spike is an X post from ~2026-10-01: "Asmongold got a 92% far right rating … (historically closest to the German Empire)", ~1.6M views (UNVERIFIED snippet). The shareable unit was the *celebrity/country match*, and that is also the part people find controversial.
3. **12axes.vercel.app built a deliberate share stack**: a 1080×1920 story card, Web Share API with the PNG attached, a templated share text with emoji, a result link that rebuilds the result from 12 numbers in the URL, and a compare-two-people page (§1.2). That is the baseline we must match. The original politicaltests 12axes had none of it: share was a query string plus a button linking to a third-party screenshot site (`results.html:126-127`).
4. **Link crawlers do not run JS.** A pure SPA gets one generic OG image for every link. Without a backend, the only way to get per-result previews is **prerendering a finite set of static share pages** (one per *theory archetype × practice archetype*, or per family pair), with the exact scores in the `#fragment`. The fragment is never sent to the server (RFC 3986 §3.5), which keeps hosting logs free of result data.
5. **Controversy is the engine and the main risk.** Out-group language roughly doubles shares (Rathje et al. 2021, PNAS). Ridicule of biased or bad questions, and "it called me X", are what drive comment threads. Defensibility is part of growth: publish the method, the questions and the matching math, and show "why you got this" for every label.
6. **Hacker News is a poor launch channel for a political quiz.** HN guidelines put politics off-topic. Every political-quiz Show HN found scored ≤6 points (Algolia data, §4.4). A methods or LLM angle can still work: "Where does ChatGPT fall on the political compass?" scored 243 points with 424 comments.
7. **Without telemetry we can count only public signals**: stars, upvotes, quote posts, search results, issues, and backlinks. Completion rate, drop-off and conversion per share are unknowable, and we should say so.

---

## 1. Case studies

### 1.1 Original 12axes (politicaltests.github.io, MIT)
- Result page is a query-string URL (`results.html:134` `getQueryVariable`). The only "share" is a button that sends users to screenshotmachine.com with instructions to copy the URL first (`results.html:126-127`). There is no image, no share text and no OG card.
- 7-point scale with "Neutral/Unsure" as the middle option (`quiz.html:18-24`). The scale conflates *unsure* with *it depends*. 12 Axes² can say that out loud: our grid resolves "it depends" into "depends on *where*".
- Lineage: 8values → 9axes → SapplyValues/12axes forks. The MIT licence produced a large derivative ecosystem (alternativeto, thebestpoliticaltest, canadavalues; §9). Forkability is a slow, long-tail form of virality.
- No evidence the original went viral on its own. A Spanish third-party blog says people search for "12axes" after seeing a friend's screenshot of coloured bars (lovableapp.org; low-quality source, UNVERIFIED).

### 1.2 12axes.vercel.app (RomanCypherpunk / Enzo Xavier Santos, all rights reserved)
**Timeline (UNVERIFIED where noted):**
- Repo created 2026-05-08. As of 2026-10-31 it has 174 stars and 41 forks (`gh api repos/RomanCypherpunk/12axes`). The README calls it a "portfolio piece".
- It was built Portuguese-first (`index.html:37` `og:locale pt_BR`; launch copy in Portuguese, `brag-output/share-copy.txt:1`).
- ~2026-10-01: a fan account posts "Asmongold got a 92% far right rating on the 12 axes political quiz (historically closest to the German Empire)", ~1.6M views (X, snippet only, UNVERIFIED). A clone/SEO site (12axes.info) says streamers such as Asmongold "took the 12 Axes test live in October 2026, and that is how most people found it" (no data given).
- Through October: result posts on X in EN/PT/ES. One uses the app's share-text template verbatim ("I discovered my ideological profile on the 12 Axes Political Quiz! 💡 … 🌎 … 👤 …"), which shows the template doing its job (X snippet; template at `frontend/src/i18n/en.ts:715-723`). Other examples: W Radio México on ~2026-10-25 (snippet calls it "la prueba viral que todos comparten en redes", UNVERIFIED); a Scott Lincicome post on 2026-10-28; an AR15.com thread "Popular political quiz making the rounds on X" (403, UNVERIFIED content); YouTube reaction videos ("Dev Takes The Viral '12 Axes' Political Ideology Test"; "I'm a radical leftist apparently").
- **Clone and SEO squatting followed within weeks**: 12axes.info, 12-axes.vercel.app, 12axes.online, twelve.tools, lovableapp.org/blog. 12axes.info is an MIT-derived reskin of the *original* question bank and says it is "Not affiliated with the original 12axes project". The name "12 Axes" is now ambiguous across at least three projects.

**Their share mechanics (what we must match or beat):**
| Mechanic | Evidence |
|---|---|
| Story-format PNG 1080×1920 | `frontend/src/utils/shareCard.ts:13-20` |
| Rendered client-side with html-to-image, loaded lazily on click; images drawn outside foreignObject to dodge Safari bugs | `App.tsx:833`, `shareCard.ts:712-716` |
| `navigator.share` with the file attached, falling back to text-only share, with the download already done | `App.tsx:1209-1246` |
| Emoji share-text template naming ideology %, country %, personality %, and URL | `i18n/en.ts:715-723` |
| Result link rebuilt from the 12 axis values in the URL (`/api/results/by-axes?v=`) | README:35, 179 |
| Compare two people from their two result links; separate compare-card PNG | `App.tsx:67-73`, `compareShareCard.ts:25,549` |
| QR code on the card | `shareCard.ts:816` |
| Launch video: 28.5 s, landscape; ~2/3 of runtime is a tour of the results report ("the result is the product"); hook "Do you really know your political ideology?" | `brag-output/brag-plan.md:6-12,33-34` |
| Static OG image = 512×512 logo, not a 1200×630 card | `index.html:44-46`. This is a weak spot: link previews are small and generic. |
| "Free · Anonymous · Instant result" as the trust line | `composition-brief.md:24` |
| Middle answer is "Neutral or Depends" (PT "Neutro ou Depende") | `composition-brief.md:21`. The "depends" is exactly the ambiguity our grid separates out. |

**Lessons:** (a) the named match (a person or a historical regime) is the most quoted line, and also what gets mocked ("closest to the German Empire"); (b) streamers taking the test live supplied the spike; (c) a ready-made share template gets copied verbatim; (d) a portfolio project can go viral with no marketing budget once one large creator plays it.

### 1.3 8values (2017) and the PCM ecosystem
- Development began 2017-04-16. It spread from 2017-04-21 via an 8chan thread and Supforums, then /pol/ and other forums, with "political types" posting results on Twitter. There was a parody meme of people's results (Know Your Meme). The shared artefact was a results image of 4 bars with percentages, the site URL and a label.
- r/PoliticalCompassMemes made a quiz result into an **identity flair**: flairing is "an important aspect" and unflaired users get mocked (wiki mirror, UNVERIFIED, may be stale). The 2D compass works as a meme template. A 2022 Monash study and a 2024 UvA paper (300k posts) study the sub as a playful political subculture (Wikipedia; UvA).
- Reputation risk: the sub has been described as full of "edgelords" and /pol/ crossover (Medium op-ed). Daily Dot reports it banned the word "groomer" in 2022. Getting associated with PCM brings reach and a reputation at the same time.

### 1.4 Political Compass (2001–)
- Launched 2000/2001 (Wikipedia). It has drawn long-running criticism for libertarian bias (Britannica, via Wikipedia), for "very irritatingly phrased and impossible to answer properly" questions (Tom Utley), and for methodology that political scientists have "roundly criticized" (van der Linden). Its staying power comes from the **2D chart**: one image, instantly readable, endlessly remixable.

### 1.5 Pew Political Typology quiz
- More than 90,000 takers in the first day of the 2014 edition, and more than 1.5M takers over three-plus years for the 2011 version (Pew). It maps you to *groups* that are calibrated against a national representative survey: you see "you are like X% of Americans", which is defensibility doing double duty as social comparison. Pew also ran **group quizzes** (compare a group's results), which it discontinued from 2026-05-25 (Pew page via snippet, UNVERIFIED).
- Pew also published an explainer on why the questions are worded as they are ("Why the typology quiz questions are asked the way they are"). Transparency about wording is a recognised credibility tactic.

### 1.6 Wahl-O-Mat (Germany)
- 26M uses for the 2025 Bundestag election (record; 21.3M in 2021), with about 9M on launch day (bpb press release). This is the **trigger** effect in pure form: tied to an event, with the press covering the tool itself. A YouGov survey says it influenced the vote of ~30% of users "somewhat to strongly", which sets a high bar for neutrality.

### 1.7 NYT dialect quiz (2013)
- The most-viewed NYT page of 2013. It topped most-emailed, most-blogged and most-tweeted, and won a Peabody (CSMonitor, Hot Air, Peabody). The output was a personal heat-map that *surprised people with its accuracy*. Lesson: **perceived accuracy of the result is itself the share trigger** ("how did it know?"). This bears on our "accurate and defensible" requirement.

### 1.8 Wordle (2021–22)
- The share grid was added in Dec 2021, after launch. It shows the pattern without the answer, so it can be posted with no spoiler and makes viewers curious (Smithsonian, BuzzFeed News). Josh Wardle credits users, not himself, with the emoji-grid idea (BuzzFeed News; NZ Herald/Newstalk ZB).
- The grid fails accessibility: screen readers announce "green square, yellow square…" (Christian Heilmann; MacStories). An image with alt text, or a text summary, works better.
- Lesson: a **text-only share that works in any text box** (X, Discord, WhatsApp, Reddit comments, SMS) is a separate channel from images, and it has to be short.

### 1.9 16Personalities / MBTI; BuzzFeed "Which X are you"
- Four-letter type codes (plus 16P's -A/-T suffix) go into bios. Spredfast analysed ~134k Instagram posts from accounts with an MBTI type in the bio. Academic work calls MBTI the "memeification of identity" (arXiv 2309.13065, 2024).
- BuzzFeed quizzes: sharing is **identity signalling** and a low-exposure form of self-disclosure (Gwendolyn Seidman, Albright College, quoted in news coverage). "What state should you live in?" was taken 41M times on Facebook (UNVERIFIED secondary figure). Students use ascribed quiz identities in their own communication (RWU thesis).
- Lesson: give each result a **short code or name people want to put in a bio**. A dense 24-number profile is not shareable.

---

## 2. Mechanisms, synthesised (mapped to Berger's STEPPS)

| Mechanism | Evidence | Implication for 12 Axes² |
|---|---|---|
| **Social currency**: insider identity, being "the nuanced one" | MBTI codes in bios, PCM flairs | The hook flatters: "you're more than one label". The theory-vs-practice gap is novel and makes the sharer look reflective, not partisan. |
| **Identity label** | 16P, BuzzFeed, PCM | Pair name + short code (see §6.1). |
| **Comparison** | Pew group quiz, 12axes compare page, NYT dialect map | Compare-with-a-friend built from two fragments; "same ideals, different country" comparisons. |
| **Emotion / controversy** | Rathje 2021: each out-group term raises the odds of a share by ~67%, and out-group posts are shared ~2× as often | Results that name ideologies provoke. We let that heat exist without encoding out-group hostility in our own copy. |
| **Public / visible artefact** | Wordle grid, story cards | Story card + 1.91:1 OG + text grid. |
| **Triggers** | Wahl-O-Mat (elections), streamers | US midterms are 2026-11-03; the 12axes wave is live in Oct 2026; national elections elsewhere. |
| **Stories** | "Asmongold got 92% far right" | Creators reacting live: the gap gives a built-in story arc ("I'm an anarchist… *in theory*"). |
| **Perceived accuracy** | NYT dialect quiz | Show "why": the top 3 answers that drove each axis and each lens. |
| **Spiral of silence**: people withhold political posts | Pew 2014: 86% would discuss surveillance in person vs 42% of FB/Twitter users willing to post | Political results are riskier to share than "which pizza are you". Offer a **card without numbers/flags**, a "gap only" card, and no country by default. |

---

## 3. Share mechanics for a static, no-backend SPA

### 3.1 Image formats (community guidance; no official X/Meta spec could be fetched, so UNVERIFIED as "official")
| Use | Size | Notes |
|---|---|---|
| OG / link preview (X `summary_large_image`, Discord, LinkedIn, Slack, iMessage, WhatsApp, Reddit link posts) | **1200×630** (1.91:1) | ≥600×315 for a large preview. Absolute https URL. X needs `twitter:card=summary_large_image`. Discord colours its embed bar from `<meta name="theme-color">`. Keep key text centred; some clients crop to ~2:1. |
| Instagram/TikTok/Snap/WhatsApp Status/FB stories | **1080×1920** (9:16) | Keep text out of the top ~250 px and bottom ~250–340 px (sources disagree on the bottom). |
| X / Bluesky / Reddit image posts, Discord attachments | **1080×1350** (4:5) or 1600×900 (16:9) | 4:5 reportedly shows uncropped in the X timeline; 16:9 is the safe choice. A **square 1080×1080** suits Reddit and Discord grids. |
| Text share | ≤280 chars incl. URL | Fits an X post; also pastes into Discord, WhatsApp and SMS. |

Recommendation: generate **story (9:16), post (4:5) and OG (1.91:1)** layouts from one card component.

### 3.2 Per-result link previews without a backend
- Facts: social crawlers (X, LinkedIn, WhatsApp, Discord) do not execute JS, so tags injected by the SPA at runtime are invisible to them (till-freitag, nikolina-dev-blog). The fixes are prerendering or edge injection, and edge injection is a backend.
- **Option A, one generic OG image for every link.** Simplest. The card makes the hook visible ("Your ideals vs your here-and-now"). Every shared link looks the same.
- **Option B (recommended), prerendered share stubs.** At build time, emit `/r/<theoryKey>-<practiceKey>/index.html` for every archetype pair. Each stub carries its own `og:title` ("In theory: Market Anarchist · Here and now: Social Democrat"), `og:image` (a prebuilt PNG for that pair) and the app bundle. Exact scores travel in `#…`. Stub count is N² for N archetypes: at N=16 that is 256 pages plus 256 PNGs (~60–120 KB each, ~15–30 MB). Families (N≈8 → 64) are lighter. The preview then shows the *pair*, which is the hook, and stays honest because it reflects the sharer's actual archetypes.
- **Option C, client-rendered PNG** (canvas or SVG→PNG) for downloading and attaching via Web Share. Needed in any case for stories and for posts with an image attached.
- Do **not** use third-party OG-image or screenshot services. They would put results on someone else's server and break the no-telemetry promise.

### 3.3 Link-encoded results
- Put the result in the **fragment**: `https://…/r/<pair>/#v1.<base64url>`. RFC 3986 §3.5: the fragment is separated before dereference, so the host never receives it, and neither do CDN logs. Caveat: anyone holding the link can decode it, and platforms may store the full URL as posted.
- Encode **axis scores, not raw answers**: 12 axes × 2 lenses, each quantised to 0–100 (7 bits) = 168 bits ≈ 28 base64url chars, plus a version byte, a question-set id and an optional checksum. Scores-only means a shared link can't be used to reconstruct individual answers. Version the encoding from day one (`v1.`), because the method will change.
- **Compare a friend**: `#v1.<me>~v1.<friend>`. The friend opens your link, takes the quiz, and gets a compare URL with both vectors. No server is involved. Show per-axis deltas in each lens, plus "you agree in theory and disagree here and now" (or the reverse). That line is the most quotable thing the compare view produces.
- Optional country code (ISO-3166) in the fragment is **off by default** (see §5 privacy).

### 3.4 Web Share API
- Chrome desktop 128+; Firefox desktop only behind a flag (web.dev, UNVERIFIED for late 2026). File sharing is optional per the W3C spec. Feature-detect with `navigator.canShare({files})`. Fall back to download plus copy-text. 12axes.vercel.app downloads first and then tries share (`App.tsx:1209-1246`), which is a sound pattern.
- Buttons: Share (native), Download image (story / post), Copy text, Copy link, plus intent links (X `x.com/intent/post?text=`, Reddit submit, Bluesky `bsky.app/intent/compose?text=`, WhatsApp `wa.me/?text=`). Intent links are plain navigations with no embedded SDKs or tracking scripts.

### 3.5 Text share grid (Wordle-style)
A 12-line grid gets too long once you add a URL. Use a compact 2-row form, one cell per axis, coloured by pole and intensity:

```
12 Axes² 💭 ideal vs 🌍 here & now
💭 🟦🟦🟥⬜🟦🟥🟥⬜🟦🟦🟥⬜
🌍 🟦🟥🟥🟥🟦🟥⬜⬜🟦🟥🟥🟥
In theory: Market Anarchist
Here & now: Social Democrat
Gap 31/100 · biggest on Economy
<link>
```
Pair it with an **image with alt text** for accessibility (Wordle lesson). Also provide a no-emoji variant.

---

## 4. Channel norms

### 4.1 Reddit (rules pages blocked to us; mirrors are dated, so all UNVERIFIED; read each sidebar before posting)
- **Platform norm**: Reddit penalises accounts that only promote. The "~10% self-promotion" heuristic is folklore and not verified as current policy (redship.io, mythos.one). Spam filters weigh account history, so post from an account with real history, disclose authorship ("I made this"), and stay in the comments to answer.
- **r/PoliticalCompassMemes** (~585k members per Daily Dot, UNVERIFIED current). Memes only in practice; a bare link to a quiz will likely be removed or ignored. Make a **meme that uses the result format**, e.g. the four quadrants each captioned "in theory / here and now", and put the link in a comment if the rules allow it. Expect mockery of the authors.
- **r/samplesize**: post flair required (Casual/Academic), a demographic in parentheses at the end of the title, e.g. "(Everyone)" or "(18+)", and the title must describe the topic (2022 mirror). A quiz that gives results back is a reasonable [Casual] post. Offer aggregated results only if they are actually collected, which we don't do.
- **r/political_compass, r/PoliticalCompass**: results-posting communities with a long history of listing alternative tests (2020 thread listing SapplyValues and 9axes). Probably the friendliest home. Rules not verified.
- **r/PoliticalDiscussion**: strict, discussion-only; 2016 rules forbid meta posts that don't discuss politics. Do not post the quiz. Optionally post a genuine discussion question ("Should the *same* policy be right in Denmark and wrong in Iran?") without a link.
- Other fits (UNVERIFIED rules): r/IndieDev, r/webdev showcase days, r/SideProject, r/dataisbeautiful (only for a real aggregate visualisation, which we won't have), r/AskPolitics.

### 4.2 X / Bluesky / Threads
- Result posts with an image, quote-post chains, and creators reacting were the observed 12axes path. Seed with a **thread of contrasting example results**, e.g. the same "ideal" with different "here and now" for a Dane versus someone living under a corrupt regime. Reach out to political-content creators and streamers with a pre-made reaction kit (§6.4).

### 4.3 TikTok / YouTube / Twitch
- No specific "political compass reaction" trend data found (UNVERIFIED). What is documented: YouTube reaction videos to 12axes; streamers taking it live. Political TikTok rewards criticism of the out-group (PsyPost on a 2025 study). Under 4% of a typical German feed is explicitly political (study via search). Format for creators: take it live, reveal two results, argue with chat about the gap.

### 4.4 Hacker News
- Show HN: "something you've made that other people can play with"; no signups; "Please don't ask friends to upvote or comment"; title starts "Show HN" (showhn.html). General guidelines: politics is off-topic "unless … evidence of some interesting new phenomenon"; "Don't solicit upvotes" (newsguidelines.html).
- Data (HN Algolia, 2026-10-31): political-quiz Show HNs score 2–6 points: "39 dimensions 3D" scored 6 (2025-08), "Political Match Quiz with no data mining" scored 2 (2020), and an LLM political quiz on 2026-10-29 scored 1. Outlier: "Where does ChatGPT fall on the political compass?" scored **243 points, 424 comments** (2022-12).
- So: post once, as Show HN, framed technically ("A political quiz that separates what you think is right in principle from what you think is needed now; static, results live in the URL fragment, no backend"). Optionally run the **LLM angle** later as a separate, data-driven post: run N models through both lenses and report the gap.

### 4.5 Product Hunt
- Guides agree on a 12:01 AM PT launch and vote integrity; official rules could not be fetched (UNVERIFIED). Politics is off-genre for PH. Expect little and treat it as optional.

### 4.6 Discord / group chats
- Probably the biggest invisible channel ("dark social"). It needs a good OG card with `theme-color`, a compare-a-friend flow, and a text grid that renders in Discord.

---

## 5. Risks

| Risk | Evidence | Mitigation |
|---|---|---|
| **Seen as biased** | Political Compass libertarian-bias critiques; Utley; Wahl-O-Mat influence stakes | Publish questions, axis definitions, scoring and archetype vectors in the repo. Run a balance audit (each axis has items keyed in both directions, in both lenses). Add a "Report a biased question" link to a GitHub issue template that includes only the question id. Name the authors and their limits on the About page. |
| **Ridicule of bad questions** | "irritatingly phrased" questions; streamer reactions mock odd items | External review of items before launch, including a hostile reviewer from each side. Plain wording. Every item must make sense in both lenses, or be marked lens-specific. |
| **Ridicule of named matches** | "historically closest to the German Empire" | No matching to living politicians. Historical regimes only with care and with a "why" panel. Ideology/archetype names should be descriptive, not slurs. |
| **Brigading / raids** | PCM's reputation; out-group engagement dynamics | With no backend there is nothing to brigade *on-site* (no comments, no votes, no leaderboards). Off-site threads cannot be controlled; don't host aggregate rankings that invite gaming. |
| **Privacy / safety** | Spiral of silence; some countries penalise political expression | No telemetry, no storage beyond optional localStorage. Fragment-only results. Country optional and off the card by default. A "clean card" mode (pair names only, no numbers). Warn that anyone with a link can decode it. |
| **Name confusion / clones** | 12axes.vercel.app vs politicaltests 12axes vs 12axes.info etc. | Distinct name and visual identity ("Axes²", the grid motif). An "inspired by / not affiliated" line. No use of the 12axes.vercel.app wording, vectors, profiles or design (all rights reserved: `LICENSE:1-20`). |
| **"Hypocrite" framing backfires** | n/a (reasoning) | Never call the gap hypocrisy. Call it *pragmatism*, *context*, or *distance from ideal*. A big gap is a legitimate outcome (Iran case), not a flaw. |
| **Election-week noise** | US midterms 2026-11-03 | Launch before or after, not on, election day; subs may lock or redirect political posts on election day. |
| **Inaccurate archetype pair from noise** | n/a | Show confidence (number of items answered, how far the scores are from an archetype boundary). Show "near-ties" rather than one overconfident label. |

---

## 6. Launch and virality playbook for 12 Axes²

### 6.1 Naming and tagline
Name: keep **12 Axes²** (pronounced "twelve axes squared"; slug `12xx2`). It catches "12 axes" search demand while the ² marks a new thing. On every page: "Inspired by the open-source 12axes test. Not affiliated with 12axes.vercel.app."

Taglines (pick one to lead, A/B by hand across posts):
- **"Your politics, in theory and in practice."** (recommended)
- "What's right in principle vs what's needed right now."
- "Same ideals. Different country. Different answer."
- "The political test that finally lets you say 'it depends'."
- "Ideal-world you vs here-and-now you."
- "Would you do it in Denmark? Would you do it in Iran?" (for the explainer, not the logo)

Result label format: **"In theory: {A} · Here and now: {B}"**, plus a short code for bios, e.g. `A→B` built from 2-to-3-letter archetype codes (e.g. "MAN→SDM"). Add one headline stat: **Gap {0-100}** ("distance between your ideal and your here-and-now") and "biggest gap: {axis}".

### 6.2 Share card requirements
- Three layouts from one component: **story 1080×1920**, **post 1080×1350**, **OG 1200×630** (prebuilt per archetype pair, §3.2).
- Content, top to bottom: logo and URL (short, readable, also in the safe zone) → "In theory" archetype → "Here and now" archetype → **the signature visual: a 12-row paired-dot strip** (ideal dot ○ vs now dot ●, connected by a line whose length is the gap). This is the image people will recognise, the way they recognise the compass → Gap number + biggest-gap axis → small "Why?" note ("Scores from N answers in each lens") → URL / QR.
- Readable at thumbnail size: the archetype names must be legible at 300 px wide. Strong contrast, dark theme by default, light variant available.
- Safe zones: nothing important in the top 250 px or bottom ~340 px of the story layout.
- Accessibility: alt text generated with the card (a "Copy alt text" button); colour-blind-safe pole palette (no red/green as the only cue).
- Privacy toggles: hide numbers / hide country / pair-names-only.
- Generate the card locally (canvas or SVG→PNG), with no network calls; bundle the fonts.
- Determinism: the same fragment always gives the same card, so cards posted publicly can be checked against the link.

### 6.3 Share text templates
Default (≤280 chars with URL):
```
In theory I'm a {A}. Here and now I'm a {B}. 🤔
Gap: {gap}/100, biggest on {axis}.
12 Axes² asks every question twice: ideal world vs real world.
{url}
```
Challenge:
```
My ideal-world politics and my real-world politics disagree by {gap}/100. Bet yours do too.
{url}
```
Compare invite:
```
Compare with me 👇 we'll see if we agree in theory, in practice, or neither.
{compare_url}
```
Grid (see §3.5). No-emoji variant for LinkedIn / formal settings:
```
12 Axes² result: ideal = {A}; current = {B}; gap {gap}/100 ({axis}). {url}
```
Avoid copy that frames the other side as the enemy ("finally proves the left/right is…"). It gets engagement but costs us the defensibility claim.

### 6.4 Channel-by-channel launch plan
**T−7 to T−1 (prep)**
- Run the external item review, then freeze the question set `v1`.
- Build the prebuilt OG stubs and check previews in X, Discord, iMessage, WhatsApp, Slack and Reddit via real posts or validators. Test the native share sheet on iOS and Android.
- Write a public **METHOD.md** and a short "How scoring works" page; the criticisms doc doubles as a credibility asset.
- Make 6–8 **example results** as images (contrasting pairs; the Denmark/Iran framing as personas, not real people).
- A 20–30 s vertical demo video: hook "Do you think the same thing in a perfect world as you do right now?" → one question answered on the grid → reveal of the two archetypes → the paired-dot strip → the compare view. Per the 12axes lesson, spend most of the runtime on the result (`brag-plan.md:6-7`).
- A **creator kit**: a one-paragraph pitch, the demo video, a "take it live" suggestion (do it, reveal both results, then have chat compare), and no ask for anything.

**T0 (launch day; avoid 2026-11-03 US election day; Tue–Thu mornings US Eastern are typical for Reddit and HN)**
1. GitHub repo public, with description, topics and README hero image.
2. Show HN (once): technical framing plus the "it depends" hook. Reply to every critique with fixes or issues.
3. r/political_compass (or r/PoliticalCompass), with a post following the sub's own results format and disclosure. Example title: "I made a 12-axis test that asks every question twice: ideal system vs your country right now. Results show the gap."
4. r/samplesize [Casual] "(Everyone)".
5. X / Bluesky thread with example cards, one card per post.

**T+1 to T+7**
- Post a PCM meme built from the paired-dot strip (meme first, link second, only if the rules allow).
- Send the creator kit to political streamers and YouTubers in EN, PT-BR and ES (the 12axes audience was multilingual). Send it once, personally, and don't follow up repeatedly.
- Publish a "changelog of fixes from your feedback" post. Visible responsiveness to bias complaints builds credibility.

**T+2 to T+4 weeks**
- A data post if we can do it honestly without telemetry: run LLMs through both lenses and publish the gaps. This is a new HN/press angle (the LLM-compass precedent scored 243 points). Respondent aggregates are not possible without collection.
- Translations (PT-BR, ES) if the first wave shows demand.

### 6.5 Community seeding (ethics)
- Disclose authorship everywhere. No sockpuppets, no vote rings: HN and Reddit forbid them, and getting caught is fatal for a tool that claims to be unbiased.
- Make it easy for people to **fork** it (open licence). Derivatives spread the format, as 8values → SapplyValues did.
- Seed the examples with *both* sides of the spectrum in equal measure.

### 6.6 What we can observe without telemetry (honest list)
| Can observe | Cannot observe |
|---|---|
| GitHub stars, forks, issues; the repo-traffic API (views, clones and referring sites *of the GitHub repo*, not the site) | Site visits, completions, drop-off by question, time per item |
| HN points and comments; Reddit upvotes and comments on our own posts | Shares per result, conversion from share to quiz-take |
| Public search: X/Bluesky/Reddit/YouTube/TikTok for "12 Axes²", "12xx2", the domain, the card image | Referrers (gone with no analytics; static hosts may log them server-side, so turn that off or don't look) |
| Backlinks and news mentions (search alerts) | Demographics, countries, result distributions |
| Hosting dashboard aggregate bandwidth or requests, *if* the host shows them by default. This is server-side and anonymous, but disclose it in the privacy note or disable it. | Anything per-user |

State the trade-off publicly: "We don't know how many people finished the test, and that's the point."

### 6.7 Pitfalls checklist
- [ ] Generic OG image on result links (fix via §3.2 Option B).
- [ ] Share card unreadable as a thumbnail; key text inside the story UI zones.
- [ ] Copy, colours or layout borrowed from 12axes.vercel.app (all rights reserved).
- [ ] Living politicians as matches.
- [ ] "Hypocrisy" framing of the gap.
- [ ] Launching on US election day or during a breaking political crisis.
- [ ] Asking for upvotes (HN/Reddit ban).
- [ ] Only 1–2 items per axis per lens, giving noisy labels that streamers mock.
- [ ] No "why did I get this" explanation.
- [ ] URL fragment format changing without a version prefix, which breaks old shared links.
- [ ] Third-party fonts, CDNs or share SDKs that phone home (breaks the no-telemetry promise; bundle everything).
- [ ] Web Share without a download fallback (Firefox desktop).

---

## 7. Open questions for the build
- Archetype count N (drives OG stub count; N≈12–16 recommended), and whether to use a family level for OG.
- Ask for the respondent's country? It helps the story ("same ideals, different country") but is a privacy cost. Recommend: ask optionally, keep it local, keep it off cards by default.
- Licence: an open licence (MIT/Apache) helps fork-virality; the ideology content may want CC-BY.

## 8. Code citations (upstream; read-only)
- Original: `scratchpad/upstream/pt-site/12axes/results.html:126-134`, `quiz.html:18-24`.
- 12axes.vercel.app: `frontend/index.html:35-56`; `frontend/src/App.tsx:61-77,833,1192-1246`; `frontend/src/utils/shareCard.ts:13-20,712-716,816`; `frontend/src/utils/compareShareCard.ts:25,549-584`; `frontend/src/i18n/en.ts:715-723`; `brag-output/share-copy.txt:1`; `brag-output/brag-plan.md:6-12,33-34`; `brag-output/composition-brief.md:9,21,24`; `README.md:35,97,106,179`; `LICENSE:1-20`.
(Paths relative to `/tmp/claude-1000/-home-xertrov-src-12x2/6f22d232-cf93-470e-949f-6728e7611f5a/scratchpad/upstream/`.)

## 9. Sources
- 12axes repo: https://github.com/RomanCypherpunk/12axes (stats via `gh api`, 2026-10-31)
- Asmongold post (snippet only): https://x.com/Awk20000/status/2105483580147220647
- Template-share example: https://x.com/farisrachman_1/status/2104181587885875513
- W Radio México (snippet only): https://x.com/WRADIOMexico/status/2114446901936525539
- Scott Lincicome: https://x.com/scottlincicome/status/2115489240570372279
- AR15 thread (403): https://www.ar15.com/forums/General/Popular-political-quiz-making-the-rounds-on-X/5-2860305/
- YouTube: https://www.youtube.com/watch?v=Z2vQO3ZWhAk ; https://www.youtube.com/watch?v=OIlDl67yLLI
- Clone sites: https://12axes.info/ ; https://12-axes.vercel.app/ ; https://12axes.online/ ; https://twelve.tools/12axestest-dev ; https://lovableapp.org/blog/12axes-political-test-2026
- 8values KYM: https://knowyourmeme.com/memes/8values
- Political Compass: https://en.wikipedia.org/wiki/The_Political_Compass
- PCM: https://dailydot.com/political-compass-memes ; https://medium.com/@Monstromax/the-woes-of-the-political-compass-b12114d2dd61 ; UvA paper https://dare.uva.nl/id/082ef29b-13ab-4089-927b-0b20ee7005cb ; wiki mirror https://r.datuan.dev/r/PoliticalCompassMemes/wiki/index
- 8values lineage: https://alternativeto.net/software/9axes ; https://canadavalues.github.io ; https://thebestpoliticaltest.github.io
- Pew typology: https://www.pewresearch.org/fact-tank/2014/06/27/why-the-typology-quiz-questions-are-asked-the-way-they-are ; https://pewresearch.org/politics/quiz/political-typology/
- Wahl-O-Mat: https://www.bpb.de/die-bpb/presse/pressemitteilungen/559822/wahl-o-mat-zur-bundestagswahl-2025-uebertrifft-bisherigen-nutzungsrekord-deutlich/ ; https://yougov.com/de-de/artikel/50409-wahl-o-mat-beeinflusst-wahlentscheidung-von-30-prozent-der-nutzer-etwas-bis-stark
- NYT dialect quiz: https://www.csmonitor.com/The-Culture/Verbal-Energy/2014/0306/Accents-that-put-us-all-over-the-map ; https://hotair.com/allahpundit/2013/12/24/resistance-is-futile-everyone-in-america-must-take-the-nyts-dialect-quiz-n186604 ; https://peabodyawards.com/nytimesdialectquiz/
- Wordle: https://www.buzzfeednews.com/article/stefficao/how-wordle-went-viral-strategy ; https://www.smithsonianmag.com/smart-news/heres-why-the-word-game-wordle-went-viral-180979439/ ; https://christianheilmann.com/?p=7086 ; https://www.macstories.net/ios/wordlebot-1-1-now-fully-accessible-with-native-emoji-to-image-conversion/
- MBTI/16P: https://arxiv.org/pdf/2309.13065v2 ; https://assets.khoros.com/content/whitepapers/Personality-Types-Predicting-Social-Media-Behavior-Spredfast-Smart-Social-Report.pdf ; https://www.16personalities.com/for-ai.json
- BuzzFeed quizzes: https://gulfnews.com/amp/story/world%2Foceania%2Fwhich-blank-are-you-online-quizzes-go-viral-1.1295276 ; https://docs.rwu.edu/communication_theses/1
- STEPPS: https://www.shortform.com/blog/stepps-marketing/ ; https://www.apa.org/news/podcasts/speaking-of-psychology/viral
- Rathje et al. 2021: https://pmc.ncbi.nlm.nih.gov/articles/8256037
- Pew spiral of silence: https://mediashift.org/2014/09/pew-social-media-fosters-a-spiral-of-silence-on-controversial-issues/
- Political TikTok: https://www.psypost.org/negativity-drives-engagement-on-political-tiktok/ ; https://ojs.aaai.org/index.php/ICWSM/article/view/42675
- OG sizes: https://www.krumzi.com/blog/og-image-size-cheat-sheet-1200x630 ; https://screenhance.com/blog/og-image-size-guide ; https://wildandfreetools.com/blog/discord-open-graph-meta-tags
- SPA OG problem: https://till-freitag.com/en/blog/og-image-best-practices-spa-en ; https://nikolina-dev-blog.vercel.app/blog/dynamic-og-tags
- Story safe zones / X aspect: https://www.inro.social/blog/instagram-story-size ; https://posteverywhere.ai/blog/x-twitter-aspect-ratios
- Web Share: https://web.dev/articles/files/share-files ; https://www.w3.org/TR/web-share/
- URL fragment: RFC 3986 §3.5 https://www.rfc-editor.org/rfc/rfc3986#section-3.5
- HN: https://news.ycombinator.com/showhn.html ; https://news.ycombinator.com/newsguidelines.html ; Algolia https://hn.algolia.com/api/v1/search?query=political%20quiz&tags=story ; ChatGPT compass thread https://news.ycombinator.com/item?id=34181339
- Reddit samplesize rules (2022 mirror): https://lr.eu.psf.lt/r/SampleSize/comments/w8oqrs/flair_title_demographic_and_everyone_and_reposts ; PoliticalDiscussion 2016: https://red.127.pp.ua/r/PoliticalDiscussion/comments/4479er/rules_explanations_and_reminders/czoevkb/
- Reddit self-promo (third-party, low trust): https://redship.io/blog/reddit-self-promotion-rules-2026
- Product Hunt (third-party): https://blog.innmind.com/how-to-launch-on-product-hunt-in-2026

---

## Critic addendum (completeness critic, 2026-10-31)

### A. Corrections
- **TL;DR 4 is wrong under Option B.** It says the fragment "keeps hosting logs free of result data". But §3.2 Option B puts the archetype *pair* in the **path** (`/r/<theoryKey>-<practiceKey>/`), and every request for that URL sends it to the host. The pair is derived from the user's answers. It is coarse, but it is still a political-opinion result (GDPR Art. 9, doc 03 §9). This also contradicts doc 03 §9 ("never put answers in the URL path or query sent to the server"). Options:
  - (a) keep Option B and **disclose** that the share path names the two archetypes, so the host sees which pair was shared;
  - (b) use family-level stubs (coarser, fewer pages);
  - (c) use Option A (one generic OG image) and keep everything in the fragment.

  Rec: (a), with the disclosure placed next to the share button. The pair is what the sharer is deliberately publishing anyway, and Option B is the main per-link virality lever. Decision for Max.
- **§3.4 Web Share support, now verified** against MDN browser-compat-data (`api/Navigator.json`, `share` entry):
  - Chrome desktop: full support from 128. Versions 89–127 were partial, ChromeOS and Windows only.
  - Edge: 93.
  - Safari: **12.1** (iOS mirrors it). This was omitted above, and iOS is the main story-share platform.
  - Chrome Android: 61.
  - Firefox Android: 79.
  - Firefox desktop: 71, but only behind the `dom.webshare.enabled` preference.
  - It requires a secure context and transient activation (a button click), per MDN https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share.
  - Whether Chrome desktop *on Linux* actually works in 128+ is UNVERIFIED. Keep the download fallback regardless.
- **Rathje et al. 2021: verified.** The paper's abstract says each out-group term raised the odds of a share by 67%, and out-group posts were shared about 2× as often as in-group posts (https://pmc.ncbi.nlm.nih.gov/articles/PMC8256037/). TL;DR 5's "roughly doubles" is fair.
- **§4.4 HN "every political-quiz Show HN ≤6 points"** rests on n = 3 found posts. Treat it as a weak prior, not a pattern.

### B. The headline metric is the least reliable number we produce
§6.1–6.3 make "Gap {0-100}" and "biggest gap on {axis}" the hero stats. Two problems:
- Doc 03 §7.4 shows per-axis gaps are near-noise at 5 items.
- A random clicker scores Gap ≈ **38/100** on a 7-point scale (doc 03 addendum §E; doc 04 addendum §D). So the example "Gap 31/100" in the templates would sit *below* random clicking, and trolls get the biggest, most "interesting" gaps.

Fixes:
- (1) Lead with the **pair label** ("In theory A · Here and now B"), which is driven by two full 12-axis profiles and so is more stable than any gap.
- (2) Show Gap only next to a reference ("random clicking ≈ 38").
- (3) Show "biggest gap on {axis}" only when the calibrated gate passes.
- (4) Never say "Bet yours do too" (Challenge template) until the gap scale has a meaningful zero point.

### C. Timing reality
Today is 2026-10-31 and US midterms are Tuesday 2026-11-03 (verified: the first Tuesday after the first Monday in November 2026). The T−7 prep in §6.4 cannot finish before election day. The realistic launch window is **after 2026-11-03**. Avoid election week, when subs lock political posts. Post-election "why did your side lose/win?" discourse is a natural trigger for a "theory vs practice" framing. Aim for roughly T0 = mid-November, once the item review is done.

### D. Missing topics
1. **Accessibility of the grid input itself**, as opposed to the share image. Doc 03 §7.3 offers a two-row fallback. The playbook should require keyboard and screen-reader parity before launch, because creators get clipped mocking broken UIs.
2. **Name/SEO collision.** §1.2 shows at least three "12 Axes" projects. "12 Axes²" will be typed as "12 axes 2" or "12axes2", and the superscript is not searchable. Pick a domain/slug that captures the plain-ASCII form (`12axes2`, `12xx2`) and put "12 Axes Squared" in `<title>` and OG text.
3. **Licence for our content.** §7 leaves this open. If any MIT 12axes item text is adapted (doc 01 says this is allowed), the MIT copyright notice for 8values/SapplyValues must ship in the repo *and* on the About page. Decide this before launch, not after.
4. **Example-result personas.** §6.4 rightly says "personas, not real people". Add that personas should not be tagged with real countries in images (e.g. "Iran") if the persona would imply a real population's views. Use "a citizen of a high-corruption state" instead.

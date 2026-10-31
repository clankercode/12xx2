import { AXIS_IDS, MODES, type Mode } from '../../engine/types'
import type { FitStats, FitStatsRow } from '../../engine/fitstats'
import { AXES } from '../../data/axes'
import { CALIBRATION } from '../../data/calibration'
import { CATALOGUE, CATALOGUE_IS_PLACEHOLDER } from '../../data/archetypes'
import { HAS_COMMITMENTS, HAS_RED_COMMITMENTS } from '../../data/commitments'
import { MAX_CORE } from '../../engine/commitments'
import { ALL_ITEMS, itemsForMode } from '../../data/items'
import { RED_LINES } from '../../data/redlines'
import { IDEAL_FRAME, IDEAL_STEM, NOW_FRAME, NOW_STEM, SHARED_RULE } from '../../data/frames'
import { MODE_NAME, REPORT_COMMITMENT_URL } from '../copy'
import css from './Prose.module.css'

const VERCEL: Record<string, string> = {
  fed: 'Structure',
  dem: 'Representation',
  lib: 'Power',
  col: 'Economy',
  pla: 'Control',
  glo: 'Trade',
  int: 'Intervention (approx.)',
  mil: 'Diplomacy',
  mul: 'Immigration',
  rel: 'Religion',
  pro: 'Morality',
  tec: 'Technology',
}

type Report = Record<string, unknown> & {
  generated?: string
  draws?: number
  rgNoGapMedian?: number
  falseAlarm?: Record<string, number>
  power?: Record<string, Record<string, number>>
  carelessDetection?: Record<string, number>
  carelessFalseFlag?: Record<string, number>
  splitFalseRate?: number
  splitFalseByMode?: Record<Mode, { rate: number; nowEmptyRate: number; eligible: number }>
  note?: string
  fitSet?: FitStats
}

const pct = (x: number | undefined) => (typeof x === 'number' ? `${(100 * x).toFixed(x < 0.01 && x > 0 ? 1 : 0)}%` : '—')
/** "a / b / c" across Quick, Standard and Full. */
const byMode = (rows: FitStats['adherents'] | undefined, f: (r: FitStatsRow) => string) =>
  rows ? MODES.map(m => f(rows[m])).join(' / ') : '—'
const byModeOf = <T,>(rows: Record<Mode, T>, f: (r: T) => string) => MODES.map(m => f(rows[m])).join(' / ')

const FULL = ALL_ITEMS.length
const PER_AXIS = AXIS_IDS.map(a => ALL_ITEMS.filter(i => i.axis === a).length)
const FULL_ONLY = FULL - itemsForMode('standard').length - AXIS_IDS.length * 4

export function MethodPage() {
  const c = CALIBRATION
  const rep = (c.report ?? {}) as Report
  return (
    <article className={`narrow ${css.prose}`}>
      <h1>How 12 Axes² works</h1>
      <p className={css.lede}>
        Everything that turns your answers into a result is on this page: the frames, the formulas, every threshold and where it
        came from. Nothing is hidden or hand-tuned after the fact.
      </p>

      <h2>Two frames, one statement</h2>
      <p>Each statement is answered twice, on the same 7-point scale, by one tap on a 7×7 grid.</p>
      <blockquote>
        <strong className="ideal">In your ideal system.</strong> {IDEAL_FRAME} {IDEAL_STEM}
      </blockquote>
      <blockquote>
        <strong className="now">Here and now.</strong> {NOW_FRAME} {NOW_STEM}
      </blockquote>
      <p>{SHARED_RULE}</p>
      <p>
        Both frames rate the <em>same</em> statement, and the question names no actor (“how much do you agree?”), so the only thing
        that changes is which system you are judging. Three choices are deliberate and disclosed:
      </p>
      <ul>
        <li>
          <strong>Fallibility, not “no ruler”.</strong> The ideal is run by ordinary, fallible people — including whoever holds
          power. This rules out a perfect philosopher-king without ruling out monarchist or other hierarchical ideals.
        </li>
        <li>
          <strong>Your system is ideal; the rest of the world is realistic.</strong> Wars, rivals and trade partners still exist.
          Ideology profiles are coded under the same rule.
        </li>
        <li>
          <strong>Conditions are hypothetical in both frames.</strong> “If a few people own most of the wealth…” means: suppose
          that happens. Whether it is actually happening where you live is something you can record with the “doesn’t apply here”
          reason.
        </li>
      </ul>

      <h2>Answers and passing</h2>
      <p>
        Answers run from −3 (strongly disagree) to +3 (strongly agree). <strong>Pass</strong> — for either frame or both —
        records missing data. It is never scored as neutral: a passed statement simply isn’t in the average. Neutral is a real
        answer meaning you hold a middle position.
      </p>

      <h2>The statements</h2>
      <ul>
        <li>
          {FULL} original axis statements, {Math.min(...PER_AXIS)} to {Math.max(...PER_AXIS)} per axis: on every axis, half point
          to each pole, at matched strength.
        </li>
        <li>
          Quick and Standard use 4 and 6 per axis; Full uses all {FULL}. Every set is half for each pole, the sets are nested and
          fixed, and the order is the same for everyone, so results are comparable.
        </li>
        <li>
          The last {FULL_ONLY} Full statements were added to separate ideologies that sit close together on the first ten per
          axis (for example, two kinds of liberalism or of conservatism). Quick and Standard are unchanged.
        </li>
        <li>
          Every length also ends with {RED_LINES.length} <a
            href="#/method"
            onClick={e => {
              // Hash routing: scroll to the section instead of changing the route.
              e.preventDefault()
              document.getElementById('red-lines')?.scrollIntoView()
            }}
          >
            red-line statements
          </a>, which are never scored on an
          axis.
        </li>
        <li>Statements are standing rules or “if this happens, then that” conditionals, with conditionals split evenly between poles. None use “more than now” or “too much”, which would mean different things in the two frames.</li>
        <li>Each statement’s direction was checked blind by a model from a different family than the writer; disagreements were rewritten.</li>
        <li>A script checks every statement against the original 12axes bank and the popular 2026 12axes bank. Overlapping phrasing is rewritten.</li>
      </ul>

      <h2>Axis scores</h2>
      <p>
        For each axis and frame, take your answers as <em>keyed</em> values y = key × answer, where key is +1 if agreeing points
        to the right-hand pole and −1 otherwise. Average the two key directions separately, then together:
      </p>
      <pre className={css.formula}>S = (100/3) × (mean₊ + mean₋) / 2        range −100 … +100</pre>
      <p>
        Because each pole has its own average, someone who agrees with everything scores exactly 0 — even if they pass some
        statements. An axis needs at least 3 answers including both directions, or it shows “not enough answers”.
      </p>
      <p>
        <strong>Error bars</strong> are a within-person standard error with a one-point floor, so perfect consistency never
        produces false certainty: SE = (100/3) × ½ × √(SE₊² + SE₋²), SE± = √((s±² + 1)/n±). Labels like “leans” or “strong” are used
        only when the bar excludes the centre.
      </p>

      <h2>Gaps between the frames</h2>
      <p>
        The gap on an axis uses only statements you answered in both frames: G = (100/3) × (meanΔ₊ + meanΔ₋)/2, where Δ = key ×
        (here-and-now − ideal). A uniform shift in how you use the scale cancels out.
      </p>
      <p>
        A gap is called <strong>notable</strong> — and only then gets an arrow, a direction type or a mention — when |G| is at
        least the threshold for that many paired answers <em>and</em> at least two statements point the same way. Thresholds
        are set so that a respondent with no real gap sees a false notable gap on any of the 12 axes at most 10% of the time:
      </p>
      <table className={css.table}>
        <thead>
          <tr>
            <th>Paired answers on the axis</th>
            {Object.keys(c.tauG).map(n => (
              <th key={n}>{n}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Minimum |G|</td>
            {Object.values(c.tauG).map((v, k) => (
              <td key={k}>{Math.round(v)}</td>
            ))}
          </tr>
        </tbody>
      </table>
      {rep.power && (
        <>
          <p>The price of that caution is power: smaller real gaps often go undetected. Simulated detection rates:</p>
          <table className={css.table}>
            <thead>
              <tr>
                <th>True shift per statement</th>
                {Object.keys(Object.values(rep.power)[0] ?? {}).map(m => (
                  <th key={m}>{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(rep.power).map(([shift, row]) => (
                <tr key={shift}>
                  <td>{shift}</td>
                  {Object.values(row).map((v, k) => (
                    <td key={k}>{Math.round(100 * v)}%</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      <p>
        <strong>Reality Gap</strong> = 100 × average |here-and-now − ideal| ÷ 6, over statements answered in both frames. 0
        means identical answers everywhere. Uniform random clicking averages 38.1.
        {typeof rep.rgNoGapMedian === 'number' && <> A respondent with no real gap but ordinary answer noise typically scores about {Math.round(rep.rgNoGapMedian)}.</>}{' '}
        Bands: very constant below {Math.round(c.rgCuts[0])}, mostly constant below {Math.round(c.rgCuts[1])}, often splits below{' '}
        {Math.round(c.rgCuts[2])}, splits a lot above. The lowest band holds at least 90% of simulated no-gap respondents.
      </p>

      <h2>Which way a gap points</h2>
      <p>
        If you place your country on each axis (optional), a notable gap gets a type, decided in this order with a tolerance of 15
        points:
      </p>
      <ol>
        <li>Your country is already near your ideal: <em>away from a settled ideal</em>.</li>
        <li>Here and now is near where your country is: <em>at the status quo</em>.</li>
        <li>Here and now is between your country and your ideal: <em>partway toward your ideal</em>.</li>
        <li>Here and now is past your ideal: <em>beyond your ideal</em>.</li>
        <li>Otherwise: <em>opposite direction</em>.</li>
      </ol>
      <p>
        A type is shown only if it still holds when your ideal and here-and-now scores each move one standard error either way (the bands drawn on the chart);
        otherwise the direction is “unclear”. Your country placement is a direct judgement, while the other two come from
        statements, so only their order is used.
      </p>

      <h2>Matching to ideologies</h2>
      <p>
        Distance to an ideology is a weighted root-mean-square difference over the axes you have scores on, divided by 200:
        d = √(Σ w(you − it)² / Σ w) / 200. Weights reflect how central an axis is to the ideology and sum to 12 for every ideology,
        so no profile wins just by caring about fewer axes. Matching needs at least 8 scored axes, with 2 in each group.
      </p>
      <p>
        Labels compare your distance with simulated sincere adherents of each ideology answering with ordinary noise: “very close”
        is as close as the median adherent, “close” as the 80th percentile, “loosely similar” as the 95th. There are no compatibility
        percentages. These labels are measurements; the headline uses only one of them, as a breakpoint.
      </p>
      <p>
        The <a href="#/map">ideology map</a> lays the same distances out in 2D and 3D (metric multidimensional scaling, with its
        distortion reported), and its “Exact from here” view draws every ideology at its true distance from one point. Your results
        page shows that view centred on you.
      </p>

      <h3 id="fit-set">The headline: which ideologies you fit</h3>
      <p>
        The headline is a yes/no judgement, made separately for your ideal-system answers and your here-and-now answers. An ideology{' '}
        <em>fits</em> a frame when both hold:
      </p>
      <ol>
        <li>
          none of its <a href="#core-commitments">core commitments</a> or <a href="#red-lines">red-line commitments</a> is contradicted by your answers (a “?” neither rules it out nor
          counts in its favour), and
        </li>
        <li>
          your distance to it is within the “loosely similar” cut: {MODES.map(m => `${MODE_NAME[m]} ${c.labels[m].loose.toFixed(3)}`).join(', ')}.
          95% of simulated sincere adherents land at least that close to their own ideology.
        </li>
      </ol>
      <p>
        A frame with every scored axis at exactly 0 fits no ideology: it carries no position to match.
        Distance is worked out per frame. Commitments (including red lines) are not yet: a commitment that is checked in both frames counts as
        contradicted if either frame contradicts it, so a here-and-now answer can rule an ideology out of your ideal fit set too.
      </p>
      <p>
        The headline lists every ideology that fits, nearest first. One fit is named. Several are all named, because this test
        can’t tell them apart; past four, the nearest three are shown “and N more”, with the full list underneath. If nothing
        fits, the headline says “No close match” and shows the nearest ideology as a measurement, not as your match. Distances,
        bands and stability are printed under the verdict as labelled measurements; they never pick one winner out of the set.
        The same rule drives share cards, share text, preview links, saved runs and the compare page.
      </p>
      <p>
        The headline shows “in theory A, here and now B” only when both frames fit something and their fit sets share no
        ideology. If they share even one, it is not a split, and the page says what here and now fits. If here and now fits
        nothing, that is not a split either: the cut is the 95th percentile, so about 1 in 20 sincere here-and-now answer sets
        lands just outside it by chance.
        {rep.splitFalseByMode && (
          <>
            {' '}
            In the simulation, among respondents with no real gap whose ideal frame fits something (no one else can be split),
            here and now fits nothing {byModeOf(rep.splitFalseByMode, x => pct(x.nowEmptyRate))} of the time, and a false split
            happens {byModeOf(rep.splitFalseByMode, x => pct(x.rate))} of the time (Quick / Standard / Full; the target is at most
            5%).
          </>
        )}
      </p>
      <p>
        Each frame’s nearest ideology is also re-run 200 times with your scores jittered by their error bars: “stable” means the
        same nearest at least 70% of the time, “fairly stable” 40–70%. This is a measurement; a near tie shows up as several fits.
      </p>
      {rep.fitSet && (
        <p>
          Simulated sincere adherents (answering from our coded profiles with ordinary noise) have their own ideology in their
          ideal fit set {byMode(rep.fitSet.adherents, r => pct(r.ownInFit))} of the time (Quick / Standard / Full). Their fit set
          holds {byMode(rep.fitSet.adherents, r => r.meanSize.toFixed(1))} ideologies on average, is empty{' '}
          {byMode(rep.fitSet.adherents, r => pct(r.empty))} of the time, and holds more than three{' '}
          {byMode(rep.fitSet.adherents, r => pct(r.overThree))}. Simulated respondents with independent, uniformly spread positions
          on every axis fit nothing {byMode(rep.fitSet.typical, r => pct(r.empty))}{' '}
          of the time; real views are correlated across axes, so this overstates how often a real person fits nothing. Random
          clickers are mostly stopped by the careless check below; {byMode(rep.fitSet.random, r => pct(r.named))} get a named fit.
        </p>
      )}
      <p>
        If your answers agree with statements on opposite sides of the same axes too often — the signature of random or careless
        answering — the headline is withheld. That check is tuned to catch at least 80% of simulated random clickers while flagging
        at most 5% of honest simulated respondents.
      </p>
      <p>
        Ideologies with a history of mass atrocity (historical fascism, Stalinist Marxism–Leninism) and theocratic absolutism fit
        only within the stricter “very close” cut; within “loosely similar” they are listed as also close but never named. Share
        cards need your explicit opt-in to show them. Without it, what you share is worked out as if they were not listed, so its
        headline can differ from your results page; the share panel says so when it does.
      </p>

      <h2 id="core-commitments">Core commitments</h2>
      <p>
        Distance alone can call you close to an ideology while you reject something central to it. So each ideology can list up
        to {MAX_CORE} <em>core commitments</em>: statements on which the coded profiles of its mainstream all take the same
        side. Three instances of one AI model (Claude Opus, reading as a theorist, an insider and a sceptic) proposed them
        independently; one is kept when at least two proposed it and the ideology’s coded answers sit firmly on that side. Each is
        then checked for counterexamples: a statement that sincere mainstream adherents reject on principle is dropped, as the
        must-agree “any group of citizens should be free to form a party” was, because militant democracies ban anti-democratic
        parties. They have not been checked with adherents or experts, so “every adherent” is a claim we cannot make;{' '}
        <a href={REPORT_COMMITMENT_URL}>report one you think is wrong</a>. This is a pass/fail check, not a score, in the spirit of Critical Fallibilism’s idea–goal–context evaluation: the
        ideology is the idea, each commitment a goal it must meet, and your answers the context.
      </p>
      <ul>
        <li>
          <strong>✔ holds</strong>: you answered on the required side, at least “slightly”.
        </li>
        <li>
          <strong>✘ contradicted</strong>: you answered on the other side at “agree” / “disagree” strength or stronger. “Slightly”
          the other way is not decisive, because single answers are noisy.
        </li>
        <li>
          <strong>? unknown</strong>: you passed, answered neutral, were only slightly the other way, or the statement is not in
          your length of test. Unknown never counts as holding.
        </li>
      </ul>
      <p>
        Most commitments check your ideal-system answer; some also check here and now, and then fail if either frame fails. One
        contradicted commitment rules the ideology out for you: it is never in your fit set, in either frame, and stability re-runs
        skip it. It stays in your ranked list, marked “ruled out” with the statement, and if it was within range the headline says
        so. A shared link carries only which ideologies were ruled out, never the answers.
        {typeof rep.commitmentFalseRuleOut === 'number' && (
          <>
            {' '}
            In the calibration simulation, adherents simulated from our own coded profiles are ruled out of their own ideology{' '}
            {rep.commitmentFalseRuleOut < 0.001 ? 'under 0.1%' : `${(100 * rep.commitmentFalseRuleOut).toFixed(1)}%`} of the time.
            That only shows ordinary answer noise rarely trips a commitment, which is consistency with our own coding. It cannot show
            that real adherents hold them.
          </>
        )}
        {!HAS_COMMITMENTS && ' Commitments are still being coded, so none are applied yet.'}
      </p>

      <h3 id="red-lines">Red lines</h3>
      <p>
        Every test, at every length, ends with {RED_LINES.length} short red-line statements, answered in both frames on the same
        grid. They cover things like imprisonment by ethnicity, torture, collective punishment, jailing peaceful critics,
        cancelling elections and targeting civilians. They are deliberately <em>off-axis</em>: they never move an axis score,
        and they are not part of your profile, the careless-answering check, the Reality Gap, axis coverage or the “answered”
        count.
      </p>
      <p>
        Their only job is to rule ideologies out. An ideology can list a <em>red-line commitment</em>: the side the coded
        profiles of its mainstream all take on that statement. These work exactly like core commitments (✔ / ✘ / ?, “agree” strength or stronger on
        the wrong side is decisive) and are coded the same way: three independent Opus lenses (theorist, insider, sceptic), kept
        when at least two of three agree and the coded sheet agrees, and audited so that no more than 2% of respondents
        simulated from an ideology’s coded answers are ruled out of it. Like core commitments, they are AI coders’ judgements,
        not checked with adherents. Nearly all of them check both frames, so a here-and-now answer can rule an ideology out
        too: an ideology that holds a line holds it today, not just in an ideal world. Red-line commitments don’t count towards
        the {MAX_CORE} core commitments. Your results
        show one “Red lines” column per ideology and, for you only, your answer on each red line with the ideologies it rules
        out. A shared link includes where you stand on them only if you tick that box when sharing.
        {!HAS_RED_COMMITMENTS && ' Red-line commitments are still being coded, so none are applied yet.'}
      </p>
      <p>
        Because one answer can rule an ideology out, each red line is worded narrowly, and a note under it says what it asks
        and what it does not. The political-violence line, for example, is about violence against <em>peaceful</em> opponents:
        force against someone planning an attack or an armed takeover is not what it asks. An earlier wording left that open,
        so someone who read it as “a genuine threat” and agreed could be wrongly ruled out of the liberal and democratic
        ideologies that reject political violence.
      </p>

      <h2>How the ideology profiles were made</h2>
      <p>
        Each of the {CATALOGUE.length} ideologies was given a packet: a fair, adherent-voice description, its practical programme
        today, and sources including at least one written by adherents. Three AI coders from different model families (Anthropic
        Claude, OpenAI GPT, xAI Grok), working blind to each other, answered all {FULL + RED_LINES.length} statements ({FULL} axis statements and the{' '}
        {RED_LINES.length} red lines) in both frames as a sincere,
        mainstream adherent would. The median answer per statement was scored with exactly the same formula as yours, so profiles
        and people sit on the same scale. Per-axis disagreement between coders is published on the{' '}
        <a href="#/ideologies">catalogue page</a>. These profiles are informed editorial judgements, not facts about every
        adherent.
        {CATALOGUE_IS_PLACEHOLDER && <strong> (This build is using a development placeholder catalogue.)</strong>}
      </p>

      <h2>Comparing two people</h2>
      <p>
        The compare page counts the axes on which two people <em>clearly differ</em>, separately for ideal systems and for here and
        now. Two scores clearly differ when they are further apart than 1.96 times their combined standard error, written{' '}
        <code>√(SE₁² + SE₂²)</code>: a 95% test per axis. In the simulation below, the same person taking the test twice is
        flagged on about 0.3% of axes, and two random people on about 45% (their median gap is about 50 points). We don’t show a
        percentage “overlap”: any two people would already score about 59% on one, which makes every pair look alike. If the two
        people live in different countries, their here-and-now answers respond to different situations and aren’t directly
        comparable; the page says so when both shared a country.
      </p>

      <h2>Calibration</h2>
      <p>
        All thresholds come from one seeded simulation committed with the source (<code>scripts/calibrate.ts</code>). Simulated
        respondents have a true position per axis, a per-statement offset (SD 0.6 points) and response noise (SD 0.8 points),
        rounded to the 7-point scale. For no-gap respondents the here-and-now answer either copies the ideal answer (30%, 50% or
        70% of the time) or is drawn with independent noise. Random passes of 0%, 10% and 20% are included.
        {rep.generated && <> Last run: {rep.generated}{rep.draws ? `, ${rep.draws.toLocaleString()} simulated respondents per setting` : ''}.</>}
      </p>
      {rep.note && <p className="muted small">{rep.note}</p>}

      <h2>Limits</h2>
      <ul>
        <li>This is an exploratory tool, not a validated psychometric instrument. There are no population norms and no percentiles.</li>
        <li>Here-and-now scores depend on where you live. Two people with the same values in different countries should differ there; don’t compare them as if they were values.</li>
        <li>The 12 axes overlap. Research on political attitudes finds about two to five underlying dimensions, so treat these as related facets.</li>
        <li>Some axes bundle two things that usually travel together: ownership with redistribution, use of force with military size, and immigration levels with integration.</li>
        <li>The 12-axis model has no axis for remedying historical injustice or for emergency powers; such views spread across several axes.</li>
        <li>Wording shapes answers. Every statement is published so you can judge them.</li>
      </ul>

      <h2>Names, old and new</h2>
      <p>Some pole names were changed to ones that adherents of each side would accept. The originals are kept here:</p>
      <table className={css.table}>
        <thead>
          <tr>
            <th>12 Axes²</th>
            <th>Original 12axes (MIT)</th>
            <th>12axes.vercel.app</th>
          </tr>
        </thead>
        <tbody>
          {AXIS_IDS.map(a => (
            <tr key={a}>
              <td>
                {AXES[a].neg} / {AXES[a].pos}
              </td>
              <td>
                {AXES[a].mit[0]} / {AXES[a].mit[1]}
              </td>
              <td>{VERCEL[a]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  )
}

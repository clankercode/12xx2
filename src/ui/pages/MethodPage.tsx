import { AXIS_IDS } from '../../engine/types'
import { AXES } from '../../data/axes'
import { CALIBRATION } from '../../data/calibration'
import { CATALOGUE, CATALOGUE_IS_PLACEHOLDER } from '../../data/archetypes'
import { IDEAL_FRAME, NOW_FRAME, SHARED_RULE } from '../../data/frames'
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
  note?: string
}

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
        <strong className="ideal">In your ideal system.</strong> {IDEAL_FRAME}
      </blockquote>
      <blockquote>
        <strong className="now">Here and now.</strong> {NOW_FRAME}
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
        <li>120 original statements, 10 per axis: 5 where agreeing points to each pole, at matched strength.</li>
        <li>Quick, Standard and Full use 4, 6 and 10 per axis, always half for each pole. The sets are nested and fixed, and the order is the same for everyone, so results are comparable.</li>
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
        A type is shown only if it still holds when your ideal and here-and-now scores each move half a standard error either way;
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
        percentages. Each match is re-run 200 times with your scores jittered by their error bars: stable means the same winner at
        least 70% of the time, fairly stable 40–70%.
      </p>
      <p>
        The headline shows two different ideologies (“in theory A, here and now B”) only when your here-and-now scores are closer to
        B than to A by at least {c.mu.toFixed(3)} and B is not a toss-up. That margin is set so a respondent with no real gap
        gets a false split at most 5% of the time{typeof rep.splitFalseRate === 'number' && <> (measured: {(100 * rep.splitFalseRate).toFixed(1)}%)</>}.
      </p>
      <p>
        If your answers agree with statements on opposite sides of the same axes too often — the signature of random or careless
        answering — the headline is withheld. That check is tuned to catch at least 80% of simulated random clickers while flagging
        at most 5% of honest simulated respondents.
      </p>
      <p>
        Ideologies with a history of mass atrocity (historical fascism, Stalinist Marxism–Leninism) and theocratic absolutism can
        lead your headline only when they are very close and stable; share cards need your explicit opt-in to show them.
      </p>

      <h2>How the ideology profiles were made</h2>
      <p>
        Each of the {CATALOGUE.length} ideologies was given a packet: a fair, adherent-voice description, its practical programme
        today, and sources including at least one written by adherents. Three AI coders from different model families (Anthropic
        Claude, OpenAI GPT, xAI Grok), working blind to each other, answered all 120 statements in both frames as a sincere,
        mainstream adherent would. The median answer per statement was scored with exactly the same formula as yours, so profiles
        and people sit on the same scale. Per-axis disagreement between coders is published on the{' '}
        <a href="#/ideologies">catalogue page</a>. These profiles are informed editorial judgements, not facts about every
        adherent.
        {CATALOGUE_IS_PLACEHOLDER && <strong> (This build is using a development placeholder catalogue.)</strong>}
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

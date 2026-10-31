import type { ReactNode } from 'react'
import type { HeroPick, Match, Results } from '../engine/results'
import type { ArchetypeCheck } from '../engine/commitments'
import { AXES } from '../data/axes'
import { CALIBRATION } from '../data/calibration'
import { CATALOGUE_IS_PLACEHOLDER } from '../data/archetypes'
import { countryName } from '../data/countries'
import { ALL_ITEMS } from '../data/items'
import wgi from '../data/wgi.json'
import { AxisChart, type Overlay } from './AxisChart'
import { CoreCommitments } from './Commitments'
import { label as answerLabel } from './answer'
import { GAP_TYPE, MATCH_LABEL, MODE_NAME, RG_BAND, STABILITY_LABEL } from './copy'
import css from './Results.module.css'

const ALL_TEXT = new Map(ALL_ITEMS.map(i => [i.id, i.text]))
const RANDOM_RG = Math.round((16 / 7 / 6) * 100)

export function noGapBaseline(): number | null {
  const r = CALIBRATION.report as { rgNoGapMedian?: number } | undefined
  return typeof r?.rgNoGapMedian === 'number' ? Math.round(r.rgNoGapMedian) : null
}

/** Short plain-language glosses for the stability labels (spec: matches are re-run with jittered scores). */
const STABILITY_GLOSS: Record<HeroPick['stability']['label'], string> = {
  stable: 'same top match in 70%+ of re-runs',
  'fairly-stable': 'same top match in 40–70% of re-runs',
  'toss-up': 'other ideologies are about as close',
}

function stabilityText(p: HeroPick) {
  const l = p.stability.label
  return (
    <>
      {STABILITY_LABEL[l]}{' '}
      <span className="muted">
        (<a href="#/method">{STABILITY_GLOSS[l]}</a>)
      </span>
    </>
  )
}

export function Hero({ r, who = 'You' }: { r: Results; who?: string }) {
  const h = r.hero
  const p = r.payload
  const noGap = noGapBaseline()
  return (
    <section className={css.hero} aria-label="Headline result">
      <div className={css.heroMeta}>
        <span>{MODE_NAME[p.mode]} test</span>
        <span>
          from {p.answered} of {p.total} statements
        </span>
        {p.mode === 'quick' && <span className={css.chipWarn}>Low precision</span>}
        {CATALOGUE_IS_PLACEHOLDER && <span className={css.chipWarn}>Development catalogue</span>}
      </div>
      {h.kind === 'unreliable' && (
        <div>
          <h1 className={css.heroTitle}>No reliable match</h1>
          <p>
            {who === 'You' ? 'Your' : 'These'} answers agreed with statements on opposite sides of the same axes too often to
            place reliably — the pattern fast or random answering produces. The chart below is shown as answered.
          </p>
        </div>
      )}
      {h.kind === 'none-fit' && (
        <div>
          <h1 className={css.heroTitle}>No listed ideology fits</h1>
          <p>
            {who === 'You' ? 'You contradict' : 'These answers contradict'} a core commitment of every ideology close enough to
            name. The chart below is shown as answered, and the closest ideologies are listed with what rules them out.
          </p>
        </div>
      )}
      {h.kind === 'insufficient' && (
        <div>
          <h1 className={css.heroTitle}>Not enough answers to match</h1>
          <p>Matching needs scores on at least 8 axes, including 2 in each group. Passed statements are left out.</p>
        </div>
      )}
      {h.kind === 'split' && (
        <div className={css.pair}>
          <HeroHalf frame="I" pick={h.ideal} who={who} />
          <span className={css.pairArrow} aria-hidden>
            →
          </span>
          <HeroHalf frame="N" pick={h.now} who={who} />
        </div>
      )}
      {h.kind === 'constant' && (
        <div>
          <p className={css.heroKicker}>Constant</p>
          <h1 className={css.heroTitle}>{h.ideal.match.arch.name}</h1>
          <p className={css.heroSub}>
            {MATCH_LABEL[h.ideal.match.label]} · {stabilityText(h.ideal)}.{' '}
            {h.nowMissing
              ? 'Not enough here-and-now answers to place that frame.'
              : 'Your ideal and here-and-now answers sit closest to the same ideology.'}
            {h.leaning && h.leaning.match.arch.slug !== h.ideal.match.arch.slug && (
              <> Here and now you lean toward {h.leaning.match.arch.name}, but not by enough to call it a split.</>
            )}
          </p>
          {h.ideal.alsoClose && (
            <p className="small muted">Also close: {h.ideal.alsoClose.arch.name}.</p>
          )}
          <RuledOutNote pick={h.ideal} who={who} />
          {r.strongestGap && (
            <p className={css.hook}>
              Biggest gap: <strong>{AXES[r.strongestGap.axis].title}</strong>, here and now pulls you toward{' '}
              <strong>{r.strongestGap.G! > 0 ? AXES[r.strongestGap.axis].pos : AXES[r.strongestGap.axis].neg}</strong>
              {r.strongestGap.type && <> ({GAP_TYPE[r.strongestGap.type].name.toLowerCase()})</>}.
            </p>
          )}
        </div>
      )}
      <div className={css.stats}>
        <Stat
          label="Reality Gap"
          value={p.rg === null ? '—' : String(p.rg)}
          sub={r.rgBand ? RG_BAND[r.rgBand] : 'No paired answers'}
          note={`0 = identical answers in both frames${noGap !== null ? ` · typical noise ≈ ${noGap}` : ''} · random clicking ≈ ${RANDOM_RG}`}
        />
        {p.sc && (
          <Stat
            label="System confidence"
            value={String(p.sc.score)}
            sub={`± ${p.sc.se}`}
            note="How well you think your system works by its own rules (0–100)"
          />
        )}
        {p.country && <WgiStat code={p.country} />}
      </div>
    </section>
  )
}

function HeroHalf({ frame, pick, who }: { frame: 'I' | 'N'; pick: HeroPick; who: string }) {
  return (
    <div className={css.half}>
      <p className={`${css.heroKicker} ${frame === 'I' ? 'ideal' : 'now'}`}>
        <span className={frame === 'I' ? 'glyph-ideal' : 'glyph-now'} aria-hidden /> {frame === 'I' ? 'Ideal' : 'Here and now'}
      </p>
      <h1 className={css.heroTitle}>{pick.match.arch.name}</h1>
      <p className={css.heroSub}>
        {MATCH_LABEL[pick.match.label]} · {stabilityText(pick)}
        {frame === 'N' && <span className="muted"> · your here-and-now answers sit closest to this ideal</span>}
      </p>
      {pick.alsoClose && <p className="small muted">Also close: {pick.alsoClose.arch.name}</p>}
      <RuledOutNote pick={pick} who={who} />
    </div>
  )
}

function RuledOutNote({ pick, who }: { pick: HeroPick; who: string }) {
  if (!pick.nearestRuledOut) return null
  return (
    <p className="small muted">
      Closest by distance: {pick.nearestRuledOut.arch.name}, but {who === 'You' ? 'you contradict' : 'these answers contradict'}{' '}
      one of its core commitments.
    </p>
  )
}

function Stat({ label, value, sub, note }: { label: string; value: string; sub: string; note: string }) {
  return (
    <div className={css.stat}>
      <span className={css.statLabel}>{label}</span>
      <span className={css.statValue}>{value}</span>
      <span className={css.statSub}>{sub}</span>
      <span className="small muted">{note}</span>
    </div>
  )
}

function WgiStat({ code }: { code: string }) {
  const c = (wgi.countries as Record<string, { year: number; rl: number; rlLo: number; rlHi: number; cc: number; ccLo: number; ccHi: number }>)[code]
  if (!c) return null
  return (
    <div className={css.stat}>
      <span className={css.statLabel}>{countryName(code)}: external reference</span>
      <span className={css.statValue}>{Math.round(c.rl)}</span>
      <span className={css.statSub}>
        rule of law · corruption control {Math.round(c.cc)}
      </span>
      <span className="small muted">
        World Bank WGI {c.year} scores (0–100; 90% range {Math.round(c.rlLo)}–{Math.round(c.rlHi)}). As rated by the WGI, not by
        this test.
      </span>
    </div>
  )
}

type Checks = ReadonlyMap<string, ArchetypeCheck>

export function Matches({ r, checks }: { r: Results; checks?: Checks }) {
  if (!r.matchesIdeal.length && !r.matchesNow.length) return null
  const joint = r.joint.find(m => !m.ruledOut)
  return (
    <section className={css.section}>
      <h2>Closest ideologies</h2>
      <p className="muted small">
        Distances are to each ideology’s <em>ideal</em> profile, built by having three AI coders from different model families
        answer every statement as a sincere adherent. Labels compare you with how close simulated adherents land. See{' '}
        <a href="#/ideologies">the catalogue</a>.
      </p>
      <div className={css.matchCols}>
        <MatchList title="Ideal" frame="I" list={r.matchesIdeal} checks={checks} />
        <MatchList title="Here and now" frame="N" list={r.matchesNow} checks={checks} />
      </div>
      {joint && (
        <p className={css.joint}>
          <strong>Theory-and-practice pattern:</strong> your ideal and here-and-now answers together most resemble{' '}
          <strong>{joint.arch.name}</strong> ({MATCH_LABEL[joint.label].toLowerCase()}), comparing against each
          ideology’s ideal <em>and</em> its practical programme in a present-day liberal democracy
          {r.payload.sc && r.payload.sc.score < 50 ? ' — a different starting point from the one you described, so read this loosely' : ''}.
        </p>
      )}
    </section>
  )
}

/** What rules a match out, from the owner's own answers; shared views only know that it is ruled out. */
function contradiction(m: Match, checks?: Checks) {
  const c = checks?.get(m.arch.slug)?.checks.find(x => x.verdict === 'fail')
  const f = c?.frames.find(x => x.verdict === 'fail')
  if (!c || !f) return null
  const text = ALL_TEXT.get(c.commitment.item) ?? c.commitment.item
  return (
    <>
      You answered {answerLabel(f.answer).toLowerCase()} to “{text}” ({f.frame === 'I' ? 'ideal system' : 'here and now'}).
    </>
  )
}

function MatchList({ title, frame, list, checks }: { title: string; frame: 'I' | 'N'; list: Match[]; checks?: Checks }) {
  return (
    <div>
      <h3 className={frame === 'I' ? 'ideal' : 'now'}>
        <span className={frame === 'I' ? 'glyph-ideal' : 'glyph-now'} aria-hidden /> {title}
      </h3>
      {list.length === 0 && <p className="muted small">Not enough answers in this frame.</p>}
      <ol className={css.matchList}>
        {list.map(m => (
          <li key={m.arch.slug} data-ruled-out={m.ruledOut || undefined}>
            <div className={css.matchHead}>
              <a href={`#/ideologies`} className={css.matchName}>
                {m.arch.name}
              </a>
              {m.ruledOut ? (
                <span className={`${css.matchLabel} ${css.ruledOut}`}>
                  <span aria-hidden>✘</span> Ruled out
                </span>
              ) : (
                <span className={css.matchLabel}>{MATCH_LABEL[m.label]}</span>
              )}
            </div>
            {m.ruledOut && (
              <p className="small">
                Contradicts a core commitment. {contradiction(m, checks)}
              </p>
            )}
            <p className="small">{m.arch.summary}</p>
            <p className="small muted">
              Nearest on {m.why.near.map(a => AXES[a].title.toLowerCase()).join(', ')}
              {m.why.far && <>; furthest on {AXES[m.why.far].title.toLowerCase()}</>}.
            </p>
          </li>
        ))}
      </ol>
    </div>
  )
}

export function Gaps({ r, children }: { r: Results; children?: ReactNode }) {
  const notable = r.rows.filter(x => x.notable && x.G !== null)
  return (
    <section className={css.section}>
      <h2>Where theory and practice part ways</h2>
      <p className="muted small">
        Only gaps bigger than the noise expected from your number of answers are listed. <a href="#/method">How gaps are tested</a>.
      </p>
      {notable.length === 0 ? (
        <p>
          No axis has a gap bigger than the noise expected from {r.payload.mode === 'quick' ? 'this few' : 'this many'} answers.
          Your differences, if any, are spread thinly across axes.
        </p>
      ) : (
        <div className={css.gapList}>
          {notable
            .sort((a, b) => Math.abs(b.G!) - Math.abs(a.G!))
            .map(x => {
              const meta = AXES[x.axis]
              return (
                <div key={x.axis} className={css.gap}>
                  <h3>{meta.title}</h3>
                  <p>
                    Here and now pulls you toward <strong>{x.G! > 0 ? meta.pos : meta.neg}</strong> by {Math.abs(x.G!)} points{' '}
                    <span className="muted">(scores run −100 to +100)</span>.
                  </p>
                  {x.type && (
                    <p className="small">
                      <strong>{GAP_TYPE[x.type].name}.</strong> {GAP_TYPE[x.type].text}
                    </p>
                  )}
                </div>
              )
            })}
        </div>
      )}
      {r.rows.some(x => x.settled) && (
        <p className="small muted">
          Settled (your country already sits near both your answers):{' '}
          {r.rows
            .filter(x => x.settled)
            .map(x => AXES[x.axis].title)
            .join(', ')}
          .
        </p>
      )}
      {children}
    </section>
  )
}

export function ResultsView({
  r,
  overlay,
  extras,
  who,
  checks,
}: {
  r: Results
  overlay?: Overlay
  extras?: ReactNode
  who?: string
  /** The owner's core-commitment checks (needs answers, so never in shared views). */
  checks?: Checks
}) {
  return (
    <div className={`wrap ${css.results}`}>
      <Hero r={r} who={who} />
      <section className={css.section}>
        <h2>Your 12 axes, twice</h2>
        <AxisChart rows={r.rows} overlay={overlay} />
      </section>
      <Gaps r={r} />
      <Matches r={r} checks={checks} />
      {checks && <CoreCommitments r={r} checks={checks} />}
      {extras}
    </div>
  )
}

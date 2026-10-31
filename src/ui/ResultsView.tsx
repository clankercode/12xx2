import type { ReactNode } from 'react'
import { fits, sameInBothFrames, type FitSet, type Match, type Results } from '../engine/results'
import type { StabilityLabel } from '../engine/match'
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
import { CANT_TELL, GAP_TYPE, MATCH_LABEL, MODE_NAME, RG_BAND, STABILITY_LABEL, constantNote, distanceNote, fitTitle, noFitNote } from './copy'
import css from './Results.module.css'

const ALL_TEXT = new Map(ALL_ITEMS.map(i => [i.id, i.text]))
const RANDOM_RG = Math.round((16 / 7 / 6) * 100)

export function noGapBaseline(): number | null {
  const r = CALIBRATION.report as { rgNoGapMedian?: number } | undefined
  return typeof r?.rgNoGapMedian === 'number' ? Math.round(r.rgNoGapMedian) : null
}

/** Short plain-language glosses for the stability labels (spec: matches are re-run with jittered scores). */
const STABILITY_GLOSS: Record<StabilityLabel, string> = {
  stable: 'same nearest in 70%+ of re-runs',
  'fairly-stable': 'same nearest in 40–70% of re-runs',
  'toss-up': 'others are about as near',
}

function stabilityText(f: FitSet) {
  if (!f.stability) return null
  const l = f.stability.label
  return (
    <>
      {' '}
      · {STABILITY_LABEL[l]}{' '}
      <span className="muted">
        (<a href="#/method">{STABILITY_GLOSS[l]}</a>)
      </span>
    </>
  )
}

/** The "fits" cuts for one test length. */
type Cuts = { loose: number; veryClose: number }

/** Distance and stability of the nearest ideology, labelled as measurements under the verdict. */
function Measured({ f, cuts }: { f: FitSet; cuts: Cuts }) {
  return (
    <p className="small muted" data-measure>
      Measured: {distanceNote(f, cuts)}
      {stabilityText(f)}.
    </p>
  )
}

/** Ideologies the fit-set rule left out of the headline although they are within range: listed, never named as a match. */
function LeftOut({ f, who }: { f: FitSet; who: string }) {
  return (
    <>
      {f.ruledOutInRange.length > 0 && (
        <p className="small muted">
          Within range but ruled out ({who === 'You' ? 'you contradict' : 'these answers contradict'} a core or red-line commitment):{' '}
          {f.ruledOutInRange.map(m => m.arch.name).join(', ')}.
        </p>
      )}
      {f.heldBack.length > 0 && (
        <p className="small muted">
          Also close: {f.heldBack.map(m => m.arch.name).join(', ')} (sensitive ideologies are named only when very close).
        </p>
      )}
    </>
  )
}

export function Hero({ r, who = 'You' }: { r: Results; who?: string }) {
  const h = r.hero
  const p = r.payload
  const noGap = noGapBaseline()
  const cuts = CALIBRATION.labels[p.mode]
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
      {h.kind === 'no-fit' && (
        <div data-fit-count={0}>
          <h1 className={css.heroTitle}>No close match</h1>
          <p className={css.heroSub}>{noFitNote(h.ideal, who)}</p>
          <Measured f={h.ideal} cuts={cuts} />
          <LeftOut f={h.ideal} who={who} />
          {h.now && h.now.fits.length > 0 && (
            <p className="small">
              Here and now {who === 'You' ? 'you fit' : 'these answers fit'} <strong>{fitTitle(h.now)}</strong>
              {h.now.fits.length > 1 && <>; {CANT_TELL}</>}.
            </p>
          )}
          <GapHook r={r} />
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
          <HeroHalf f={h.ideal} who={who} cuts={cuts} />
          <span className={css.pairArrow} aria-hidden>
            →
          </span>
          <HeroHalf f={h.now} who={who} cuts={cuts} />
        </div>
      )}
      {h.kind === 'constant' && (
        <div data-fit-count={h.ideal.fits.length}>
          <p className={css.heroKicker}>
            {sameInBothFrames(h) ? 'In theory and here and now, ' : 'In theory, '}
            {who === 'You' ? 'you fit' : 'these answers fit'}
          </p>
          <h1 className={`${css.heroTitle} ${h.ideal.fits.length > 1 ? css.heroTitleList : ''}`}>{fitTitle(h.ideal)}</h1>
          {h.ideal.fits.length > 1 && <p className={css.heroSub}>{fitSetSub(h.ideal)}</p>}
          <p className={css.heroSub}>{constantNote(h, who)}</p>
          <Measured f={h.ideal} cuts={cuts} />
          <LeftOut f={h.ideal} who={who} />
          <GapHook r={r} />
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

function GapHook({ r }: { r: Results }) {
  if (!r.strongestGap) return null
  return (
    <p className={css.hook}>
      Biggest gap: <strong>{AXES[r.strongestGap.axis].title}</strong>, here and now pulls you toward{' '}
      <strong>{r.strongestGap.G! > 0 ? AXES[r.strongestGap.axis].pos : AXES[r.strongestGap.axis].neg}</strong>
      {r.strongestGap.type && <> ({GAP_TYPE[r.strongestGap.type].name.toLowerCase()})</>}.
    </p>
  )
}

/** "This test can’t tell them apart", with the full list when the headline shortened it. */
function fitSetSub(f: FitSet): string {
  const more = f.fits.length > 4 ? ` All ${f.fits.length}: ${f.fits.map(m => m.arch.name).join(', ')}.` : ''
  return `${CANT_TELL.charAt(0).toUpperCase()}${CANT_TELL.slice(1)}.${more}`
}

function HeroHalf({ f, who, cuts }: { f: FitSet; who: string; cuts: Cuts }) {
  const frame = f.frame
  return (
    <div className={css.half} data-fit-count={f.fits.length}>
      <p className={`${css.heroKicker} ${frame === 'I' ? 'ideal' : 'now'}`}>
        <span className={frame === 'I' ? 'glyph-ideal' : 'glyph-now'} aria-hidden /> {frame === 'I' ? 'Ideal' : 'Here and now'}
        {f.fits.length > 0 && <>: {who === 'You' ? 'you fit' : 'these answers fit'}</>}
      </p>
      <h1 className={`${css.heroTitle} ${f.fits.length > 1 ? css.heroTitleList : ''}`}>{fitTitle(f)}</h1>
      {f.fits.length > 1 && <p className={css.heroSub}>{fitSetSub(f)}</p>}
      {f.fits.length === 0 && <p className={css.heroSub}>{noFitNote(f, who)}</p>}
      {frame === 'N' && f.fits.length > 0 && (
        <p className="small muted">Your here-and-now answers, compared with each ideology’s ideal.</p>
      )}
      <Measured f={f} cuts={cuts} />
      <LeftOut f={f} who={who} />
    </div>
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
              ) : fits(m) ? (
                <span className={`${css.matchLabel} ${css.fits}`}>
                  <span aria-hidden>✔</span> Fits · {MATCH_LABEL[m.label]}
                </span>
              ) : (
                <span className={css.matchLabel}>{MATCH_LABEL[m.label]}</span>
              )}
            </div>
            {m.ruledOut && (
              <p className="small">
                Contradicts a core or red-line commitment. {contradiction(m, checks)}
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

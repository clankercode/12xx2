import { useMemo } from 'react'
import { AXIS_IDS } from '../engine/types'
import { decodeShared } from '../state/shared'
import { deriveResults, type Results } from '../engine/results'
import { distance } from '../engine/match'
import { catalogueFor } from '../data/archetypes'
import { CALIBRATION } from '../data/calibration'
import { AXES } from '../data/axes'
import { AxisChart } from './AxisChart'
import { DECODE_MESSAGE } from './SharedPage'
import { MATCH_LABEL } from './copy'
import css from './Results.module.css'

function heroName(r: Results): string {
  const h = r.hero
  if (h.kind === 'split') return `${h.ideal.match.arch.name} → ${h.now.match.arch.name}`
  if (h.kind === 'constant') return h.ideal.match.arch.name
  return 'No reliable match'
}

export function ComparePage({ mine, theirs }: { mine: string; theirs: string }) {
  const a = useMemo(() => decodeShared(mine), [mine])
  const b = useMemo(() => decodeShared(theirs), [theirs])
  if (!a.ok || !b.ok) {
    return (
      <div className="narrow" style={{ padding: '48px 0' }}>
        <h1>Can’t compare these results</h1>
        <p>{DECODE_MESSAGE[!a.ok ? a.error : (b as { ok: false; error: keyof typeof DECODE_MESSAGE }).error]}</p>
      </div>
    )
  }
  const ra = deriveResults(a.payload, catalogueFor(a.payload), CALIBRATION)
  const rb = deriveResults(b.payload, catalogueFor(b.payload), CALIBRATION)
  const ones = AXIS_IDS.map(() => 1)
  // Compare only axes both people have scores on.
  const both = (x: (number | null)[], y: (number | null)[]) => distance(x.map((v, k) => (y[k] === null ? null : v)), y.map(v => v ?? 0), ones)
  const dI = both(a.payload.I, b.payload.I)
  const dN = both(a.payload.N, b.payload.N)
  const diffs = AXIS_IDS.map((ax, k) => {
    const x = a.payload.I[k]
    const y = b.payload.I[k]
    return { ax, d: x === null || y === null || x === undefined || y === undefined ? null : Math.abs(x - y) }
  }).filter((x): x is { ax: (typeof AXIS_IDS)[number]; d: number } => x.d !== null)
  diffs.sort((p, q) => p.d - q.d)
  const pct = (d: number) => Math.round(100 * (1 - d))

  return (
    <div className={`wrap ${css.results}`}>
      <section className={css.hero}>
        <p className="small muted">Comparing two results. Each link contains scores only, never answers.</p>
        <div className={css.pair}>
          <div className={css.half}>
            <p className={css.heroKicker}>You</p>
            <h1 className={css.heroTitle} style={{ fontSize: 'clamp(1.6rem, 4vw, 2.6rem)' }}>
              {heroName(ra)}
            </h1>
            {ra.matchesIdeal[0] && <p className="small muted">{MATCH_LABEL[ra.matchesIdeal[0].label]}</p>}
          </div>
          <span className={css.pairArrow} aria-hidden>
            ⇄
          </span>
          <div className={css.half}>
            <p className={css.heroKicker}>Them</p>
            <h1 className={css.heroTitle} style={{ fontSize: 'clamp(1.6rem, 4vw, 2.6rem)' }}>
              {heroName(rb)}
            </h1>
            {rb.matchesIdeal[0] && <p className="small muted">{MATCH_LABEL[rb.matchesIdeal[0].label]}</p>}
          </div>
        </div>
        <div className={css.stats}>
          <div className={css.stat}>
            <span className={css.statLabel}>Ideal systems</span>
            <span className={css.statValue}>{pct(dI)}%</span>
            <span className="small muted">overlap (100% = identical scores on every axis)</span>
          </div>
          <div className={css.stat}>
            <span className={css.statLabel}>Here and now</span>
            <span className={css.statValue}>{pct(dN)}%</span>
            <span className="small muted">overlap</span>
          </div>
        </div>
        {diffs.length >= 2 && (
          <p>
            You agree most on <strong>{AXES[diffs[0]!.ax].title.toLowerCase()}</strong> and differ most on{' '}
            <strong>{AXES[diffs[diffs.length - 1]!.ax].title.toLowerCase()}</strong> (ideal system).
          </p>
        )}
      </section>
      <section className={css.section}>
        <h2>Side by side</h2>
        <p className="small muted">Filled markers are you; hollow markers are them.</p>
        <AxisChart rows={ra.rows} overlay={{ label: 'Them', rows: rb.rows }} />
      </section>
      <section className={css.section}>
        <a className="btn btn-primary" href="#/">
          Take the test
        </a>
      </section>
    </div>
  )
}

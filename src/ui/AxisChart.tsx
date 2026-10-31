import { GROUPS, type AxisId, type GroupId } from '../engine/types'
import type { AxisRow } from '../engine/results'
import { AXES, GROUP_TITLES } from '../data/axes'
import css from './AxisChart.module.css'

const pct = (v: number) => `${(v + 100) / 2}%`

export interface Overlay {
  label: string
  rows: AxisRow[]
  /** Per-axis "clearly different" flags for each frame. When set, links join the two people instead of one person's frames. */
  clear?: { I: boolean[]; N: boolean[] }
}

/**
 * The 12×2 chart: per axis, an Ideal lane (◆) above a Here-and-now lane (●),
 * joined by a slanted link whose tilt is the gap. Whiskers are ±1 SE. Arrows
 * appear only on notable (noise-gated) gaps.
 */
export function AxisChart({ rows, overlay, animate = true }: { rows: AxisRow[]; overlay?: Overlay; animate?: boolean }) {
  const byAxis = new Map(rows.map(r => [r.axis, r]))
  const other = overlay ? new Map(overlay.rows.map(r => [r.axis, r])) : null
  const pair = overlay?.clear
  const clearFor = (ax: AxisId) => {
    const k = rows.findIndex(r => r.axis === ax)
    return pair ? { I: pair.I[k] ?? false, N: pair.N[k] ?? false } : undefined
  }
  return (
    <div className={`${css.chart} ${animate ? css.animate : ''}`}>
      <div className={css.legend} aria-hidden>
        <span>
          <span className="glyph-ideal" /> Ideal
        </span>
        <span>
          <span className="glyph-now" /> Here and now
        </span>
        {rows.some(r => r.q !== null) && (
          <span>
            <span className={css.legendQ} /> Your country now
          </span>
        )}
        {overlay && (
          <span>
            <span className={css.legendOther} /> {overlay.label}
          </span>
        )}
        <span>
          <svg className={css.legendLink} viewBox="0 0 26 10" aria-hidden>
            {pair ? (
              <line x1="1" y1="5" x2="25" y2="5" className={css.linkNotable} />
            ) : (
              <>
                <line x1="1" y1="5" x2="17" y2="5" className={css.linkNotable} />
                <path d="M17 1 L25 5 L17 9 Z" className={css.legendArrow} />
              </>
            )}
          </svg>{' '}
          {pair ? 'Clearly different' : 'Gap bigger than noise'}
        </span>
        <span>
          <svg className={css.legendLink} viewBox="0 0 26 10" aria-hidden>
            <line x1="1" y1="5" x2="25" y2="5" className={css.linkQuiet} />
          </svg>{' '}
          Within noise
        </span>
        <span className="muted">Bars show ±1 standard error</span>
      </div>
      {(Object.keys(GROUPS) as GroupId[]).map(g => (
        <section key={g} className={css.group} aria-label={GROUP_TITLES[g]}>
          <h3 className={css.groupTitle}>{GROUP_TITLES[g]}</h3>
          {GROUPS[g].map(ax => (
            <Row key={ax} axis={ax} row={byAxis.get(ax)!} other={other?.get(ax)} clear={clearFor(ax)} />
          ))}
        </section>
      ))}
      <table className="visually-hidden">
        <caption>Your scores on each axis, from −100 to +100</caption>
        <thead>
          <tr>
            <th>Axis</th>
            <th>Ideal</th>
            <th>Here and now</th>
            <th>Notable gap</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.axis}>
              <th>
                {AXES[r.axis].title} ({AXES[r.axis].neg} − / {AXES[r.axis].pos} +)
              </th>
              <td>{r.I ?? 'not enough answers'}</td>
              <td>{r.N ?? 'not enough answers'}</td>
              <td>{r.notable ? 'yes' : 'no'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Row({ axis, row, other, clear }: { axis: AxisId; row: AxisRow; other?: AxisRow; clear?: { I: boolean; N: boolean } }) {
  const meta = AXES[axis]
  const both = row.I !== null && row.N !== null
  // Direction comes from the paired gap G, which can differ in sign from N − I (they average different items).
  const dir = !clear && both && row.notable && row.G !== null ? Math.sign(row.G) : 0
  const pairLine = (f: 'I' | 'N', y: number) => {
    const a = row[f]
    const b = other?.[f]
    if (a === null || b === null || b === undefined) return null
    return (
      <line x1={a + 100} y1={y} x2={b + 100} y2={y} className={clear![f] ? css.linkNotable : css.linkQuiet} vectorEffect="non-scaling-stroke" />
    )
  }
  return (
    <div className={css.row} aria-hidden>
      <div className={css.label}>
        <span className={css.title}>{meta.title}</span>
        {row.I === null && row.N === null && <span className="small muted">Not enough answers</span>}
      </div>
      <div className={css.poles}>
        <span>{meta.neg}</span>
        <span>{meta.pos}</span>
      </div>
      <div className={css.track}>
        <span className={css.centre} />
        {row.q !== null && <span className={css.q} style={{ left: pct(row.q) }} />}
        {clear && (
          <svg className={css.link} viewBox="0 0 200 40" preserveAspectRatio="none">
            {pairLine('I', 10)}
            {pairLine('N', 30)}
          </svg>
        )}
        {!clear && both && (
          <svg className={css.link} viewBox="0 0 200 40" preserveAspectRatio="none">
            <line
              x1={row.I! + 100}
              y1={10}
              x2={row.N! + 100}
              y2={30}
              className={row.notable ? css.linkNotable : css.linkQuiet}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}
        <Lane v={row.I} se={row.seI} kind="I" />
        <Lane v={row.N} se={row.seN} kind="N" arrow={dir} />
        {other && (
          <>
            <Lane v={other.I} se={null} kind="I" ghost />
            <Lane v={other.N} se={null} kind="N" ghost />
          </>
        )}
      </div>
    </div>
  )
}

function Lane({ v, se, kind, arrow = 0, ghost = false }: { v: number | null; se: number | null; kind: 'I' | 'N'; arrow?: number; ghost?: boolean }) {
  if (v === null) return null
  const top = kind === 'I' ? '25%' : '75%'
  return (
    <>
      {se !== null && se > 0 && (
        <span
          className={`${css.whisker} ${kind === 'I' ? css.wI : css.wN}`}
          style={{ top, left: pct(Math.max(-100, v - se)), width: `${(Math.min(100, v + se) - Math.max(-100, v - se)) / 2}%` }}
        />
      )}
      <span
        className={`${css.marker} ${kind === 'I' ? css.mI : css.mN} ${ghost ? css.ghost : ''}`}
        style={{ top, left: pct(v), ['--from' as string]: '50%' }}
      />
      {arrow !== 0 && <span className={`${css.arrow} ${arrow > 0 ? css.arrowR : css.arrowL}`} style={{ top, left: pct(v) }} />}
    </>
  )
}

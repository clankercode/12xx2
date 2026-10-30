import { GROUPS, type AxisId, type GroupId } from '../engine/types'
import type { AxisRow } from '../engine/results'
import { AXES, GROUP_TITLES } from '../data/axes'
import css from './AxisChart.module.css'

const pct = (v: number) => `${(v + 100) / 2}%`

export interface Overlay {
  label: string
  rows: AxisRow[]
}

/**
 * The 12×2 chart: per axis, an Ideal lane (◆) above a Here-and-now lane (●),
 * joined by a slanted link whose tilt is the gap. Whiskers are ±1 SE. Arrows
 * appear only on notable (noise-gated) gaps.
 */
export function AxisChart({ rows, overlay, animate = true }: { rows: AxisRow[]; overlay?: Overlay; animate?: boolean }) {
  const byAxis = new Map(rows.map(r => [r.axis, r]))
  const other = overlay ? new Map(overlay.rows.map(r => [r.axis, r])) : null
  return (
    <div className={`${css.chart} ${animate ? css.animate : ''}`}>
      <div className={css.legend} aria-hidden>
        <span>
          <span className="glyph-ideal" /> Ideal system
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
        <span className="muted">Bars show ±1 standard error</span>
      </div>
      {(Object.keys(GROUPS) as GroupId[]).map(g => (
        <section key={g} className={css.group} aria-label={GROUP_TITLES[g]}>
          <h3 className={css.groupTitle}>{GROUP_TITLES[g]}</h3>
          {GROUPS[g].map(ax => (
            <Row key={ax} axis={ax} row={byAxis.get(ax)!} other={other?.get(ax)} />
          ))}
        </section>
      ))}
      <table className="visually-hidden">
        <caption>Your scores on each axis, from −100 to +100</caption>
        <thead>
          <tr>
            <th>Axis</th>
            <th>Ideal system</th>
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

function Row({ axis, row, other }: { axis: AxisId; row: AxisRow; other?: AxisRow }) {
  const meta = AXES[axis]
  const both = row.I !== null && row.N !== null
  const dir = both && row.notable ? Math.sign(row.N! - row.I!) : 0
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
        {both && (
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

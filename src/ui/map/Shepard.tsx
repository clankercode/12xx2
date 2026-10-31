import { useMemo } from 'react'
import { useWidth } from './useWidth'
import css from './Map.module.css'

type Pair = { a: number; b: number; d: number; m: number }

/**
 * Shepard plot: every pair, true distance (x) against drawn distance (y). On the diagonal = drawn to
 * scale. Hover or tap a dot to find that pair on the map.
 */
export function Shepard({ pairs, hot, pair, onPair, loose }: { pairs: Pair[]; hot: number | null; pair: [number, number] | null; onPair: (p: [number, number] | null) => void; loose: number }) {
  const [ref, W] = useWidth<HTMLDivElement>(260)
  const H = Math.round(W * 0.78)
  const pl = 28
  const pb = 24
  const max = useMemo(() => Math.max(...pairs.map(p => Math.max(p.d, p.m))) * 1.02, [pairs])
  const sx = (W - pl - 8) / max
  const sy = (H - pb - 8) / max
  const X = (d: number) => pl + d * sx
  const Y = (m: number) => H - pb - m * sy
  const all = useMemo(() => pairs.map(p => `M${X(p.d).toFixed(1)},${Y(p.m).toFixed(1)}h2v2h-2z`).join(''), [pairs, W])
  const hotPath = hot === null ? '' : pairs.filter(p => p.a === hot || p.b === hot).map(p => `M${(X(p.d) - 0.5).toFixed(1)},${(Y(p.m) - 0.5).toFixed(1)}h3v3h-3z`).join('')
  const cur = pair && pairs.find(p => (p.a === pair[0] && p.b === pair[1]) || (p.a === pair[1] && p.b === pair[0]))
  const nearest = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    let best: Pair | null = null
    let bd = 9
    for (const p of pairs) {
      const d = Math.hypot(X(p.d) - x, Y(p.m) - y)
      if (d < bd) {
        bd = d
        best = p
      }
    }
    return best ? ([best.a, best.b] as [number, number]) : null
  }
  return (
    <div ref={ref} className={css.shep}>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className={css.svg}
        role="img"
        aria-label={`Shepard plot of ${pairs.length} pairs: true distance against distance as drawn`}
        onPointerMove={e => e.pointerType === 'mouse' && onPair(nearest(e))}
        onPointerUp={e => onPair(nearest(e))}
        onPointerLeave={e => e.pointerType === 'mouse' && onPair(null)}
      >
        <path d={`M${pl},6V${H - pb}H${W - 6}`} fill="none" stroke="var(--rule-major)" />
        <line x1={pl} y1={H - pb} x2={X(max)} y2={Y(max)} stroke="var(--muted)" strokeDasharray="3 3" />
        <line x1={X(loose)} y1={6} x2={X(loose)} y2={H - pb} stroke="var(--now)" strokeOpacity={0.55} />
        <path d={all} fill="var(--ideal)" fillOpacity={pairs.length > 2000 ? 0.18 : 0.3} />
        {hotPath && <path d={hotPath} fill="var(--now)" />}
        {cur && <circle cx={X(cur.d) + 1} cy={Y(cur.m) + 1} r={5} fill="none" stroke="var(--paper)" strokeWidth={1.5} />}
        <text x={pl + 4} y={H - 6} className={css.tick}>
          true distance →
        </text>
        <text x={12} y={H - pb - 4} className={css.tick} transform={`rotate(-90 12 ${H - pb - 4})`}>
          distance as drawn →
        </text>
      </svg>
      <p className="small muted" style={{ margin: '6px 0 0' }}>
        Every pair ({pairs.length}). On the dashed line = drawn to scale; above = drawn too far apart; below = too close. Amber line = the loose cut.
        Hover or tap a dot to find that pair.
      </p>
    </div>
  )
}

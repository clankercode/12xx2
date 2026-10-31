import { useMemo } from 'react'
import { famColor, textWidth } from './marks'
import { D, PTS, dir, seriation } from './model'
import { useWidth } from './useWidth'
import css from './Map.module.css'

/** Near = bright, far = dark: one hue (the ideal blue) mixed into the page ink. */
const near = (v: number) => `color-mix(in srgb, var(--ideal) ${Math.round(100 * (1 - Math.min(1, Math.max(0, (v - 0.05) / 0.35)) ** 0.8))}%, var(--ink))`
/** Diverging: ideal blue = the row sees the column as nearer than the column sees the row; amber = farther. */
const asym = (v: number) => {
  const t = Math.max(-1, Math.min(1, v / 0.06))
  return `color-mix(in srgb, ${t < 0 ? 'var(--ideal)' : 'var(--now)'} ${Math.round(Math.abs(t) * 100)}%, var(--rule-major))`
}

/**
 * Directed distance matrix: cell (row A, column B) = d(A→B), B scored against A with A's weights.
 * Upper triangle A→B, lower the mirror B→A. Rows ordered by average-linkage clustering.
 */
export function Matrix({ ids, mode, cell, onCell }: { ids: number[]; mode: 'dist' | 'asym'; cell: [number, number] | null; onCell: (c: [number, number] | null) => void }) {
  const [ref, W] = useWidth<HTMLDivElement>()
  const order = useMemo(() => seriation(ids), [ids])
  const n = order.length
  const labels = W >= 600
  const left = labels ? 190 : 12
  const size = Math.max(4, Math.floor(Math.min(W - left - 12, 760) / n))
  const H = 12 + n * size + 12
  const gap = size > 7 ? 1 : 0
  const hit = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const c = Math.floor((e.clientX - r.left - left) / size)
    const w = Math.floor((e.clientY - r.top - 12) / size)
    return c >= 0 && w >= 0 && c < n && w < n && c !== w ? ([order[w]!, order[c]!] as [number, number]) : null
  }
  const fit = (s: string) => {
    let t = s
    while (textWidth(t, 11) > left - 18 && t.length > 4) t = `${t.slice(0, -2)}…`
    return t
  }
  const rIdx = cell ? order.indexOf(cell[0]) : -1
  const cIdx = cell ? order.indexOf(cell[1]) : -1
  /** Arrow keys walk the cells (skipping the diagonal); Escape clears. The panel beside it reads the cell out. */
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') return onCell(null)
    const d = ({ ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] } as Record<string, [number, number]>)[e.key]
    if (!d) return
    e.preventDefault()
    const clamp = (v: number) => Math.max(0, Math.min(n - 1, v))
    let [r, c] = rIdx < 0 || cIdx < 0 ? [0, 1] : [clamp(rIdx + d[0]), clamp(cIdx + d[1])]
    if (r === c) [r, c] = [clamp(r + d[0]), clamp(c + d[1])]
    if (r !== c) onCell([order[r]!, order[c]!])
  }
  return (
    <div ref={ref} className={css.chartBox}>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className={`${css.svg} ${css.focusable}`}
        role="group"
        tabIndex={0}
        onKeyDown={onKey}
        aria-label={`${n} by ${n} matrix of directed distances between ideologies. Arrow keys move between cells; the panel beside it reads the cell out.`}
        onPointerMove={e => e.pointerType === 'mouse' && onCell(hit(e))}
        onPointerUp={e => onCell(hit(e))}
      >
        {order.map((a, r) =>
          order.map((b, c) =>
            r === c ? null : (
              <rect key={`${a}-${b}`} x={left + c * size} y={12 + r * size} width={size - gap} height={size - gap} fill={mode === 'asym' ? asym(dir(a, b) - dir(b, a)) : near(dir(a, b))} />
            ),
          ),
        )}
        {order.map((a, r) => (
          <g key={`f${a}`}>
            <rect x={left - 6} y={12 + r * size} width={4} height={size - gap} fill={famColor(PTS[a]!.a.family)} />
            {labels && (
              <text x={left - 10} y={12 + r * size + size * 0.78} textAnchor="end" className={css.tick} style={{ fontSize: Math.min(11, size - 2), fill: r === rIdx || r === cIdx ? 'var(--paper)' : 'var(--muted)' }}>
                {fit(PTS[a]!.a.name)}
              </text>
            )}
          </g>
        ))}
        {rIdx >= 0 && cIdx >= 0 && (
          <g fill="none" aria-hidden>
            <rect x={left} y={12 + rIdx * size} width={n * size} height={size} fill="var(--paper)" fillOpacity={0.12} />
            <rect x={left + cIdx * size} y={12} width={size} height={n * size} fill="var(--paper)" fillOpacity={0.12} />
            <rect x={left + cIdx * size - 0.5} y={12 + rIdx * size - 0.5} width={size} height={size} stroke="var(--paper)" strokeWidth={1.5} />
            <rect x={left + rIdx * size - 0.5} y={12 + cIdx * size - 0.5} width={size} height={size} stroke="var(--now)" strokeWidth={1.5} />
          </g>
        )}
      </svg>
    </div>
  )
}

/** The most asymmetric pairs among ids (largest |d(A→B) − d(B→A)|). */
export function mostAsymmetric(ids: number[], k = 4): [number, number][] {
  const out: { a: number; b: number; v: number }[] = []
  for (const a of ids) for (const b of ids) if (a < b) out.push({ a, b, v: Math.abs(dir(a, b) - dir(b, a)) })
  return out.sort((x, y) => y.v - x.v).slice(0, k).map(x => [x.a, x.b])
}

export { D }

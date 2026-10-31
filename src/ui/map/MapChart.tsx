import { useRef } from 'react'
import { AXES } from '../../data/axes'
import type { Space } from '../../engine/mapLayout'
import type { AxisId } from '../../engine/types'
import { Mark, famColor, placeLabels, textWidth, type Rect } from './marks'
import { D, PTS, nameOf, type Scene } from './model'
import { useWidth } from './useWidth'
import css from './Map.module.css'

export type Sel = number | 'youI' | 'youN' | null

/** Well-known reference points, labelled when there is room. */
const ANCHORS = new Set([
  'marxism-leninism', 'social-democracy', 'neoliberalism', 'centrism', 'fascism', 'anarcho-capitalism', 'anarcho-communism',
  'theocratic-absolutism', 'classical-liberalism', 'green-politics', 'traditional-conservatism', 'technocracy',
  'absolute-monarchism', 'transhumanism', 'christian-democracy', 'right-populism', 'anarcho-primitivism', 'neoreaction',
])

export interface ChartProps {
  kind: '2d' | '3d' | 'slice'
  space: Space
  sc: Scene
  /** Points whose union fixes the scale (all frames of this dimension), so switching frames keeps the scale. */
  frameCoords: readonly (readonly number[])[]
  you: { I?: number[]; N?: number[] }
  sel: Sel
  hover: Sel
  onSelect: (s: Sel) => void
  onHover: (s: Sel) => void
  overlay: 'none' | 'bands' | 'halo'
  local?: ReadonlyMap<number, number>
  focus: ReadonlySet<string>
  pair: [number, number] | null
  neighbourIds: { g: number; d: number }[]
  loose: number
  yaw?: number
  pitch?: number
  onRotate?: (yaw: number, pitch: number) => void
  axes?: [AxisId, AxisId]
  ariaLabel: string
}

export function MapChart(p: ChartProps) {
  const [ref, W] = useWidth<HTMLDivElement>()
  const H = W < 600 ? Math.round(W * 1.08) : Math.round(Math.min(Math.max(W * 0.7, 380), 640))
  const pad = W < 480 ? 24 : 40
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number; moved: number; captured: boolean } | null>(null)
  const { sc, kind, space } = p

  // Projection to screen: [x, y, depth −1…1].
  let proj: (c: readonly number[]) => [number, number, number]
  let unitPx: number
  if (kind === 'slice') {
    const s = Math.min(W - 2 * pad - (W > 700 ? 160 : 0), H - 2 * pad) / 200
    unitPx = s
    proj = c => [W / 2 + c[0]! * s, H / 2 - c[1]! * s, 0]
  } else if (kind === '2d') {
    const all = [...p.frameCoords, ...[p.you.I, p.you.N].filter((c): c is number[] => !!c)]
    const xs = all.map(c => c[0]!)
    const ys = all.map(c => c[1]!)
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
    const s = Math.min((W - 2 * pad) / (x1 - x0), (H - 2 * pad - 16) / (y1 - y0))
    unitPx = s
    proj = c => [W / 2 + (c[0]! - (x0 + x1) / 2) * s, H / 2 + 8 - (c[1]! - (y0 + y1) / 2) * s, 0]
  } else {
    const all = [...p.frameCoords, ...[p.you.I, p.you.N].filter((c): c is number[] => !!c)]
    const ctr = [0, 1, 2].map(k => all.reduce((t, c) => t + c[k]!, 0) / all.length)
    const rad = Math.max(...all.map(c => Math.hypot(c[0]! - ctr[0]!, c[1]! - ctr[1]!, c[2]! - ctr[2]!)))
    const s = (Math.min(W, H) / 2 - pad + 6) / rad
    unitPx = s
    const cy = Math.cos(p.yaw ?? 0)
    const sy = Math.sin(p.yaw ?? 0)
    const cp = Math.cos(p.pitch ?? 0)
    const sp = Math.sin(p.pitch ?? 0)
    proj = c => {
      const x = c[0]! - ctr[0]!
      const y = c[1]! - ctr[1]!
      const z = c[2]! - ctr[2]!
      const x1 = cy * x + sy * z
      const z1 = -sy * x + cy * z
      return [W / 2 + x1 * s, H / 2 - (cp * y - sp * z1) * s, (sp * y + cp * z1) / rad]
    }
  }

  const pts = sc.ids.map(g => {
    const [x, y, z] = proj(sc.pos.get(g)!)
    return { g, x, y, z }
  })
  const byG = new Map(pts.map(q => [q.g, q]))
  const youI = p.you.I ? proj(p.you.I) : null
  const youN = p.you.N ? proj(p.you.N) : null
  const at = (s: Sel) => (s === 'youI' ? youI && { x: youI[0], y: youI[1] } : s === 'youN' ? youN && { x: youN[0], y: youN[1] } : s === null ? null : byG.get(s) ?? null)
  const active = p.sel ?? p.hover
  const src = at(active)
  const dimmed = (g: number) => p.focus.size > 0 && !p.focus.has(PTS[g]!.a.family)
  const nbSet = new Set(p.neighbourIds.map(n => n.g))

  // Labels: the active point and its neighbours always; you; then anchors where there is room.
  const wanted: Parameters<typeof placeLabels>[0] = []
  if (src && active !== null) wanted.push({ key: 'act', text: typeof active === 'number' ? nameOf(active, space) : active === 'youI' ? 'You (ideal)' : 'You (here and now)', x: src.x, y: src.y, px: 13, force: true })
  p.neighbourIds.forEach((n, k) => {
    const q = byG.get(n.g)
    if (q) wanted.push({ key: `n${n.g}`, text: `${k + 1}. ${nameOf(n.g, space)} · ${n.d.toFixed(3)}`, x: q.x, y: q.y, px: 12, force: true })
  })
  if (p.pair) for (const g of p.pair) { const q = byG.get(g); if (q) wanted.push({ key: `p${g}`, text: nameOf(g, space), x: q.x, y: q.y, px: 12, force: true }) }
  if (youI && active !== 'youI') wanted.push({ key: 'yI', text: 'You (ideal)', x: youI[0], y: youI[1], px: 12, force: false })
  if (youN && active !== 'youN') wanted.push({ key: 'yN', text: 'You (here and now)', x: youN[0], y: youN[1], px: 12, force: false })
  for (const q of [...pts].sort((a, b) => b.z - a.z)) {
    const pt = PTS[q.g]!
    if (!ANCHORS.has(pt.a.slug) || (space === 'joint' && pt.frame === 'now') || q.g === active || nbSet.has(q.g) || p.pair?.includes(q.g) || dimmed(q.g) || q.z < -0.35) continue
    wanted.push({ key: `a${q.g}`, text: nameOf(q.g, space), x: q.x, y: q.y, px: 11.5, force: false })
  }
  const dotsForLabels = [...pts, ...(youI ? [{ x: youI[0], y: youI[1] }] : []), ...(youN ? [{ x: youN[0], y: youN[1] }] : [])]
  const labels = placeLabels(wanted, dotsForLabels, W, H, kind === 'slice' && p.axes ? slicePoleRects(proj, W, H, p.axes) : [])

  const onDown = (e: React.PointerEvent) => {
    if (kind !== '3d') return
    // No pointer capture yet: a press that doesn't move must still reach the dot under it as a click.
    drag.current = { x: e.clientX, y: e.clientY, yaw: p.yaw ?? 0, pitch: p.pitch ?? 0, moved: 0, captured: false }
  }
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || kind !== '3d') return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    d.moved = Math.max(d.moved, Math.hypot(dx, dy))
    if (d.moved > 4 && !d.captured) {
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
      d.captured = true
    }
    if (d.moved > 4) p.onRotate?.(d.yaw + dx * 0.01, Math.max(-1.5, Math.min(1.5, d.pitch + dy * 0.01)))
  }
  const dragged = () => (drag.current?.moved ?? 0) > 4
  const onUp = () => {
    setTimeout(() => (drag.current = null), 0)
  }

  const order = [...pts].sort((a, b) => a.z - b.z)
  const arrow = youI && youN && Math.hypot(youN[0] - youI[0], youN[1] - youI[1]) > 18
  return (
    <div ref={ref} className={css.chartBox}>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="group"
        aria-label={p.ariaLabel}
        className={`${css.svg} ${kind === '3d' ? css.rotate : ''} ${kind === '2d' ? css.tween : ''}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onClick={e => {
          if (e.target === e.currentTarget && !dragged()) p.onSelect(null)
        }}
      >
        {kind === 'slice' && p.axes && <SliceGrid proj={proj} W={W} H={H} axes={p.axes} />}
        {kind === '3d' && <Guides proj={proj} frame={p.frameCoords} />}
        {kind === '2d' && youI && (
          <circle cx={youI[0]} cy={youI[1]} r={p.loose * unitPx} className={css.ringLoose} aria-hidden />
        )}
        {p.overlay === 'halo' && p.local &&
          pts.map(q => (dimmed(q.g) ? null : <circle key={`h${q.g}`} cx={q.x} cy={q.y} r={5 + p.local!.get(q.g)! * 70} className={css.halo} style={{ opacity: 0.12 + Math.min(p.local!.get(q.g)!, 0.6) * 0.5 }} aria-hidden />))}
        {space === 'joint' &&
          PTS.slice(0, PTS.length / 2).map(pt => {
            const a = byG.get(pt.g)
            const b = byG.get(pt.g + PTS.length / 2)
            return a && b ? <line key={`j${pt.g}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={famColor(pt.a.family)} strokeOpacity={dimmed(pt.g) ? 0.06 : 0.3} aria-hidden /> : null
          })}
        {p.overlay === 'bands' && typeof active === 'number' && src &&
          sc.ids.map(h => {
            if (h === active) return null
            const d = D(active, h)
            const e = (sc.mapDist(active, h) - d) / d
            const q = byG.get(h)!
            return <line key={`b${h}`} x1={src.x} y1={src.y} x2={q.x} y2={q.y} stroke={e > 0 ? 'var(--alert)' : 'var(--ideal)'} strokeOpacity={Math.min(0.9, Math.abs(e) * 1.4)} strokeWidth={1 + Math.min(Math.abs(e), 1) * 2} aria-hidden />
          })}
        {order.map(q => {
          const pt = PTS[q.g]!
          const zc = kind === '3d' ? (q.z + 1) / 2 : 1
          const r = kind === '3d' ? 3 + 4 * zc : W < 500 ? 4.5 : 5.5
          let op = kind === '3d' ? 0.35 + 0.65 * zc : 1
          if (dimmed(q.g)) op *= 0.18
          if (active !== null && active !== q.g && !nbSet.has(q.g) && p.overlay !== 'bands') op *= 0.6
          const key = space === 'joint' && pt.frame === 'now' ? `${pt.i}n` : `${pt.i}`
          return (
            <g
              key={key}
              className={css.dot}
              style={{ transform: `translate(${q.x}px, ${q.y}px)`, opacity: op }}
              onMouseEnter={() => p.onHover(q.g)}
              onMouseLeave={() => p.onHover(null)}
              onClick={e => {
                e.stopPropagation()
                if (!dragged()) p.onSelect(p.sel === q.g ? null : q.g)
              }}
            >
              <circle r={12} fill="transparent" />
              <Mark fam={pt.a.family} r={r} hollow={space === 'joint' && pt.frame === 'now'} />
              <title>{nameOf(q.g, space)}</title>
            </g>
          )
        })}
        {arrow && <Arrow from={youI!} to={youN!} />}
        {youN && <You x={youN[0]} y={youN[1]} tone="now" onClick={() => p.onSelect('youN')} onHover={h => p.onHover(h ? 'youN' : null)} />}
        {youI && <You x={youI[0]} y={youI[1]} tone="ideal" onClick={() => p.onSelect('youI')} onHover={h => p.onHover(h ? 'youI' : null)} />}
        {p.pair && byG.get(p.pair[0]) && byG.get(p.pair[1]) && (
          <g aria-hidden>
            <line x1={byG.get(p.pair[0])!.x} y1={byG.get(p.pair[0])!.y} x2={byG.get(p.pair[1])!.x} y2={byG.get(p.pair[1])!.y} stroke="var(--now)" strokeWidth={2.5} />
            {p.pair.map(g => <circle key={g} cx={byG.get(g)!.x} cy={byG.get(g)!.y} r={10} fill="none" stroke="var(--now)" strokeWidth={2} />)}
          </g>
        )}
        {src && (
          <g aria-hidden>
            {p.neighbourIds.map((n, k) => {
              const q = byG.get(n.g)
              return q ? (
                <g key={`l${n.g}`}>
                  <line x1={src.x} y1={src.y} x2={q.x} y2={q.y} stroke="var(--paper)" strokeOpacity={0.9 - k * 0.2} strokeWidth={1.6 - k * 0.3} strokeDasharray={k ? '5 4' : undefined} />
                  <circle cx={q.x} cy={q.y} r={9} fill="none" stroke="var(--paper)" strokeWidth={1.5} />
                </g>
              ) : null
            })}
            <circle cx={src.x} cy={src.y} r={11} fill="none" stroke="var(--paper)" strokeWidth={2} />
          </g>
        )}
        {labels.map(l => (
          <text key={l.key} x={l.x} y={l.y} className={l.key.startsWith('a') ? css.labelMuted : l.key === 'yI' ? css.labelIdeal : l.key === 'yN' ? css.labelNow : css.label} aria-hidden>
            {l.text}
          </text>
        ))}
      </svg>
    </div>
  )
}

function You({ x, y, tone, onClick, onHover }: { x: number; y: number; tone: 'ideal' | 'now'; onClick: () => void; onHover: (on: boolean) => void }) {
  const c = tone === 'ideal' ? 'var(--ideal)' : 'var(--now)'
  return (
    <g
      className={css.dot}
      style={{ transform: `translate(${x}px, ${y}px)` }}
      onClick={e => {
        e.stopPropagation()
        onClick()
      }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <title>{tone === 'ideal' ? 'You (ideal)' : 'You (here and now)'}</title>
      <circle r={10} fill="var(--ink)" stroke={c} strokeWidth={2.5} />
      <circle r={4.5} fill={c} />
    </g>
  )
}

function Arrow({ from, to }: { from: readonly number[]; to: readonly number[] }) {
  const a = Math.atan2(to[1]! - from[1]!, to[0]! - from[0]!)
  const ex = to[0]! - Math.cos(a) * 12
  const ey = to[1]! - Math.sin(a) * 12
  return (
    <g stroke="var(--paper)" strokeWidth={1.6} strokeOpacity={0.85} aria-hidden>
      <line x1={from[0]! + Math.cos(a) * 11} y1={from[1]! + Math.sin(a) * 11} x2={ex} y2={ey} />
      <path d={`M${ex - 8 * Math.cos(a - 0.45)},${ey - 8 * Math.sin(a - 0.45)}L${ex},${ey}L${ex - 8 * Math.cos(a + 0.45)},${ey - 8 * Math.sin(a + 0.45)}`} fill="none" />
    </g>
  )
}

/** Where the slice's pole captions sit (kept free of dot labels). */
function slicePoleRects(proj: (c: readonly number[]) => [number, number, number], W: number, H: number, [ax, ay]: [AxisId, AxisId]): Rect[] {
  const tl = proj([-100, 100])
  const br = proj([100, -100])
  const w = (s: string) => textWidth(s, 12) + 6
  if (tl[0] > 110) {
    const up = w('↑ ' + AXES[ay].pos)
    const dn = w('↓ ' + AXES[ay].neg)
    const lf = w('← ' + AXES[ax].neg)
    return [
      [tl[0] - 8 - up, tl[1] - 4, up, 18],
      [tl[0] - 8 - dn, br[1] - 14, dn, 18],
      [tl[0] - 8 - lf, H / 2 - 10, lf, 18],
      [br[0] + 6, H / 2 - 10, w(AXES[ax].pos + ' →'), 18],
    ]
  }
  return [
    [0, tl[1] - 22, W, 18],
    [0, br[1] + 4, W, 18],
  ]
}

function SliceGrid({ proj, W, H, axes }: { proj: (c: readonly number[]) => [number, number, number]; W: number; H: number; axes: [AxisId, AxisId] }) {
  const [ax, ay] = axes
  const tl = proj([-100, 100])
  const br = proj([100, -100])
  const side = tl[0] > 110
  return (
    <g aria-hidden>
      {[-100, -50, 0, 50, 100].map(v => {
        const a = proj([v, -100])
        const b = proj([v, 100])
        const c = proj([-100, v])
        const d = proj([100, v])
        const st = v === 0 ? 'var(--rule-major)' : 'var(--rule)'
        return (
          <g key={v} stroke={st}>
            <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
            <line x1={c[0]} y1={c[1]} x2={d[0]} y2={d[1]} />
          </g>
        )
      })}
      {side ? (
        <>
          <text x={tl[0] - 8} y={tl[1] + 10} textAnchor="end" className={css.pole}>↑ {AXES[ay].pos}</text>
          <text x={tl[0] - 8} y={br[1]} textAnchor="end" className={css.pole}>↓ {AXES[ay].neg}</text>
          <text x={tl[0] - 8} y={H / 2 + 4} textAnchor="end" className={css.pole}>← {AXES[ax].neg}</text>
          <text x={br[0] + 8} y={H / 2 + 4} className={css.pole}>{AXES[ax].pos} →</text>
        </>
      ) : (
        <>
          <text x={W / 2} y={tl[1] - 8} textAnchor="middle" className={css.pole}>↑ {AXES[ay].pos}</text>
          <text x={W / 2} y={br[1] + 18} textAnchor="middle" className={css.pole}>↓ {AXES[ay].neg}</text>
          <text x={tl[0]} y={br[1] + 18} className={css.pole}>← {AXES[ax].neg}</text>
          <text x={br[0]} y={br[1] + 18} textAnchor="end" className={css.pole}>{AXES[ax].pos} →</text>
        </>
      )}
    </g>
  )
}

function Guides({ proj, frame }: { proj: (c: readonly number[]) => [number, number, number]; frame: readonly (readonly number[])[] }) {
  const ctr = [0, 1, 2].map(k => frame.reduce((t, c) => t + c[k]!, 0) / frame.length)
  const rad = Math.max(...frame.map(c => Math.hypot(c[0]! - ctr[0]!, c[1]! - ctr[1]!, c[2]! - ctr[2]!))) * 0.62
  const corners = [-1, 1].flatMap(a => [-1, 1].flatMap(b => [-1, 1].map(c => [a, b, c]))).map(v => v.map((x, k) => ctr[k]! + x * rad))
  const edges: [number, number][] = []
  for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) if (corners[i]!.filter((x, k) => x !== corners[j]![k]).length === 1) edges.push([i, j])
  return (
    <g stroke="var(--rule-major)" aria-hidden>
      {edges.map(([i, j]) => {
        const a = proj(corners[i]!)
        const b = proj(corners[j]!)
        return <line key={`${i}-${j}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
      })}
    </g>
  )
}

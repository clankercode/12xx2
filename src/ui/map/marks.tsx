/** Ideology families on the map: a colour token and a shape each, so colour is never the only cue. */

export type Shape = 'circle' | 'square' | 'diamond' | 'up' | 'down' | 'pentagon' | 'hexagon' | 'star' | 'plus'

export const FAMILIES: { id: string; name: string; shape: Shape }[] = [
  { id: 'socialist', name: 'Socialist', shape: 'circle' },
  { id: 'left-liberal', name: 'Left-liberal', shape: 'square' },
  { id: 'liberal-centrist', name: 'Liberal and centrist', shape: 'diamond' },
  { id: 'conservative', name: 'Conservative', shape: 'up' },
  { id: 'religious', name: 'Religious', shape: 'down' },
  { id: 'nationalist-populist', name: 'Nationalist and populist', shape: 'pentagon' },
  { id: 'libertarian-market', name: 'Libertarian and market', shape: 'hexagon' },
  { id: 'anarchist', name: 'Anarchist', shape: 'star' },
  { id: 'hierarchical', name: 'Hierarchical', shape: 'plus' },
]

const BY_ID = new Map(FAMILIES.map(f => [f.id, f]))
export const family = (id: string) => BY_ID.get(id) ?? { id, name: id, shape: 'circle' as Shape }
export const famColor = (id: string) => `var(--fam-${id}, var(--muted))`

const poly = (n: number, r: number, rot: number) =>
  Array.from({ length: n }, (_, k) => {
    const a = rot + (2 * Math.PI * k) / n
    return `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`
  })

/** SVG path for a shape of radius r centred on the origin (roughly equal visual weight). */
export function shapePath(shape: Shape, r: number): string {
  switch (shape) {
    case 'circle':
      return `M${-r},0a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0Z`
    case 'square': {
      const s = r * 0.86
      return `M${-s},${-s}H${s}V${s}H${-s}Z`
    }
    case 'diamond':
      return `M0,${-r * 1.2}L${r * 1.05},0L0,${r * 1.2}L${-r * 1.05},0Z`
    case 'up':
      return `M${poly(3, r * 1.25, -Math.PI / 2).join('L')}Z`
    case 'down':
      return `M${poly(3, r * 1.25, Math.PI / 2).join('L')}Z`
    case 'pentagon':
      return `M${poly(5, r * 1.1, -Math.PI / 2).join('L')}Z`
    case 'hexagon':
      return `M${poly(6, r * 1.08, 0).join('L')}Z`
    case 'star': {
      const pts = Array.from({ length: 10 }, (_, k) => {
        const rr = k % 2 ? r * 0.55 : r * 1.3
        const a = -Math.PI / 2 + (Math.PI * k) / 5
        return `${(rr * Math.cos(a)).toFixed(2)},${(rr * Math.sin(a)).toFixed(2)}`
      })
      return `M${pts.join('L')}Z`
    }
    case 'plus': {
      const a = r * 1.1
      const b = r * 0.4
      return `M${-b},${-a}H${b}V${-b}H${a}V${b}H${b}V${a}H${-b}V${b}H${-a}V${-b}H${-b}Z`
    }
  }
}

/** A family mark: filled, or hollow (ruled out / here-and-now position). */
export function Mark({ fam, r, hollow, className }: { fam: string; r: number; hollow?: boolean; className?: string }) {
  const c = famColor(fam)
  return (
    <path
      d={shapePath(family(fam).shape, r)}
      className={className}
      fill={hollow ? 'var(--ink)' : c}
      stroke={hollow ? c : 'var(--ink)'}
      strokeWidth={hollow ? 2 : 1.25}
    />
  )
}

/** Legend swatch for HTML: a tiny inline SVG of the family's mark. */
export function Swatch({ fam, hollow }: { fam: string; hollow?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden style={{ verticalAlign: '-2px', flex: 'none' }}>
      <Mark fam={fam} r={4.5} hollow={hollow} />
    </svg>
  )
}

/** Approximate rendered width of a label (no layout pass): Atkinson Hyperlegible averages ~0.56em. */
export const textWidth = (s: string, px: number) => s.length * px * 0.56

export type Rect = [number, number, number, number]

/**
 * Greedy label placement: tries spots around each anchor, avoiding placed labels and dots.
 * Forced labels always land (best spot); optional ones only on a clean spot.
 */
export function placeLabels(
  wanted: { key: string; text: string; x: number; y: number; px: number; force: boolean }[],
  dots: { x: number; y: number }[],
  W: number,
  H: number,
  /** Areas already taken (e.g. axis captions). */
  taken: readonly Rect[] = [],
): { key: string; text: string; x: number; y: number; px: number; anchor: 'start' }[] {
  const placed: Rect[] = [...taken]
  const out: { key: string; text: string; x: number; y: number; px: number; anchor: 'start' }[] = []
  for (const l of wanted) {
    const w = textWidth(l.text, l.px)
    const cands: [number, number][] = [[9, 4], [-9 - w, 4], [9, -9], [9, 17], [-9 - w, -9], [-9 - w, 17], [-w / 2, -12], [-w / 2, 22]]
    let best: { x: number; y: number; r: Rect } | null = null
    let bestS = Infinity
    for (const [dx, dy] of cands) {
      const tx = Math.max(4, Math.min(W - 4 - w, l.x + dx))
      const ty = Math.max(l.px + 2, Math.min(H - 4, l.y + dy))
      const r: Rect = [tx - 2, ty - l.px, w + 4, l.px + 4]
      let s = 0
      for (const q of placed) {
        const ox = Math.min(r[0] + r[2], q[0] + q[2]) - Math.max(r[0], q[0])
        const oy = Math.min(r[1] + r[3], q[1] + q[3]) - Math.max(r[1], q[1])
        if (ox > 0 && oy > 0) s += ox * oy
      }
      for (const p of dots) if (p.x > r[0] - 3 && p.x < r[0] + r[2] + 3 && p.y > r[1] - 3 && p.y < r[1] + r[3] + 3 && Math.hypot(p.x - l.x, p.y - l.y) > 2) s += 40
      if (Math.abs(tx - (l.x + dx)) > 1) s += 5
      if (s < bestS) {
        bestS = s
        best = { x: tx, y: ty, r }
      }
      if (s === 0) break
    }
    if (!best || (!l.force && bestS > 0)) continue
    placed.push(best.r)
    out.push({ key: l.key, text: l.text, x: best.x, y: best.y, px: l.px, anchor: 'start' })
  }
  return out
}

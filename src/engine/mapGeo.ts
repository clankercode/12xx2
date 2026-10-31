import { distance, type Archetype, type Vec } from './match'

/**
 * Runtime geometry for the ideology map. Pure, no DOM. Layout coordinates are in quiz-distance
 * units (0…1), so a cut such as "loose" can be drawn as a radius.
 */

export type XY = readonly [number, number]

/** The quiz's own distance from a respondent to each ideology's ideal, with that ideology's weights. */
export function respondentRadii(u: Vec, cat: readonly Archetype[], which: 'ideal' | 'now' = 'ideal'): number[] {
  return cat.map(a => distance(u, a[which], a.weight))
}

/**
 * Out-of-sample placement: the point x minimising Σ(‖x − yᵢ‖ − δᵢ)² against fixed layout points yᵢ
 * and target distances δᵢ (stress majorisation for one point), from the nearest few targets as
 * starts. `resid` is the placement's stress-1.
 */
export function placeOutOfSample(
  targets: readonly number[],
  Y: readonly (readonly number[])[],
  opts: { starts?: number; iters?: number; from?: readonly number[] } = {},
): { x: number[]; resid: number } {
  const n = Y.length
  const dim = Y[0]!.length
  const { starts = 5, iters = 400 } = opts
  const order = targets.map((_, i) => i).sort((a, b) => targets[a]! - targets[b]!)
  const inits = opts.from ? [[...opts.from]] : order.slice(0, starts).map(s => Y[s]!.map((v, k) => v + 0.01 * (k + 1)))
  const sse = (x: readonly number[]) => {
    let s = 0
    for (let i = 0; i < n; i++) s += (dist(x, Y[i]!) - targets[i]!) ** 2
    return s
  }
  let best = inits[0]!
  let bestS = Infinity
  for (let x of inits) {
    for (let it = 0; it < iters; it++) {
      const nx = new Array<number>(dim).fill(0)
      for (let i = 0; i < n; i++) {
        const d = dist(x, Y[i]!) || 1e-9
        for (let k = 0; k < dim; k++) nx[k]! += (Y[i]![k]! + (targets[i]! * (x[k]! - Y[i]![k]!)) / d) / n
      }
      const moved = dist(nx, x)
      x = nx
      if (moved < 1e-8) break
    }
    const s = sse(x)
    if (s < bestS) {
      bestS = s
      best = x
    }
  }
  const den = targets.reduce((s, d) => s + d * d, 0)
  return { x: best, resid: den ? Math.sqrt(bestS / den) : 0 }
}

/**
 * "Exact from here": each point at its true distance r from the focus, in the direction the 2D
 * layout puts it. Only the distances to the centre are exact.
 */
export function egoPosition(focus: XY, at: XY, r: number): [number, number] {
  const a = Math.atan2(at[1] - focus[1], at[0] - focus[0])
  return [r * Math.cos(a), r * Math.sin(a)]
}

export function dist(a: readonly number[], b: readonly number[]): number {
  let s = 0
  for (let k = 0; k < a.length; k++) s += (a[k]! - b[k]!) ** 2
  return Math.sqrt(s)
}

/** Kruskal stress-1 of a configuration against true distances, plus the 3-nearest-neighbour keep rate. */
export function fitStats(X: readonly (readonly number[])[], D: (i: number, j: number) => number): { stress: number; knn3: number } {
  const n = X.length
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const d = D(i, j)
      num += (d - dist(X[i]!, X[j]!)) ** 2
      den += d * d
    }
  let keep = 0
  for (let i = 0; i < n; i++) {
    const others = Array.from({ length: n }, (_, j) => j).filter(j => j !== i)
    const t = [...others].sort((a, b) => D(i, a) - D(i, b)).slice(0, 3)
    const m = [...others].sort((a, b) => dist(X[i]!, X[a]!) - dist(X[i]!, X[b]!)).slice(0, 3)
    keep += t.filter(j => m.includes(j)).length / 3
  }
  return { stress: den ? Math.sqrt(num / den) : 0, knn3: n ? keep / n : 0 }
}

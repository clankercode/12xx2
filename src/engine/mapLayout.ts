import { distance, type Archetype } from './match'
import { mulberry32 } from './prng'
import { AXIS_IDS } from './types'

/**
 * Build-time maths for the ideology map (scripts/map-layout.ts writes src/data/map.json).
 *
 * Points: the 48 ideal positions, then the 48 here-and-now positions. The quiz's distance is
 * asymmetric (it uses the target's weights), so a layout uses the mean of both directions.
 * Layouts: classical MDS, refined by SMACOF (metric stress majorisation), best of several starts.
 */

/** Bump when the layout algorithm changes, so map.json is regenerated even if the catalogue isn't. */
export const LAYOUT_VERSION = 1

export type Space = 'ideal' | 'now' | 'joint'
export const SPACES: readonly Space[] = ['ideal', 'now', 'joint']

export interface MapPoint {
  /** Index into the catalogue. */
  i: number
  frame: 'ideal' | 'now'
  v: readonly number[]
  w: readonly number[]
}

export function mapPoints(cat: readonly Archetype[]): MapPoint[] {
  return [
    ...cat.map((a, i) => ({ i, frame: 'ideal' as const, v: a.ideal, w: a.weight })),
    ...cat.map((a, i) => ({ i, frame: 'now' as const, v: a.now, w: a.weight })),
  ]
}

/** Point indices (into mapPoints) for each space. */
export function spaceIndex(space: Space, n: number): number[] {
  const r = (a: number, b: number) => Array.from({ length: b - a }, (_, k) => a + k)
  return space === 'ideal' ? r(0, n) : space === 'now' ? r(n, 2 * n) : r(0, 2 * n)
}

/** Mean of both directions of the quiz's distance: each point scored with the other's weights. */
export const symDistance = (p: MapPoint, q: MapPoint) => 0.5 * (distance([...p.v], q.v, q.w) + distance([...q.v], p.v, p.w))

export function distanceMatrix(pts: readonly MapPoint[]): number[][] {
  const n = pts.length
  const D = Array.from({ length: n }, () => new Array<number>(n).fill(0))
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) D[i]![j] = D[j]![i] = symDistance(pts[i]!, pts[j]!)
  return D
}

/** Symmetric eigen-decomposition (cyclic Jacobi), eigenvalues descending; vecs[k] is the k-th eigenvector. */
export function jacobiEigen(input: readonly (readonly number[])[]): { vals: number[]; vecs: number[][] } {
  const n = input.length
  const A = input.map(r => [...r])
  const V: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)))
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += A[p]![q]! ** 2
    if (off < 1e-22) break
    for (let p = 0; p < n; p++)
      for (let q = p + 1; q < n; q++) {
        const apq = A[p]![q]!
        if (Math.abs(apq) < 1e-300) continue
        const theta = (A[q]![q]! - A[p]![p]!) / (2 * apq)
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1))
        const c = 1 / Math.sqrt(t * t + 1)
        const s = t * c
        for (let k = 0; k < n; k++) {
          const akp = A[k]![p]!
          const akq = A[k]![q]!
          A[k]![p] = c * akp - s * akq
          A[k]![q] = s * akp + c * akq
        }
        for (let k = 0; k < n; k++) {
          const apk = A[p]![k]!
          const aqk = A[q]![k]!
          A[p]![k] = c * apk - s * aqk
          A[q]![k] = s * apk + c * aqk
        }
        for (let k = 0; k < n; k++) {
          const vkp = V[k]![p]!
          const vkq = V[k]![q]!
          V[k]![p] = c * vkp - s * vkq
          V[k]![q] = s * vkp + c * vkq
        }
      }
  }
  const vals = A.map((r, i) => r[i]!)
  const order = vals.map((_, i) => i).sort((a, b) => vals[b]! - vals[a]!)
  return { vals: order.map(i => vals[i]!), vecs: order.map(i => V.map(r => r[i]!)) }
}

export function classicalMDS(D: readonly (readonly number[])[], dim: number): number[][] {
  const n = D.length
  const row = new Array<number>(n).fill(0)
  let all = 0
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const d2 = D[i]![j]! ** 2
      row[i]! += d2 / n
      all += d2 / (n * n)
    }
  const B = D.map((r, i) => r.map((d, j) => -0.5 * (d * d - row[i]! - row[j]! + all)))
  const { vals, vecs } = jacobiEigen(B)
  return Array.from({ length: n }, (_, i) => Array.from({ length: dim }, (_, k) => vecs[k]![i]! * Math.sqrt(Math.max(vals[k]!, 0))))
}

export const euclid = (a: readonly number[], b: readonly number[]) => {
  let s = 0
  for (let k = 0; k < a.length; k++) s += (a[k]! - b[k]!) ** 2
  return Math.sqrt(s)
}

/** Kruskal stress-1, normalised by the true dissimilarities: √(Σ(δ − d)² / Σδ²) over the selected pairs. */
export function stress1(X: readonly (readonly number[])[], D: readonly (readonly number[])[], sel?: (i: number, j: number) => boolean): number {
  let num = 0
  let den = 0
  for (let i = 0; i < D.length; i++)
    for (let j = i + 1; j < D.length; j++) {
      if (sel && !sel(i, j)) continue
      const d = euclid(X[i]!, X[j]!)
      num += (D[i]![j]! - d) ** 2
      den += D[i]![j]! ** 2
    }
  return Math.sqrt(num / den)
}

/** SMACOF: repeated Guttman transforms, X ← (1/n)·B(X)·X, until stress stops falling. */
export function smacof(D: readonly (readonly number[])[], X0: readonly (readonly number[])[], iters = 3000, eps = 1e-10): number[][] {
  const n = D.length
  const dim = X0[0]!.length
  let X = X0.map(r => [...r])
  let prev = Infinity
  for (let it = 0; it < iters; it++) {
    const Y = Array.from({ length: n }, () => new Array<number>(dim).fill(0))
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue
        const d = euclid(X[i]!, X[j]!)
        const b = d > 1e-12 ? D[i]![j]! / d : 0
        for (let k = 0; k < dim; k++) Y[i]![k]! += (b * (X[i]![k]! - X[j]![k]!)) / n
      }
    }
    X = Y
    const s = stress1(X, D)
    if (prev - s < eps) break
    prev = s
  }
  return X
}

/** Best of a classical-MDS start and `restarts` seeded random starts. */
export function bestLayout(D: readonly (readonly number[])[], dim: number, seed: number, restarts = 6): number[][] {
  let best = smacof(D, classicalMDS(D, dim))
  let bestS = stress1(best, D)
  const rng = mulberry32(seed)
  for (let r = 0; r < restarts; r++) {
    const X = smacof(D, D.map(() => Array.from({ length: dim }, () => (rng() - 0.5) * 0.6)))
    const s = stress1(X, D)
    if (s < bestS - 1e-6) {
      best = X
      bestS = s
    }
  }
  return best
}

/** Mean share of each point's k true nearest that are also among its k nearest in the layout. */
export function knnKeep(X: readonly (readonly number[])[], D: readonly (readonly number[])[], k = 3): number {
  const n = D.length
  let tot = 0
  for (let i = 0; i < n; i++) {
    const others = Array.from({ length: n }, (_, j) => j).filter(j => j !== i)
    const t = [...others].sort((a, b) => D[i]![a]! - D[i]![b]!).slice(0, k)
    const m = [...others].sort((a, b) => euclid(X[i]!, X[a]!) - euclid(X[i]!, X[b]!)).slice(0, k)
    tot += t.filter(j => m.includes(j)).length / k
  }
  return tot / n
}

/**
 * Orthogonal Procrustes: the rotation/reflection R (and translation) that best maps rows of X onto
 * rows of Y (same row count). R = M (MᵀM)^(−1/2) with M = Xᶜᵀ Yᶜ, the polar factor of M.
 */
export function procrustes(X: readonly (readonly number[])[], Y: readonly (readonly number[])[]): (p: readonly number[]) => number[] {
  const n = X.length
  const dim = X[0]!.length
  const mean = (Z: readonly (readonly number[])[]) => Array.from({ length: dim }, (_, k) => Z.reduce((s, r) => s + r[k]!, 0) / n)
  const mx = mean(X)
  const my = mean(Y)
  const M = Array.from({ length: dim }, (_, a) => Array.from({ length: dim }, (_, b) => X.reduce((s, r, i) => s + (r[a]! - mx[a]!) * (Y[i]![b]! - my[b]!), 0)))
  const MtM = Array.from({ length: dim }, (_, a) => Array.from({ length: dim }, (_, b) => M.reduce((s, r) => s + r[a]! * r[b]!, 0)))
  // SVD of M via MᵀM = B Σ² Bᵀ: a_k = M b_k / σ_k, and R = Σ a_k b_kᵀ. A rank-deficient M (e.g. a
  // flat target) leaves some a_k undetermined: complete them to an orthonormal basis.
  const { vals, vecs: B } = jacobiEigen(MtM)
  const smax = Math.sqrt(Math.max(vals[0]!, 0))
  const As: number[][] = []
  B.forEach((b, k) => {
    const s = Math.sqrt(Math.max(vals[k]!, 0))
    // Roundoff leaves a null direction at ~1e-8·σmax: treat anything under 1e-6·σmax as null.
    if (s > 1e-6 * smax) As.push(M.map(r => r.reduce((t, m, j) => t + m * b[j]!, 0) / s))
  })
  for (let e = 0; As.length < dim && e < dim; e++) {
    const v = Array.from({ length: dim }, (_, j) => (j === e ? 1 : 0))
    for (const a of As) {
      const d = a.reduce((t, x, j) => t + x * v[j]!, 0)
      for (let j = 0; j < dim; j++) v[j]! -= d * a[j]!
    }
    const len = Math.hypot(...v)
    if (len > 1e-6) As.push(v.map(x => x / len))
  }
  const R = Array.from({ length: dim }, (_, a) => Array.from({ length: dim }, (_, b) => As.reduce((t, u, k) => t + u[a]! * B[k]![b]!, 0)))
  return p => Array.from({ length: dim }, (_, b) => my[b]! + p.reduce((s, x, a) => s + (x - mx[a]!) * R[a]![b]!, 0))
}

/**
 * Orients a 2D ideal layout for familiarity (MDS axes have no meaning of their own): centred,
 * rotated so private ownership increases to the right, flipped so traditional norms increase upward.
 */
export function orient2d(X: readonly (readonly number[])[], cat: readonly Archetype[]): number[][] {
  const n = X.length
  const cx = X.reduce((s, r) => s + r[0]!, 0) / n
  const cy = X.reduce((s, r) => s + r[1]!, 0) / n
  const C = X.map(r => [r[0]! - cx, r[1]! - cy])
  // Least-squares gradient of an axis score over the plane.
  const grad = (k: number) => {
    const vals = cat.map(a => a.ideal[k]!)
    const mv = vals.reduce((s, v) => s + v, 0) / n
    let sxx = 0, syy = 0, sxy = 0, sxv = 0, syv = 0
    C.forEach(([x, y], i) => {
      sxx += x! * x!
      syy += y! * y!
      sxy += x! * y!
      sxv += x! * (vals[i]! - mv)
      syv += y! * (vals[i]! - mv)
    })
    const det = sxx * syy - sxy * sxy
    return [(sxv * syy - syv * sxy) / det, (syv * sxx - sxv * sxy) / det] as const
  }
  const g = grad(AXIS_IDS.indexOf('col'))
  const th = -Math.atan2(g[1], g[0])
  const rot = C.map(([x, y]) => [x! * Math.cos(th) - y! * Math.sin(th), x! * Math.sin(th) + y! * Math.cos(th)])
  const pro = AXIS_IDS.indexOf('pro')
  const mp = cat.reduce((s, a) => s + a.ideal[pro]!, 0) / n
  const cov = rot.reduce((s, r, i) => s + r[1]! * (cat[i]!.ideal[pro]! - mp), 0)
  return cov < 0 ? rot.map(([x, y]) => [x!, -y!]) : rot
}

/** The inputs a map depends on, canonically serialised (hashed into map.json to detect staleness). */
export function layoutInputs(cat: readonly Archetype[]): string {
  return JSON.stringify({ v: LAYOUT_VERSION, a: cat.map(a => [a.slug, a.ideal, a.now, a.weight]) })
}

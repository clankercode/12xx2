import { CATALOGUE } from '../../data/archetypes'
import { MAP } from '../../data/map'
import { distance, type Archetype, type Vec } from '../../engine/match'
import { dist, fitStats, placeOutOfSample } from '../../engine/mapGeo'
import type { Space } from '../../engine/mapLayout'
import { AXIS_IDS, type AxisId } from '../../engine/types'

/** One position on the map: an ideology's ideal (g < N) or here-and-now (g ≥ N) profile. */
export interface Pt {
  g: number
  i: number
  a: Archetype
  frame: 'ideal' | 'now'
  v: readonly number[]
}

const BY_SLUG = new Map(CATALOGUE.map(a => [a.slug, a]))
/** Catalogue in map.json order (the build checks they match; a mismatch would fail tests/map.test.ts). */
export const ARCH: Archetype[] = MAP.slugs.map(s => BY_SLUG.get(s)!).filter(Boolean)
export const N = ARCH.length
export const PTS: Pt[] = [
  ...ARCH.map((a, i) => ({ g: i, i, a, frame: 'ideal' as const, v: a.ideal })),
  ...ARCH.map((a, i) => ({ g: N + i, i, a, frame: 'now' as const, v: a.now })),
]
export const SPACE_IDS: Record<Space, number[]> = {
  ideal: PTS.slice(0, N).map(p => p.g),
  now: PTS.slice(N).map(p => p.g),
  joint: PTS.map(p => p.g),
}

/** "How a sees b": b's position scored against a's with a's weights (a in the quiz's target seat). */
export const dir = (a: number, b: number) => distance([...PTS[b]!.v], PTS[a]!.v, PTS[a]!.a.weight)

let dCache: number[][] | null = null
/** Symmetrised quiz distance between any two map points (what the layouts approximate). */
export function D(a: number, b: number): number {
  if (!dCache) dCache = PTS.map(p => PTS.map(q => (p === q ? 0 : 0.5 * (dir(p.g, q.g) + dir(q.g, p.g)))))
  return dCache[a]![b]!
}

/** The quiz's distance from a respondent's answers to a map point (that ideology's weights). */
export const dYou = (u: Vec, g: number) => distance(u, PTS[g]!.v, PTS[g]!.a.weight)

export const nameOf = (g: number, space: Space) => PTS[g]!.a.name + (space === 'joint' ? (PTS[g]!.frame === 'ideal' ? ' (ideal)' : ' (here and now)') : '')

export function layout(space: Space, dim: 2 | 3) {
  const L = MAP.layouts[`${space}-${dim}`]
  return { ids: SPACE_IDS[space], coords: L.coords, stress: L.stress, knn3: L.knn3, stressIdeal: L.stressIdeal, stressNow: L.stressNow }
}

const placeCache = new Map<string, { c: number[]; resid: number }>()
/** A respondent's answers placed out-of-sample into a layout, against their true distances. */
export function placeYou(u: Vec, key: string, space: Space, dim: 2 | 3) {
  const k = `${key}|${space}|${dim}|${u.join(',')}`
  let hit = placeCache.get(k)
  if (!hit) {
    const L = layout(space, dim)
    const r = placeOutOfSample(L.ids.map(g => dYou(u, g)), L.coords)
    hit = { c: r.x, resid: r.resid }
    placeCache.set(k, hit)
  }
  return hit
}

export interface Scene {
  ids: number[]
  /** Map coordinates per id (quiz units for maps; raw scores for a slice). */
  pos: Map<number, number[]>
  /** Coordinates × unit = quiz units (1 for maps; a slice: RMS over its two axes / 200). */
  unit: number
  /** Distance as drawn between two ids, in quiz units. */
  mapDist: (a: number, b: number) => number
}

export function mapScene(space: Space, dim: 2 | 3): Scene {
  const L = layout(space, dim)
  const pos = new Map(L.ids.map((g, r) => [g, L.coords[r]!]))
  return { ids: L.ids, pos, unit: 1, mapDist: (a, b) => dist(pos.get(a)!, pos.get(b)!) }
}

export function sliceScene(space: Space, ax: AxisId, ay: AxisId): Scene {
  const xi = AXIS_IDS.indexOf(ax)
  const yi = AXIS_IDS.indexOf(ay)
  const ids = SPACE_IDS[space]
  const pos = new Map(ids.map(g => [g, [PTS[g]!.v[xi]!, PTS[g]!.v[yi]!]]))
  const unit = 1 / Math.SQRT2 / 200
  return { ids, pos, unit, mapDist: (a, b) => dist(pos.get(a)!, pos.get(b)!) * unit }
}

export interface SceneStats {
  stress: number
  knn3: number
  pairs: { a: number; b: number; d: number; m: number }[]
  liars: { a: number; b: number; d: number; m: number }[]
  local: Map<number, number>
}

const statCache = new Map<string, SceneStats>()
/** Stress, 3-NN keep, every pair (true vs drawn), and the worst "looks close, isn't" pairs. */
export function sceneStats(key: string, sc: Scene): SceneStats {
  const hit = statCache.get(key)
  if (hit) return hit
  const ids = sc.ids
  const pairs: { a: number; b: number; d: number; m: number }[] = []
  for (let x = 0; x < ids.length; x++) for (let y = x + 1; y < ids.length; y++) pairs.push({ a: ids[x]!, b: ids[y]!, d: D(ids[x]!, ids[y]!), m: sc.mapDist(ids[x]!, ids[y]!) })
  const X = ids.map(g => sc.pos.get(g)!)
  const fs = fitStats(X.map(c => c.map(v => v * sc.unit)), (i, j) => D(ids[i]!, ids[j]!))
  const liars = pairs.filter(p => p.m < 0.06 && p.d > 0.15).sort((p, q) => q.d - q.m - (p.d - p.m)).slice(0, 4)
  const local = new Map<number, number>()
  for (const g of ids) {
    let num = 0
    let den = 0
    for (const h of ids) {
      if (h === g) continue
      const d = D(g, h)
      num += (d - sc.mapDist(g, h)) ** 2
      den += d * d
    }
    local.set(g, Math.sqrt(num / den))
  }
  const out = { stress: fs.stress, knn3: fs.knn3, pairs, liars, local }
  statCache.set(key, out)
  return out
}

/** True nearest few of a point, with the drawn distance and drawn rank of each. */
export function neighbours(sc: Scene, g: number, k = 3) {
  const others = sc.ids.filter(h => h !== g)
  const byTrue = [...others].sort((a, b) => D(g, a) - D(g, b))
  const byMap = [...others].sort((a, b) => sc.mapDist(g, a) - sc.mapDist(g, b))
  const top = byTrue.slice(0, k).map(h => ({ g: h, d: D(g, h), m: sc.mapDist(g, h), rank: byMap.indexOf(h) + 1 }))
  const imposters = byMap.slice(0, k).filter(h => !top.some(t => t.g === h)).map(h => ({ g: h, d: D(g, h), m: sc.mapDist(g, h) }))
  return { top, imposters }
}

/** Average-linkage clustering leaf order (seriation) of ideal positions, for the matrix. */
export function seriation(ids: readonly number[]): number[] {
  let cl = ids.map(g => [g])
  const dd = (a: number[], b: number[]) => {
    let s = 0
    for (const x of a) for (const y of b) s += D(x, y)
    return s / (a.length * b.length)
  }
  while (cl.length > 1) {
    let bi = 0
    let bj = 1
    let bv = Infinity
    for (let i = 0; i < cl.length; i++)
      for (let j = i + 1; j < cl.length; j++) {
        const v = dd(cl[i]!, cl[j]!)
        if (v < bv) {
          bv = v
          bi = i
          bj = j
        }
      }
    const a = cl[bi]!
    const b = cl[bj]!
    const ends = [
      [a, b],
      [[...a].reverse(), b],
      [a, [...b].reverse()],
      [[...a].reverse(), [...b].reverse()],
    ].sort((x, y) => D(x[0]!.at(-1)!, x[1]![0]!) - D(y[0]!.at(-1)!, y[1]![0]!))[0]!
    cl = cl.filter((_, k) => k !== bi && k !== bj).concat([[...ends[0]!, ...ends[1]!]])
  }
  return cl[0]!
}

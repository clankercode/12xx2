import { AXIS_IDS, GROUPS, type AxisId } from './types'
import { gaussian, mulberry32 } from './prng'
import type { LabelCuts } from './calibration'

export interface Archetype {
  slug: string
  name: string
  family: string
  sensitive: boolean
  summary: string
  signature: string
  /** Scored from coders' median answer sheets: −100…100 per axis, AXIS_IDS order. */
  ideal: number[]
  now: number[]
  /** Relevance weights normalised to Σ = 12. */
  weight: number[]
  /** Per-axis range of the coders' scored ideal vectors. */
  spread: number[]
  sources: { title: string; author: string; year?: string; url?: string; by_adherent: boolean }[]
}

export type Vec = (number | null)[]

/** Weighted RMS distance over covered axes, normalised to 0…1 (spec §4.8). */
export function distance(u: Vec, a: readonly number[], w: readonly number[]): number {
  let num = 0
  let den = 0
  for (let i = 0; i < u.length; i++) {
    const x = u[i]
    if (x === null || x === undefined) continue
    const wi = w[i] ?? 1
    num += wi * (x - a[i]!) ** 2
    den += wi
  }
  return den === 0 ? 1 : Math.sqrt(num / den) / 200
}

export function jointDistance(uI: Vec, uN: Vec, a: Archetype): number {
  return distance([...uI, ...uN], [...a.ideal, ...a.now], [...a.weight, ...a.weight])
}

/** A frame is matchable only with ≥ 8 covered axes and ≥ 2 in every group. */
export function coverageOk(u: Vec): boolean {
  const covered = (ax: AxisId) => u[AXIS_IDS.indexOf(ax)] !== null
  if (AXIS_IDS.filter(covered).length < 8) return false
  return Object.values(GROUPS).every(g => g.filter(covered).length >= 2)
}

export interface Ranked {
  arch: Archetype
  d: number
}

export function rank(u: Vec, cat: readonly Archetype[], which: 'ideal' | 'now'): Ranked[] {
  return cat
    .map(arch => ({ arch, d: distance(u, arch[which], arch.weight) }))
    .sort((x, y) => x.d - y.d || x.arch.slug.localeCompare(y.arch.slug))
}

export function rankJoint(uI: Vec, uN: Vec, cat: readonly Archetype[]): Ranked[] {
  return cat
    .map(arch => ({ arch, d: jointDistance(uI, uN, arch) }))
    .sort((x, y) => x.d - y.d || x.arch.slug.localeCompare(y.arch.slug))
}

export type MatchLabel = 'very-close' | 'close' | 'loose' | 'none'

export function labelFor(d: number, cuts: LabelCuts): MatchLabel {
  if (d <= cuts.veryClose) return 'very-close'
  if (d <= cuts.close) return 'close'
  if (d <= cuts.loose) return 'loose'
  return 'none'
}

export type StabilityLabel = 'stable' | 'fairly-stable' | 'toss-up'

export interface Stability {
  /** Share of draws in which each archetype ranked first. */
  wins: Map<string, number>
  top: string
  share: number
  label: StabilityLabel
  runnerUp?: string
}

/** Bootstrap: perturb each axis by N(0, SE) and count top-1 winners (spec §4.8). */
export function stability(
  u: Vec,
  se: Vec,
  cat: readonly Archetype[],
  which: 'ideal' | 'now',
  seed: number,
  draws = 200,
  pool?: (a: Archetype) => boolean,
): Stability {
  const rng = mulberry32(seed)
  const eligible = pool ? cat.filter(pool) : cat
  const wins = new Map<string, number>()
  for (let k = 0; k < draws; k++) {
    const v = u.map((x, i) => (x === null ? null : Math.max(-100, Math.min(100, x + (se[i] ?? 0) * gaussian(rng)))))
    const top = rank(v, eligible, which)[0]!.arch.slug
    wins.set(top, (wins.get(top) ?? 0) + 1)
  }
  const sorted = [...wins.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const [top, count] = sorted[0]!
  const share = count / draws
  const label: StabilityLabel = share >= 0.7 ? 'stable' : share >= 0.4 ? 'fairly-stable' : 'toss-up'
  for (const [slug] of wins) wins.set(slug, wins.get(slug)! / draws)
  return { wins, top, share, label, runnerUp: sorted[1]?.[0] }
}

export interface WhyLine {
  /** Axes contributing most to closeness (smallest weighted squared difference). */
  near: AxisId[]
  /** Axis contributing most to distance. */
  far: AxisId | null
}

export function why(u: Vec, a: readonly number[], w: readonly number[]): WhyLine {
  const terms = AXIS_IDS.map((ax, i) => {
    const x = u[i]
    return x === null || x === undefined ? null : { ax, t: (w[i] ?? 1) * (x - a[i]!) ** 2 }
  }).filter((t): t is { ax: AxisId; t: number } => t !== null)
  const asc = [...terms].sort((x, y) => x.t - y.t)
  return { near: asc.slice(0, 3).map(t => t.ax), far: asc.length > 3 ? asc[asc.length - 1]!.ax : null }
}

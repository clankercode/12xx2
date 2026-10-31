import { AXIS_IDS, type AxisId } from './types'
import type { Calibration } from './calibration'
import { payloadSeed, type Payload } from './payload'
import {
  coverageOk,
  labelFor,
  rank,
  rankJoint,
  stability,
  why,
  type Archetype,
  type MatchLabel,
  type Ranked,
  type Stability,
  type WhyLine,
} from './match'
import { isSettled, typeGap, type GapType } from './typology'

export interface Match {
  arch: Archetype
  d: number
  label: MatchLabel
  why: WhyLine
  /** The answers contradict one of its core or red-line commitments: listed, but never "your match". */
  ruledOut: boolean
  /** The frame has no scored position, so this measurement cannot be a fit. */
  flat?: true
}

/**
 * One frame's fit set (the headline rule): every ideology the answers FIT in that frame. An
 * ideology fits when no core or red-line commitment rules it out and its distance is within the "loose" cut
 * (the 95th percentile of simulated sincere adherents' distance to their own ideology). A sensitive
 * ideology has the stricter "very close" cut (spec §2.6). Distance orders the set and is shown as a
 * measurement; it never picks a single winner out of the set.
 */
export interface FitSet {
  frame: 'I' | 'N'
  /** Every scored axis is exactly zero: no position to name, regardless of distance. */
  flat?: true
  /** Every ideology that fits, nearest first. Empty = no close match. */
  fits: Match[]
  /** The nearest ideology not ruled out (a measurement, fit or not); null when all are ruled out. */
  nearest: Match | null
  /** How often the nearest stays nearest when the scores are jittered by their error bars (a measurement). */
  stability: Stability | null
  /** Within the "loose" cut but ruled out by a core or red-line commitment, nearest first. */
  ruledOutInRange: Match[]
  /** Sensitive ideologies within the "loose" cut but outside their stricter "very close" cut: listed, never named. */
  heldBack: Match[]
}

export type Hero =
  | { kind: 'unreliable' }
  | { kind: 'insufficient' }
  /** The ideal frame fits no listed ideology: "No close match", the nearest shown as a measurement. */
  | { kind: 'no-fit'; ideal: FitSet; now: FitSet | null }
  /** Both frames fit something, and their fit sets share no ideology. */
  | { kind: 'split'; ideal: FitSet; now: FitSet }
  /**
   * The ideal frame fits, and it is not a split: here and now is missing (null), shares at least one
   * fitting ideology, or fits nothing (`now.fits` empty). An empty here-and-now set is not a split:
   * the "fits" cut is the 95th percentile, so about 1 in 20 sincere here-and-now frames lands just
   * outside it by noise alone (docs/method/fit-set.md, decision 3).
   */
  | { kind: 'constant'; ideal: FitSet; now: FitSet | null }

export interface AxisRow {
  axis: AxisId
  I: number | null
  N: number | null
  seI: number | null
  seN: number | null
  G: number | null
  notable: boolean
  q: number | null
  type: GapType | null
  settled: boolean
}

export type RgBand = 'very-constant' | 'mostly-constant' | 'often-splits' | 'splits-a-lot'

export interface Results {
  payload: Payload
  hero: Hero
  rows: AxisRow[]
  rgBand: RgBand | null
  matchesIdeal: Match[]
  matchesNow: Match[]
  joint: Match[]
  /** Strongest notable gap, used as the secondary hook when the hero is "constant". */
  strongestGap: AxisRow | null
}

export function rgBandFor(rg: number | null, cuts: readonly [number, number, number]): RgBand | null {
  if (rg === null) return null
  if (rg < cuts[0]) return 'very-constant'
  if (rg < cuts[1]) return 'mostly-constant'
  if (rg < cuts[2]) return 'often-splits'
  return 'splits-a-lot'
}

function toMatch(
  r: Ranked,
  u: (number | null)[],
  which: 'ideal' | 'now',
  cal: Calibration,
  mode: Payload['mode'],
  out: ReadonlySet<string>,
): Match {
  return { arch: r.arch, d: r.d, label: labelFor(r.d, cal.labels[mode]), why: why(u, r.arch[which], r.arch.weight), ruledOut: out.has(r.arch.slug), ...(isFlat(u) && { flat: true as const }) }
}

/** The top 3 not ruled out, plus any ruled-out archetype that would have ranked in the top 3, in rank order. */
export function topWithRuledOut(ranked: readonly Ranked[], out: ReadonlySet<string>, n = 3): Ranked[] {
  const list: Ranked[] = []
  let viable = 0
  for (let k = 0; k < ranked.length && (viable < n || k < n); k++) {
    const r = ranked[k]!
    if (!out.has(r.arch.slug)) {
      if (viable < n) list.push(r)
      viable++
    } else if (k < n) list.push(r)
  }
  return list
}

/** Stability of a specific displayed match (its own bootstrap win share), not of the modal winner. */
function stabilityOf(stab: Stability, slug: string): Stability {
  const share = stab.wins.get(slug) ?? 0
  const label: Stability['label'] = share >= 0.7 ? 'stable' : share >= 0.4 ? 'fairly-stable' : 'toss-up'
  return { ...stab, share, label }
}

/** Does this ranked match fit? Not ruled out, and within the "loose" cut ("very close" if sensitive). */
export function fits(m: Match): boolean {
  return !m.flat && !m.ruledOut && (m.arch.sensitive ? m.label === 'very-close' : m.label !== 'none')
}

/** All scored axes at exactly zero carry no position to name. */
export const isFlat = (scores: readonly (number | null)[]) => scores.some(v => v !== null) && scores.every(v => v === null || v === 0)

/** The two fit sets name exactly the same ideologies. */
export function sameFits(a: FitSet, b: FitSet): boolean {
  return a.fits.length === b.fits.length && a.fits.every(m => b.fits.some(x => x.arch.slug === m.arch.slug))
}

/** A "constant" hero whose two frames fit exactly the same ideologies (here and now present). */
export function sameInBothFrames(h: Extract<Hero, { kind: 'constant' }>): boolean {
  return !!h.now && sameFits(h.ideal, h.now)
}

/** Fit sets share at least one ideology. */
function overlap(a: FitSet, b: FitSet): boolean {
  return a.fits.some(m => b.fits.some(x => x.arch.slug === m.arch.slug))
}

function fitSetFor(
  frame: 'I' | 'N',
  ranked: readonly Ranked[],
  u: (number | null)[],
  se: (number | null)[],
  cat: readonly Archetype[],
  seed: number,
  cal: Calibration,
  mode: Payload['mode'],
  out: ReadonlySet<string>,
): FitSet {
  const all = ranked.map(r => toMatch(r, u, 'ideal', cal, mode, out))
  const nearest = all.find(m => !m.ruledOut) ?? null
  // The bootstrap never counts a ruled-out ideology as nearest.
  const stab = nearest ? stability(u, se, cat, 'ideal', seed, 200, out.size ? a => !out.has(a.slug) : undefined) : null
  const flat = isFlat(u)
  return {
    frame,
    ...(flat && { flat: true as const }),
    fits: flat ? [] : all.filter(fits),
    nearest,
    stability: nearest && stab ? stabilityOf(stab, nearest.arch.slug) : null,
    ruledOutInRange: all.filter(m => m.ruledOut && m.label !== 'none'),
    heldBack: all.filter(m => !m.ruledOut && m.arch.sensitive && m.label !== 'none' && m.label !== 'very-close'),
  }
}

/**
 * `ruledOut` holds the slugs the payload's commitment rule-out field rules out (see
 * data/commitments `ruledOutSlugs`); empty = no rule-outs known.
 */
export function deriveResults(p: Payload, cat: readonly Archetype[], cal: Calibration, ruledOut: ReadonlySet<string> = new Set()): Results {
  const seed = payloadSeed(p)
  const rows: AxisRow[] = AXIS_IDS.map((axis, k) => {
    const I = p.I[k] ?? null
    const N = p.N[k] ?? null
    const q = p.q?.[k] ?? null
    const notable = p.notable[k] ?? false
    const seI = p.seI[k] ?? null
    const seN = p.seN[k] ?? null
    let type: GapType | null = null
    let settled = false
    if (q !== null && I !== null && N !== null) {
      if (notable) type = typeGap(q, I, N, seI ?? 0, seN ?? 0)
      else settled = isSettled(q, I, N)
    }
    return { axis, I, N, seI, seN, G: p.G[k] ?? null, notable, q, type, settled }
  })
  const notableRows = rows.filter(r => r.notable && r.G !== null)
  const strongestGap = notableRows.sort((a, b) => Math.abs(b.G!) - Math.abs(a.G!))[0] ?? null
  const rgBand = rgBandFor(p.rg, cal.rgCuts)

  const covI = coverageOk(p.I)
  const covN = coverageOk(p.N)
  const rankedI = covI ? rank(p.I, cat, 'ideal') : []
  const rankedN = covN ? rank(p.N, cat, 'ideal') : []
  const out = ruledOut
  const matchesIdeal = topWithRuledOut(rankedI, out).map(r => toMatch(r, p.I, 'ideal', cal, p.mode, out))
  const matchesNow = topWithRuledOut(rankedN, out).map(r => toMatch(r, p.N, 'ideal', cal, p.mode, out))
  const joint =
    covI && covN
      ? topWithRuledOut(rankJoint(p.I, p.N, cat), out).map(r => ({
          arch: r.arch,
          d: r.d,
          label: labelFor(r.d, cal.labels[p.mode]),
          why: why([...p.I], r.arch.ideal, r.arch.weight),
          ruledOut: out.has(r.arch.slug),
          ...(isFlat(p.I) && isFlat(p.N) && { flat: true as const }),
        }))
      : []

  const base = { payload: p, rows, rgBand, matchesIdeal, matchesNow, joint, strongestGap }
  // Careless answering: no closeness or gap claims anywhere, not just in the headline.
  if (p.careless)
    return {
      ...base,
      rows: rows.map(r => ({ ...r, notable: false, type: null })),
      matchesIdeal: [],
      matchesNow: [],
      joint: [],
      strongestGap: null,
      hero: { kind: 'unreliable' },
    }
  if (!covI) return { ...base, hero: { kind: 'insufficient' } }

  const ideal = fitSetFor('I', rankedI, p.I, p.seI, cat, seed, cal, p.mode, out)
  const now = covN ? fitSetFor('N', rankedN, p.N, p.seN, cat, (seed ^ 0x9e3779b9) >>> 0, cal, p.mode, out) : null
  if (!ideal.fits.length) return { ...base, hero: { kind: 'no-fit', ideal, now } }
  if (!now || !now.fits.length || overlap(ideal, now)) return { ...base, hero: { kind: 'constant', ideal, now } }
  // Disjoint, non-empty fit sets: here and now fits something, and nothing that fits the ideal.
  return { ...base, hero: { kind: 'split', ideal, now } }
}

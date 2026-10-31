import { AXIS_IDS, type AxisId } from './types'
import type { Calibration } from './calibration'
import { payloadSeed, type Payload } from './payload'
import {
  coverageOk,
  distance,
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
  /** The answers contradict one of its core commitments: listed, but never "your match". */
  ruledOut: boolean
}

export interface HeroPick {
  match: Match
  stability: Stability
  /** A sensitive archetype that ranked first but did not pass the stricter gate. */
  alsoClose?: Match
  /** The nearest archetype by distance, when a core commitment rules it out. */
  nearestRuledOut?: Match
}

export type Hero =
  | { kind: 'unreliable' }
  | { kind: 'insufficient' }
  /** Every ideology close enough to lead is ruled out by a core commitment. */
  | { kind: 'none-fit' }
  | { kind: 'split'; ideal: HeroPick; now: HeroPick }
  | { kind: 'constant'; ideal: HeroPick; leaning?: HeroPick; nowMissing?: boolean }

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
  return { arch: r.arch, d: r.d, label: labelFor(r.d, cal.labels[mode]), why: why(u, r.arch[which], r.arch.weight), ruledOut: out.has(r.arch.slug) }
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

/**
 * Sensitive archetypes (spec §2.6) lead only when "very close" and "stable";
 * otherwise the best non-sensitive archetype leads and the sensitive one is
 * listed as also close.
 */
/** Stability of a specific displayed match (its own bootstrap win share), not of the modal winner. */
function stabilityOf(stab: Stability, slug: string): Stability {
  const share = stab.wins.get(slug) ?? 0
  const label: Stability['label'] = share >= 0.7 ? 'stable' : share >= 0.4 ? 'fairly-stable' : 'toss-up'
  return { ...stab, share, label }
}

function pickHero(
  ranked: Ranked[],
  u: (number | null)[],
  se: (number | null)[],
  cat: readonly Archetype[],
  seed: number,
  cal: Calibration,
  mode: Payload['mode'],
  out: ReadonlySet<string>,
): HeroPick | null {
  // Ruled-out archetypes never lead, and the stability bootstrap never counts them.
  const ok = (a: Archetype) => !out.has(a.slug)
  const eligible = ranked.filter(r => ok(r.arch))
  if (!eligible.length) return null
  const stab = stability(u, se, cat, 'ideal', seed, 200, out.size ? ok : undefined)
  const top = toMatch(eligible[0]!, u, 'ideal', cal, mode, out)
  const note = eligible[0] !== ranked[0] ? { nearestRuledOut: toMatch(ranked[0]!, u, 'ideal', cal, mode, out) } : {}
  if (!top.arch.sensitive) return { match: top, stability: stabilityOf(stab, top.arch.slug), ...note }
  if (top.label === 'very-close' && stab.top === top.arch.slug && stab.label === 'stable') return { match: top, stability: stab, ...note }
  const alt = eligible.find(r => !r.arch.sensitive)
  if (!alt) return null
  const altStab = stability(u, se, cat, 'ideal', seed, 200, a => !a.sensitive && ok(a))
  return { match: toMatch(alt, u, 'ideal', cal, mode, out), stability: stabilityOf(altStab, alt.arch.slug), alsoClose: top, ...note }
}

/**
 * `ruledOut` holds the slugs the payload's core-commitment field rules out (see
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

  const ideal = pickHero(rankedI, p.I, p.seI, cat, seed, cal, p.mode, out)
  if (!ideal) return { ...base, hero: { kind: 'none-fit' } }
  if (!covN) return { ...base, hero: { kind: 'constant', ideal, nowMissing: true } }

  const now = pickHero(rankedN, p.N, p.seN, cat, (seed ^ 0x9e3779b9) >>> 0, cal, p.mode, out)
  if (!now) return { ...base, hero: { kind: 'constant', ideal, nowMissing: true } }
  const A = ideal.match.arch
  const B = now.match.arch
  if (A.slug === B.slug) return { ...base, hero: { kind: 'constant', ideal } }
  // Split only when Now is closer to B than to A by a calibrated margin and B is not a toss-up.
  const margin = distance(p.N, A.ideal, A.weight) - distance(p.N, B.ideal, B.weight)
  const split = margin >= cal.mu && now.stability.top === B.slug && now.stability.label !== 'toss-up'
  return { ...base, hero: split ? { kind: 'split', ideal, now } : { kind: 'constant', ideal, leaning: now } }
}

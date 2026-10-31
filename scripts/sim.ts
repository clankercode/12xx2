/** Respondent simulator shared by scripts/calibrate.ts and the calibration tests (spec §4.9). */
import { AXIS_IDS, MODES, type Answer, type Answers, type AxisId, type Item, type Mode } from '../src/engine/types'
import { gaussian } from '../src/engine/prng'
import { checkArchetype, type CommitmentBook } from '../src/engine/commitments'
import { itemsForMode } from '../src/data/items'

// Simulation model constants (published on the methodology page).
export const MODEL = { thetaRange: 2.5, itemSd: 0.6, noiseSd: 0.8, copyRates: [0.3, 0.5, 0.7], passRates: [0, 0.1, 0.2], personAxisSd: 0.4 }

export const clip = (x: number) => Math.max(-3, Math.min(3, x))
export const toAnswer = (x: number) => clip(Math.round(x)) as Answer
export const quantile = (xs: number[], q: number) => {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.max(0, Math.floor(q * (s.length - 1))))]!
}

/** A sheet gives the true keyed value per item for both frames (from archetype coders, or latent θ). */
export type TrueSheet = Record<string, { i: number; n: number }>

export function latentSheet(rng: () => number, items: readonly Item[]): TrueSheet {
  const theta = Object.fromEntries(AXIS_IDS.map(a => [a, (rng() * 2 - 1) * MODEL.thetaRange])) as Record<AxisId, number>
  const out: TrueSheet = {}
  for (const it of items) {
    const t = clip(theta[it.axis] + MODEL.itemSd * gaussian(rng))
    out[it.id] = { i: t, n: t }
  }
  return out
}

export interface Sheets {
  [slug: string]: Record<string, [number | null, number | null]>
}

export function archetypeSheet(rng: () => number, items: readonly Item[], sheet: Sheets[string], frame: 'ideal' | 'both'): TrueSheet {
  const shift = Object.fromEntries(AXIS_IDS.map(a => [a, MODEL.personAxisSd * gaussian(rng)])) as Record<AxisId, number>
  const out: TrueSheet = {}
  for (const it of items) {
    const [ri, rn] = sheet[it.id] ?? [0, 0]
    const ti = clip(it.key * (ri ?? 0) + shift[it.axis])
    const tn = frame === 'both' ? clip(it.key * (rn ?? ri ?? 0) + shift[it.axis]) : ti
    out[it.id] = { i: ti, n: tn }
  }
  return out
}

/** Respond to a true sheet. No-gap axes: Now copies the Ideal cell with prob p, else independent noise. */
export function respond(
  rng: () => number,
  items: readonly Item[],
  sheet: TrueSheet,
  opts: { p: number; pass: number; gapAxes?: Partial<Record<AxisId, number>>; noGap?: boolean },
): Answers {
  const ans: Answers = {}
  for (const it of items) {
    const s = sheet[it.id]!
    const keyedI = s.i
    let keyedN = opts.noGap ? s.i : s.n
    const shift = opts.gapAxes?.[it.axis]
    if (shift) keyedN = clip(keyedN + shift)
    const xi = toAnswer(it.key * (keyedI + MODEL.noiseSd * gaussian(rng)))
    let xn: Answer
    if (!shift && keyedN === keyedI && rng() < opts.p) xn = xi
    else xn = toAnswer(it.key * (keyedN + MODEL.noiseSd * gaussian(rng)))
    ans[it.id] = { i: rng() < opts.pass ? null : xi, n: rng() < opts.pass ? null : xn }
  }
  return ans
}

export function randomAnswers(rng: () => number, items: readonly Item[], pass = 0): Answers {
  const r = () => (rng() < pass ? null : ((Math.floor(rng() * 7) - 3) as Answer))
  return Object.fromEntries(items.map(it => [it.id, { i: r(), n: r() }]))
}


export interface FalseRuleOuts {
  /** Per mode: share of simulated sincere adherents ruled out of their own ideology. */
  byMode: Record<Mode, number>
  /** Full-length test, per ideology that lists commitments. */
  byArchetype: Record<string, number>
  draws: number
}

/**
 * Simulated sincere adherents (coders' sheets in both frames, ordinary noise and passing) of each
 * ideology that lists core commitments: how often their answers rule out their own ideology.
 * Null when no commitments exist yet.
 */
export function falseRuleOuts(rng: () => number, sheets: Sheets, book: CommitmentBook, perArchetype: number): FalseRuleOuts | null {
  const slugs = Object.keys(book).filter(s => book[s]!.length > 0 && sheets[s])
  if (!slugs.length) return null
  const byMode = {} as Record<Mode, number>
  const byArchetype: Record<string, number> = {}
  for (const mode of MODES) {
    const items = itemsForMode(mode)
    const asked = new Set(items.map(i => i.id))
    let out = 0
    for (const slug of slugs) {
      let own = 0
      for (let d = 0; d < perArchetype; d++) {
        const sheet = archetypeSheet(rng, items, sheets[slug]!, 'both')
        const ans = respond(rng, items, sheet, { p: MODEL.copyRates[d % 3]!, pass: MODEL.passRates[(d >> 1) % 3]! })
        if (checkArchetype(slug, book, ans, asked).all === 'fail') own++
      }
      out += own
      if (mode === 'full') byArchetype[slug] = Number((own / perArchetype).toFixed(4))
    }
    byMode[mode] = Number((out / (perArchetype * slugs.length)).toFixed(4))
  }
  return { byMode, byArchetype, draws: perArchetype }
}

import { AXIS_IDS, type Answer, type Answers, type AxisGap, type AxisId, type AxisScore, type Frame, type Item } from './types'
import type { Calibration } from './calibration'

/** Scale factor: a keyed mean of ±3 maps to ±100. */
export const K = 100 / 3
/** Prior floor (one scale point) so a perfectly consistent respondent never gets a zero band. */
export const S0 = 1
export const MIN_ITEMS = 3

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
/** Sample variance (n − 1); 0 for fewer than two values. */
const variance = (xs: number[]) => {
  if (xs.length < 2) return 0
  const m = mean(xs)
  return xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1)
}

const frameAnswer = (a: Answers[string] | undefined, f: Frame): Answer => (a ? (f === 'I' ? a.i : a.n) : null)

/**
 * Balanced keyed mean for one axis in one frame (spec §4.1–4.3). Averaging the
 * two key-direction means keeps all-agree at 0 under any pass pattern.
 */
export function scoreAxis(axisItems: readonly Item[], answers: Answers, frame: Frame): AxisScore {
  const plus: number[] = []
  const minus: number[] = []
  for (const it of axisItems) {
    const x = frameAnswer(answers[it.id], frame)
    if (x === null) continue
    ;(it.key === 1 ? plus : minus).push(it.key * x)
  }
  const n = plus.length + minus.length
  if (n < MIN_ITEMS || plus.length === 0 || minus.length === 0) {
    return { score: null, se: null, n, nPlus: plus.length, nMinus: minus.length }
  }
  const score = (K * (mean(plus) + mean(minus))) / 2
  const sePlus = Math.sqrt((variance(plus) + S0 ** 2) / plus.length)
  const seMinus = Math.sqrt((variance(minus) + S0 ** 2) / minus.length)
  const se = Math.min(100, (K / 2) * Math.sqrt(sePlus ** 2 + seMinus ** 2))
  return { score, se, n, nPlus: plus.length, nMinus: minus.length }
}

/** Keyed Δ (Now − Ideal) for items answered in both frames. */
export function pairedDeltas(axisItems: readonly Item[], answers: Answers) {
  const out: { item: Item; d: number }[] = []
  for (const it of axisItems) {
    const a = answers[it.id]
    if (!a || a.i === null || a.n === null) continue
    out.push({ item: it, d: it.key * (a.n - a.i) })
  }
  return out
}

export function tauFor(cal: Calibration, nPaired: number): number {
  const n = Math.max(MIN_ITEMS, Math.min(10, nPaired))
  return cal.tauG[String(n)] ?? Infinity
}

/** Paired-item axis gap with the notable gate (spec §4.5). */
export function gapAxis(axisItems: readonly Item[], answers: Answers, cal: Calibration): AxisGap {
  const ds = pairedDeltas(axisItems, answers)
  const plus = ds.filter(x => x.item.key === 1).map(x => x.d)
  const minus = ds.filter(x => x.item.key === -1).map(x => x.d)
  const nPaired = ds.length
  if (nPaired < MIN_ITEMS || plus.length === 0 || minus.length === 0) {
    return { g: null, nPaired, agree: 0, notable: false }
  }
  const g = (K * (mean(plus) + mean(minus))) / 2
  const sign = Math.sign(g)
  const agree = sign === 0 ? 0 : ds.filter(x => Math.sign(x.d) === sign).length
  const notable = sign !== 0 && Math.abs(g) >= tauFor(cal, nPaired) && agree >= 2
  return { g, nPaired, agree, notable }
}

export interface GapStats {
  /** Reality Gap: 100 · mean|Δ| / 6 over paired items, or null with no pairs. */
  rg: number | null
  splitRate: number | null
  nPaired: number
}

export function realityGap(items: readonly Item[], answers: Answers): GapStats {
  let sum = 0
  let splits = 0
  let n = 0
  for (const it of items) {
    const a = answers[it.id]
    if (!a || a.i === null || a.n === null) continue
    const d = Math.abs(a.n - a.i)
    sum += d
    if (d !== 0) splits++
    n++
  }
  if (n === 0) return { rg: null, splitRate: null, nPaired: 0 }
  return { rg: (100 * sum) / n / 6, splitRate: splits / n, nPaired: n }
}

/**
 * Within-frame inconsistency: mean dispersion of keyed values per axis, pooled
 * over both frames (spec §4.7). Uniform random clicking gives ≈ 4.
 */
export function inconsistencyIndex(answers: Answers, byAxis: Record<AxisId, Item[]>) {
  let num = 0
  let den = 0
  for (const ax of AXIS_IDS) {
    for (const f of ['I', 'N'] as const) {
      const ys: number[] = []
      for (const it of byAxis[ax]) {
        const x = frameAnswer(answers[it.id], f)
        if (x !== null) ys.push(it.key * x)
      }
      if (ys.length < 2) continue
      num += variance(ys) * ys.length
      den += ys.length
    }
  }
  return den === 0 ? null : num / den
}

export function groupByAxis(items: readonly Item[]): Record<AxisId, Item[]> {
  const out = Object.fromEntries(AXIS_IDS.map(a => [a, [] as Item[]])) as unknown as Record<AxisId, Item[]>
  for (const it of items) out[it.axis].push(it)
  return out
}

export interface Profile {
  I: Record<AxisId, AxisScore>
  N: Record<AxisId, AxisScore>
  gaps: Record<AxisId, AxisGap>
  rg: GapStats
  answered: number
  total: number
  inconsistency: number | null
  careless: boolean
}

/** Mean answered items per axis (both frames), used to look up the careless threshold. */
function meanAnsweredPerAxis(items: readonly Item[], answers: Answers) {
  let c = 0
  for (const it of items) {
    const a = answers[it.id]
    if (!a) continue
    if (a.i !== null) c++
    if (a.n !== null) c++
  }
  return c / (2 * AXIS_IDS.length)
}

export function carelessThreshold(cal: Calibration, nPerAxis: number) {
  const n = Math.max(MIN_ITEMS, Math.min(10, Math.round(nPerAxis)))
  return cal.careless[String(n)] ?? Infinity
}

export function computeProfile(items: readonly Item[], answers: Answers, cal: Calibration): Profile {
  const byAxis = groupByAxis(items)
  const I = {} as Record<AxisId, AxisScore>
  const N = {} as Record<AxisId, AxisScore>
  const gaps = {} as Record<AxisId, AxisGap>
  for (const ax of AXIS_IDS) {
    I[ax] = scoreAxis(byAxis[ax], answers, 'I')
    N[ax] = scoreAxis(byAxis[ax], answers, 'N')
    gaps[ax] = gapAxis(byAxis[ax], answers, cal)
  }
  let answered = 0
  for (const it of items) {
    const a = answers[it.id]
    if (a && (a.i !== null || a.n !== null)) answered++
  }
  const inconsistency = inconsistencyIndex(answers, byAxis)
  const careless = inconsistency !== null && inconsistency > carelessThreshold(cal, meanAnsweredPerAxis(items, answers))
  return { I, N, gaps, rg: realityGap(items, answers), answered, total: items.length, inconsistency, careless }
}

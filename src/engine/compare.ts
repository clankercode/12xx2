import { AXIS_IDS, type AxisId } from './types'
import { SE_STEP, type Payload } from './payload'

/**
 * Comparing two people's results. Shares are quantised, so each score carries its
 * standard error; two scores count as clearly different only when they are further
 * apart than Z combined standard errors (a ~95% two-sided test per axis). This avoids
 * an "overlap %" that looks high for any two people (random pairs score ~59%).
 */
export const CLEAR_Z = 1.96
/** Shared SEs are rounded to SE_STEP, so a stored 0 can mean up to half a step. */
const SE_FLOOR = SE_STEP / 2

export type Frame = 'I' | 'N'

export interface AxisDiff {
  axis: AxisId
  a: number
  b: number
  /** |a − b| on the −100…100 scale. */
  diff: number
  clear: boolean
}

export interface FrameComparison {
  /** One entry per axis; null where either person has no score. */
  axes: (AxisDiff | null)[]
  compared: number
  clear: number
  closest: AxisId | null
  furthest: AxisId | null
}

export type CompareSummary = 'ideals-differ-more' | 'practice-differs-more' | 'even' | 'none'

export interface Comparison {
  ideal: FrameComparison
  now: FrameComparison
  /** False when either result was flagged as careless answering: no differences are claimed. */
  reliable: boolean
  /** Which frame the two people disagree on more; null when it can't be said. */
  summary: CompareSummary | null
  /** True/false when both shared a country; null when either didn't. */
  sameCountry: boolean | null
}

function frame(a: Payload, b: Payload, f: Frame, z: number): FrameComparison {
  const se = f === 'I' ? [a.seI, b.seI] : [a.seN, b.seN]
  const axes = AXIS_IDS.map((axis, k): AxisDiff | null => {
    const x = a[f][k]
    const y = b[f][k]
    if (x === null || x === undefined || y === null || y === undefined) return null
    const sa = Math.max(se[0]![k] ?? 0, SE_FLOOR)
    const sb = Math.max(se[1]![k] ?? 0, SE_FLOOR)
    const diff = Math.abs(x - y)
    return { axis, a: x, b: y, diff, clear: diff > z * Math.hypot(sa, sb) }
  })
  const present = axes.filter((d): d is AxisDiff => d !== null)
  // Stable order (axis order breaks ties) so the sentence never flickers between equal axes.
  const byDiff = [...present].sort((p, q) => p.diff - q.diff)
  // Name a closest and furthest axis only when the gaps actually differ (identical results have neither).
  const spread = byDiff.length >= 2 && byDiff[byDiff.length - 1]!.diff > byDiff[0]!.diff
  return {
    axes,
    compared: present.length,
    clear: present.filter(d => d.clear).length,
    closest: spread ? byDiff[0]!.axis : null,
    furthest: spread ? byDiff[byDiff.length - 1]!.axis : null,
  }
}

/** Which frame two people disagree on more. Claims a side only with a margin of 2 axes (scaled to 12). */
function summarise(ideal: FrameComparison, now: FrameComparison): CompareSummary | null {
  if (ideal.compared < 6 || now.compared < 6) return null
  if (ideal.clear === 0 && now.clear === 0) return 'none'
  const fi = (ideal.clear / ideal.compared) * 12
  const fn = (now.clear / now.compared) * 12
  if (fi - fn >= 2) return 'ideals-differ-more'
  if (fn - fi >= 2) return 'practice-differs-more'
  return 'even'
}

export function compareResults(a: Payload, b: Payload, z = CLEAR_Z): Comparison {
  const ideal = frame(a, b, 'I', z)
  const now = frame(a, b, 'N', z)
  const reliable = !a.careless && !b.careless
  return {
    ideal,
    now,
    reliable,
    summary: reliable ? summarise(ideal, now) : null,
    sameCountry: a.country && b.country ? a.country === b.country : null,
  }
}

/** True when two payloads hold the same scores (used to tell which side of a compare link is "you"). */
export function sameScores(a: Payload, b: Payload): boolean {
  return AXIS_IDS.every((_, k) => a.I[k] === b.I[k] && a.N[k] === b.N[k])
}

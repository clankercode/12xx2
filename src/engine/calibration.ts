import type { Mode } from './types'

export interface LabelCuts {
  /** d ≤ veryClose → "very close" (≈ median distance of simulated sincere adherents). */
  veryClose: number
  close: number
  loose: number
}

/** Thresholds produced by `just calibrate` (scripts/calibrate.ts). Never hand-tuned. */
export interface Calibration {
  version: number
  /** Minimum |G| for a notable axis gap, keyed by paired item count "3".."10". */
  tauG: Record<string, number>
  /** Minimum Now-distance margin before the hero splits into Ideal: A · Here and now: B. */
  mu: number
  /** Reality Gap band cut-points [veryConstant | mostlyConstant | oftenSplits | splitsALot]. */
  rgCuts: [number, number, number]
  /** Inconsistency-index threshold for the careless flag, keyed by mean answers per axis "3".."10". */
  careless: Record<string, number>
  labels: Record<Mode, LabelCuts>
  /** Published diagnostics (power, false-alarm rates); rendered on the methodology page. */
  report?: Record<string, unknown>
}

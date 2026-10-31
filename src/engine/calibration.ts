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
  /** Minimum |G| for a notable axis gap, keyed by paired item count "3".."16" (MAX_AXIS_ITEMS). */
  tauG: Record<string, number>
  /** Legacy nearest-match margin, retained as a diagnostic; the fit-set headline does not use it. */
  mu: number
  /** Reality Gap band cut-points [veryConstant | mostlyConstant | oftenSplits | splitsALot]. */
  rgCuts: [number, number, number]
  /** Inconsistency-index threshold for the careless flag, keyed by mean answers per axis "3".."16". */
  careless: Record<string, number>
  labels: Record<Mode, LabelCuts>
  /** Published diagnostics (power, false-alarm rates); rendered on the methodology page. */
  report?: Record<string, unknown>
}

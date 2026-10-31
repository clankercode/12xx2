/** Shared constants for lab prototypes. */
import { LABEL, VALUES } from '../ui/answer'

export { LABEL, VALUES }
export type V = (typeof VALUES)[number]

export const DEFAULT_STATEMENT =
  'If a few people come to own most of a society’s wealth, much of it should be shared out among the rest.'

/**
 * Grid geometry used across prototypes (matches the live answer grid):
 * columns = ideal system, −3 (left) → +3 (right);
 * rows    = here and now, +3 (top)  → −3 (bottom).
 * Split cell: top-left triangle = here and now, bottom-right triangle = ideal.
 */
export const COLS: readonly V[] = VALUES
export const ROWS: readonly V[] = [...VALUES].reverse() as V[]

/** Plain-language meaning of each region, per Max's brief. `i` = ideal, `n` = now. */
export const CORNERS = {
  topRight: { i: 3, n: 3, short: 'Good now, good ideally', long: 'Right here and now, and in an ideal system too.' },
  topLeft: { i: -3, n: 3, short: 'Needed now, not ideally', long: 'An ideal system would never do it — but we need it here and now.' },
  bottomRight: { i: 3, n: -3, short: 'Ideal, but not for us now', long: 'Good in an ideal system, but bad for us here and now.' },
  bottomLeft: { i: -3, n: -3, short: 'Bad every time', long: 'Wrong here and now, and wrong in an ideal system.' },
  centre: { i: 0, n: 0, short: 'Neutral / torn', long: 'No strong view either way.' },
} as const satisfies Record<string, { i: V; n: V; short: string; long: string }>

export const prefersReducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

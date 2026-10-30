/**
 * Gap typology relative to the respondent's perceived status quo (spec §6.5).
 * Positional names only; the respondent's reasons come from reason chips.
 */
export type GapType = 'unclear' | 'away-from-settled' | 'status-quo' | 'partway' | 'beyond' | 'opposite'

export const EPSILON = 15

/** Point-estimate classification. Total: every input yields exactly one type. */
export function classify(q: number, i: number, n: number, eps = EPSILON): Exclude<GapType, 'unclear'> {
  if (Math.abs(q - i) < eps) return 'away-from-settled'
  if (Math.abs(n - q) < eps) return 'status-quo'
  const dir = Math.sign(i - q) // ≠ 0 here
  const along = (n - q) * dir // position of N along the Q→I direction
  const span = Math.abs(i - q)
  if (along > 0 && along <= span) return 'partway'
  if (along > span) return 'beyond'
  return 'opposite'
}

/**
 * A type is reported only if it survives Ideal and Now each moving half a
 * standard error either way; otherwise 'unclear' (disclosed on the methods page).
 */
export function typeGap(q: number, i: number, n: number, seI: number, seN: number): GapType {
  const base = classify(q, i, n)
  for (const di of [-0.5, 0.5]) {
    for (const dn of [-0.5, 0.5]) {
      if (classify(q, i + di * seI, n + dn * seN) !== base) return 'unclear'
    }
  }
  return base
}

/** Informational tag for non-notable axes already near both answers. */
export function isSettled(q: number, i: number, n: number, eps = EPSILON) {
  return Math.abs(q - i) < eps && Math.abs(n - i) < eps
}

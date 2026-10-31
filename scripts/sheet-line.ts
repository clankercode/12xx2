/**
 * One line of a coder answer sheet: "Q012: +2, -1", "Q012 | 2 | x", "Q012 -3 0" … (x = passed).
 * Shared by scripts/build-archetypes.ts and scripts/coder-fill.ts so the two never disagree about
 * which items a sheet answers (coder-fill once missed "+N" answers and re-asked them).
 */
export const SHEET_LINE = /^\s*(Q\d{3})\s*[:|]?\s*([+-]?\d|x)\s*[,|\s]\s*([+-]?\d|x)\s*$/i

/** The Q-id and both answers (null = passed), clamped to −3…3; null when the line isn't an answer. */
export function parseSheetLine(line: string): { q: string; i: number | null; n: number | null } | null {
  const m = line.match(SHEET_LINE)
  if (!m) return null
  const v = (s: string) => (s.toLowerCase() === 'x' ? null : Math.max(-3, Math.min(3, Number(s))))
  return { q: m[1]!, i: v(m[2]!), n: v(m[3]!) }
}

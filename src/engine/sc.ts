import type { Answer } from './types'
import { S0 } from './score'

export interface ScResult {
  /** 0–100, higher = more confidence the system works by its own rules. */
  score: number
  se: number
  n: number
}

/** Balanced keyed mean of the System Confidence block; needs ≥4 answers incl. both keys. */
export function scoreSc(items: readonly { id: string; key: 1 | -1 }[], answers: Record<string, Answer>): ScResult | null {
  const plus: number[] = []
  const minus: number[] = []
  for (const it of items) {
    const x = answers[it.id]
    if (x === null || x === undefined) continue
    ;(it.key === 1 ? plus : minus).push(it.key * x)
  }
  const n = plus.length + minus.length
  if (n < 4 || !plus.length || !minus.length) return null
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
  const v = (xs: number[]) => (xs.length < 2 ? 0 : xs.reduce((a, x) => a + (x - mean(xs)) ** 2, 0) / (xs.length - 1))
  const m = (mean(plus) + mean(minus)) / 2
  const se = 0.5 * Math.sqrt((v(plus) + S0 ** 2) / plus.length + (v(minus) + S0 ** 2) / minus.length)
  return { score: 50 + (50 * m) / 3, se: Math.min(50, (50 * se) / 3), n }
}

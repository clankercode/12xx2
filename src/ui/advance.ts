import { useSyncExternalStore } from 'react'
import type { Answer, ItemAnswer } from '../engine/types'

/**
 * "Move to the next statement automatically": a per-device setting shown under every statement.
 * On by default. Stored as '1' / '0' in localStorage (wrapped like the palette choice, so blocked
 * storage just keeps the choice for this page).
 */
const KEY = '12xx2.autoAdvance'
export const DEFAULT_AUTO_ADVANCE = true

/** A stored value, or the default when it is missing or unknown. */
export const parseAutoAdvance = (raw: unknown): boolean => (raw === '0' ? false : raw === '1' ? true : DEFAULT_AUTO_ADVANCE)

function load(): boolean {
  try {
    return parseAutoAdvance(localStorage.getItem(KEY))
  } catch {
    return DEFAULT_AUTO_ADVANCE
  }
}

let current: boolean | null = null
const listeners = new Set<() => void>()

export function readAutoAdvance(): boolean {
  return (current ??= load())
}

export function applyAutoAdvance(on: boolean) {
  current = on
  try {
    localStorage.setItem(KEY, on ? '1' : '0')
  } catch {
    /* storage blocked: the choice lasts for this page only */
  }
  for (const l of listeners) l()
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useAutoAdvance(): boolean {
  return useSyncExternalStore(subscribe, readAutoAdvance, () => DEFAULT_AUTO_ADVANCE)
}

/**
 * What an answer does to the quiz's position. Only a statement going from unanswered to answered
 * moves on, and only with the setting on; editing an answered statement always stays put.
 * A big split opens the optional reason chips first, and the move waits for a chip pick.
 */
export function afterAnswer(o: { auto: boolean; answeredBefore: boolean; big: boolean }): {
  advance: boolean
  afterChip: boolean
} {
  const fresh = o.auto && !o.answeredBefore
  return { advance: fresh && !o.big, afterChip: fresh && o.big }
}

/**
 * The Next button for the statement as shown. Enabled once the statement is answered or passed;
 * before that it is disabled and Pass is the way past.
 * With one frame ticked as passed over a stored two-frame answer, Next keeps what is shown: the
 * other frame's answer, with the ticked one passed (`commit`). Both frames ticked = pass the statement.
 */
export function nextFor(
  stored: ItemAnswer | undefined,
  passI: boolean,
  passN: boolean,
): { enabled: boolean; pass?: true; commit?: { i: Answer; n: Answer } } {
  if (passI && passN) return { enabled: true, pass: true }
  if (!stored) return { enabled: false }
  if (passI || passN) {
    const keep = passI ? stored.n : stored.i
    if (keep === null) return { enabled: false }
    const want = passI ? { i: null, n: keep } : { i: keep, n: null }
    return want.i === stored.i && want.n === stored.n ? { enabled: true } : { enabled: true, commit: want }
  }
  // A one-frame answer with its pass unticked shows an empty grid: answer it (or re-tick) first.
  // A passed statement (both null) counts as done.
  return { enabled: (stored.i === null) === (stored.n === null) }
}

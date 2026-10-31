import type { V } from '../../kit'

/**
 * The answer grid read as a map. Four 3×3 territories (the quadrants, values
 * ±1..±3 on both answers) are separated by a neutral cross (one answer is 0);
 * the cross meets at the centre cell (0, 0). The main diagonal (ideal = now)
 * is the "same both ways" line. `i` = ideal system, `n` = here and now.
 */
export type Quadrant = 'tr' | 'tl' | 'br' | 'bl'
export type Zone = Quadrant | 'x'
/** What can light up: a quadrant, the neutral cross, or the diagonal. */
export type Lit = Zone | 'diag'

export interface Region {
  id: Lit
  emoji: string
  name: string
  /** Shorter name for phone-width layouts. */
  short: string
  /** Second line under the name (hidden in tight layouts). */
  sub: string
  /** One-sentence explanation for the hero readout. */
  long: string
  /** Example answer shown (with numerals) while the hero tour is on this region. */
  example: { i: V; n: V }
}

export const REGIONS: Record<Lit, Region> = {
  tr: {
    id: 'tr',
    emoji: '✅',
    name: 'Good both ways',
    short: 'Good both ways',
    sub: 'ideally, and here and now',
    long: 'Good in an ideal system, and worth doing here and now too.',
    example: { i: 3, n: 2 },
  },
  tl: {
    id: 'tl',
    emoji: '🧯',
    name: 'Necessary for now',
    short: 'Needed for now',
    sub: 'not in an ideal system',
    long: 'An ideal system would never do it — but here and now, it may be necessary.',
    example: { i: -2, n: 2 },
  },
  br: {
    id: 'br',
    emoji: '⏳',
    name: 'Ideal, but not for now',
    short: 'Ideal, not now',
    sub: 'bad for us here and now',
    long: 'Good in an ideal system — but bad for us here and now.',
    example: { i: 3, n: -2 },
  },
  bl: {
    id: 'bl',
    emoji: '🚫',
    name: 'Bad every time',
    short: 'Bad every time',
    sub: 'ideally, and here and now',
    long: 'Wrong in an ideal system, and wrong here and now. Bad every time.',
    // Not (−3, −3): that corner cell sits under the region label.
    example: { i: -3, n: -2 },
  },
  x: {
    id: 'x',
    emoji: '⚖️',
    name: 'Torn',
    short: 'Torn',
    sub: 'neutral on one or both',
    long: 'Dead centre: neutral or torn about both. Along the cross, torn about one of them.',
    example: { i: 0, n: 0 },
  },
  diag: {
    id: 'diag',
    emoji: '＝',
    name: 'Same both ways',
    short: 'Same both ways',
    sub: 'now matches ideal',
    long: 'On this line, here and now matches your ideal. The further off it, the bigger the gap.',
    example: { i: 1, n: 1 },
  },
}

/** Hero tour order: the easy corners first, then the interesting off-diagonals. */
export const TOUR: Lit[] = ['tr', 'bl', 'tl', 'br', 'x', 'diag']

export function zoneOf(i: V, n: V): Zone {
  if (i === 0 || n === 0) return 'x'
  if (n > 0) return i > 0 ? 'tr' : 'tl'
  return i > 0 ? 'br' : 'bl'
}

/** Headline for a picked cell (cross cells say which answer is torn). */
export function headline(i: V, n: V): { emoji: string; name: string } {
  const z = zoneOf(i, n)
  if (z !== 'x') return REGIONS[z]
  if (i === 0 && n === 0) return { emoji: '⚖️', name: 'Torn both ways' }
  return { emoji: '⚖️', name: i === 0 ? 'Torn about the ideal' : 'Torn about here and now' }
}

const IDEAL_WORD: Record<V, string> = {
  3: 'Very good',
  2: 'Good',
  1: 'Slightly good',
  0: 'Neither good nor bad',
  [-1]: 'Slightly bad',
  [-2]: 'Bad',
  [-3]: 'Very bad',
}

const NOW_PHRASE: Record<V, string> = {
  3: 'you’d strongly support it',
  2: 'you’d support it',
  1: 'you’d lean towards it',
  0: 'you’re torn',
  [-1]: 'you’d lean against it',
  [-2]: 'you’d oppose it',
  [-3]: 'you’d strongly oppose it',
}

/** "Good in an ideal system, but here and now you’d oppose it." */
export function sentence(i: V, n: V): string {
  const same = Math.sign(i) === Math.sign(n)
  const too = same && i !== 0 ? ' too' : ''
  return `${IDEAL_WORD[i]} in an ideal system, ${same ? 'and' : 'but'} here and now ${NOW_PHRASE[n]}${too}.`
}

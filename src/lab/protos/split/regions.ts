import { LABEL, type V } from '../../kit'
import { signed } from '../../palettes'

/**
 * Plain-language model of the answer grid for the "Split tiles" prototype.
 * `i` = ideal system (columns, −3 left → +3 right), `n` = here and now
 * (rows, +3 top → −3 bottom).
 */

export type RegionId = 'tr' | 'tl' | 'bl' | 'br' | 'c'

export interface Region {
  id: RegionId
  /** The cell the hero tour lands on. */
  i: V
  n: V
  emoji: string
  /** Caption set inside the grid, as two short lines. */
  lines: [string, string] | [string]
  title: string
  body: string
}

export const REGIONS: Record<RegionId, Region> = {
  tr: {
    id: 'tr',
    i: 3,
    n: 3,
    emoji: '👍',
    lines: ['Good now,', 'good ideally'],
    title: 'Good now, good ideally',
    body: 'You back it here and now — and an ideal system would do it too.',
  },
  tl: {
    id: 'tl',
    i: -3,
    n: 3,
    emoji: '🩹',
    lines: ['Needed now,', 'never ideal'],
    title: 'Needed now, never ideal',
    body: 'An ideal system would never do it — but here and now, it may be necessary.',
  },
  bl: {
    id: 'bl',
    i: -3,
    n: -3,
    emoji: '👎',
    lines: ['Bad in', 'every case'],
    title: 'Bad in every case',
    body: 'Wrong for us here and now, and wrong in any system you would design.',
  },
  br: {
    id: 'br',
    i: 3,
    n: -3,
    emoji: '🔭',
    lines: ['Ideal, but', 'not for us now'],
    title: 'Ideal, but not for us now',
    body: 'Good in an ideal system — but here and now it would do more harm than good.',
  },
  c: {
    id: 'c',
    i: 0,
    n: 0,
    emoji: '🤷',
    lines: ['Torn'],
    title: 'Neutral or torn',
    body: 'No pull either way — or pulled both ways at once.',
  },
}

/** Hero tour order: the two "agreeing" corners, then the two mixed ones, then the middle. */
export const TOUR: RegionId[] = ['tr', 'bl', 'tl', 'br', 'c']

/** Which corner/centre a cell belongs to (cells on the 0 row/column belong to none). */
export function regionOf(i: V, n: V): RegionId | null {
  if (i === 0 && n === 0) return 'c'
  if (i > 0 && n > 0) return 'tr'
  if (i < 0 && n > 0) return 'tl'
  if (i < 0 && n < 0) return 'bl'
  if (i > 0 && n < 0) return 'br'
  return null
}

/** Is the cell part of a region's spotlight (hero tour dims everything else)? */
export function inSpotlight(id: RegionId, i: V, n: V): boolean {
  if (id === 'c') return i === 0 || n === 0
  return regionOf(i, n) === id
}

/** Headline for any cell: the region's name, or which half is torn on the 0 row / column. */
export function headline(i: V, n: V): { emoji: string; title: string } {
  const r = regionOf(i, n)
  if (r) return REGIONS[r]
  if (n === 0) return { emoji: '🤷', title: `${i > 0 ? 'Good' : 'Bad'} ideally, torn about now` }
  return { emoji: '🤷', title: `${n > 0 ? 'Good' : 'Bad'} now, torn about the ideal` }
}

const IDEAL_WORD: Record<V, string> = {
  3: 'very good',
  2: 'good',
  1: 'slightly good',
  0: '',
  [-1]: 'slightly bad',
  [-2]: 'bad',
  [-3]: 'very bad',
}

const NOW_PHRASE: Record<V, string> = {
  3: 'you’d strongly back it',
  2: 'you’d back it',
  1: 'you’d lean towards it',
  0: 'you’re torn',
  [-1]: 'you’d lean against it',
  [-2]: 'you’d oppose it',
  [-3]: 'you’d strongly oppose it',
}

/**
 * One plain sentence for any pick (merged from prototype B's readout): the strength of
 * both answers, joined by "and … too" when they agree in sign and "but" when they pull apart.
 *   "Ideally it’s slightly bad, but here and now you’d back it."
 *   "Ideally it’s very good, and here and now you’d strongly back it too."
 */
export function sentence(i: V, n: V): string {
  if (i === 0 && n === 0) return 'No pull either way — or pulled both ways at once — ideally and here and now.'
  const ideal = i === 0 ? 'You’re torn about the ideal' : `Ideally it’s ${IDEAL_WORD[i]}`
  const agree = Math.sign(i) * Math.sign(n) > 0
  return `${ideal}, ${agree ? 'and' : 'but'} here and now ${NOW_PHRASE[n]}${agree ? ' too' : ''}.`
}

export function cellLabel(i: V, n: V): string {
  return `Here and now: ${LABEL[n]} (${signed(n)}). Ideal system: ${LABEL[i]} (${signed(i)}).`
}

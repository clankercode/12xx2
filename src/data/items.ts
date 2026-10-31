import { AXIS_IDS, type Item, type Mode, type RedLine, type Statement } from '../engine/types'
import { RED_IDS, RED_LINES } from './redlines'
import fed from '../../content/items/fed.json'
import dem from '../../content/items/dem.json'
import lib from '../../content/items/lib.json'
import col from '../../content/items/col.json'
import pla from '../../content/items/pla.json'
import glo from '../../content/items/glo.json'
import int from '../../content/items/int.json'
import mil from '../../content/items/mil.json'
import mul from '../../content/items/mul.json'
import rel from '../../content/items/rel.json'
import pro from '../../content/items/pro.json'
import tec from '../../content/items/tec.json'

interface RawItem {
  id: string
  key: number
  facet: string
  form: string
  level: number
  text: string
  note?: string
  tier: string
}

const RAW: Record<string, { items: RawItem[] }> = { fed, dem, lib, col, pla, glo, int, mil, mul, rel, pro, tec }

/** Every axis item (144: Full has 10–16 per axis), grouped by axis in AXIS_IDS order. Red lines are not here: they are never scored. */
export const ALL_ITEMS: readonly Item[] = AXIS_IDS.flatMap(axis =>
  RAW[axis]!.items.map(r => ({
    id: r.id,
    axis,
    key: r.key as Item['key'],
    facet: r.facet,
    form: r.form as Item['form'],
    level: r.level as Item['level'],
    text: r.text,
    note: r.note,
    tier: r.tier as Item['tier'],
  })),
)

const TIER_RANK: Record<Item['tier'], number> = { quick: 0, standard: 1, full: 2 }
const MODE_RANK: Record<Mode, number> = { quick: 0, standard: 1, full: 2 }

export const itemsForMode = (mode: Mode) => ALL_ITEMS.filter(it => TIER_RANK[it.tier] <= MODE_RANK[mode])

/** Ids of every statement a run of `mode` asks: its axis items plus the red lines (asked at every length). */
export const askedIdsForMode = (mode: Mode): string[] => [...itemsForMode(mode).map(it => it.id), ...RED_IDS]

/** Red lines a run has not answered yet (a passed red line counts as answered). */
export const unansweredRedLines = (answers: Readonly<Record<string, unknown>>): string[] => RED_IDS.filter(id => !answers[id])

/** Modes that contain every statement of `mode` and more (modes are nested: quick ⊂ standard ⊂ full). */
export const longerModes = (mode: Mode): Mode[] => (Object.keys(MODE_RANK) as Mode[]).filter(m => MODE_RANK[m] > MODE_RANK[mode])

/**
 * The statements a run asks, in order: the mode's axis items, then the red lines. When a finished
 * run is being extended from a shorter mode, only the axis items that mode didn't have, then only
 * the red lines listed in `redLines` (those the run hadn't answered when it was continued).
 */
export function quizItems(mode: Mode, extendFrom: Mode | null, redLines?: readonly string[]): Statement[] {
  const order = orderedItems(mode)
  if (!extendFrom) return [...order, ...RED_LINES]
  const pending = new Set(redLines ?? [])
  const reds: RedLine[] = RED_LINES.filter(r => pending.has(r.id))
  return [...order.filter(it => TIER_RANK[it.tier] > MODE_RANK[extendFrom]), ...reds]
}

/**
 * Fixed, deterministic presentation order (spec §2.3): axes round-robin with
 * keys alternating, so no two consecutive items share an axis. Every respondent
 * in a mode sees the same order, so results are comparable.
 */
export function orderedItems(mode: Mode): Item[] {
  const pool = itemsForMode(mode)
  const queues = AXIS_IDS.map(ax => {
    const plus = pool.filter(i => i.axis === ax && i.key === 1)
    const minus = pool.filter(i => i.axis === ax && i.key === -1)
    const q: Item[] = []
    for (let k = 0; k < Math.max(plus.length, minus.length); k++) {
      const first = (k + AXIS_IDS.indexOf(ax)) % 2 === 0 ? plus : minus
      const second = first === plus ? minus : plus
      if (first[k]) q.push(first[k]!)
      if (second[k]) q.push(second[k]!)
    }
    return q
  })
  // Rotate the axis order each round so round boundaries never repeat an axis. Full rounds run while
  // every axis still has an item (all of Quick and Standard, which are 4 and 6 on every axis).
  const out: Item[] = []
  const rounds = Math.min(...queues.map(q => q.length))
  const perm = [0, 4, 8, 1, 5, 9, 2, 6, 10, 3, 7, 11]
  for (let r = 0; r < rounds; r++) {
    const offset = (r * 5) % 12
    for (let j = 0; j < 12; j++) out.push(queues[perm[(j + offset) % 12]!]![r]!)
  }
  // Full has more items on some axes: interleave the rest by always taking the axis with the most
  // left that differs from the last one (ties in axis order), which never puts an axis twice in a row
  // while that is possible at all.
  const rest = queues.map(q => q.slice(rounds))
  for (let left = rest.reduce((n, q) => n + q.length, 0); left > 0; left--) {
    const last = out[out.length - 1]?.axis
    let pick = -1
    rest.forEach((q, k) => {
      if (q.length && AXIS_IDS[k] !== last && (pick < 0 || q.length > rest[pick]!.length)) pick = k
    })
    if (pick < 0) pick = rest.findIndex(q => q.length > 0)
    out.push(rest[pick]!.shift()!)
  }
  return out
}

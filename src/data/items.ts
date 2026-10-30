import { AXIS_IDS, type Item, type Mode } from '../engine/types'
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

/** All 120 items, grouped by axis in AXIS_IDS order. */
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
  // Rotate the axis order each round so round boundaries never repeat an axis.
  const out: Item[] = []
  const rounds = Math.max(...queues.map(q => q.length))
  const perm = [0, 4, 8, 1, 5, 9, 2, 6, 10, 3, 7, 11]
  for (let r = 0; r < rounds; r++) {
    const offset = (r * 5) % 12
    for (let j = 0; j < 12; j++) {
      const q = queues[perm[(j + offset) % 12]!]!
      if (q[r]) out.push(q[r]!)
    }
  }
  return out
}

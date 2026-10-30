import { AXIS_IDS, CHIPS, type ChipId, type Item } from '../engine/types'
import { computeProfile, type Profile } from '../engine/score'
import { profileToPayload, type Payload } from '../engine/payload'
import { scoreSc, type ScResult } from '../engine/sc'
import { deriveResults, type Results } from '../engine/results'
import { itemsForMode } from '../data/items'
import { CALIBRATION } from '../data/calibration'
import { CATALOGUE, CATALOGUE_VERSION } from '../data/archetypes'
import { SC_ITEMS } from '../data/sc'
import type { Session } from './session'

export interface Own {
  items: Item[]
  profile: Profile
  sc: ScResult | null
  /** Full payload (incl. optional fields); results are always derived from this quantised form. */
  payload: Payload
  results: Results
  splits: { item: Item; i: number; n: number; delta: number }[]
  reasons: { chip: ChipId; count: number }[]
  diagnostics: { paired: number; diagonal: number; extreme: number; midpoint: number; passed: number; frames: number }
}

export function deriveOwn(s: Session): Own | null {
  if (!s.mode) return null
  const items = itemsForMode(s.mode)
  const profile = computeProfile(items, s.answers, CALIBRATION)
  const sc = scoreSc(SC_ITEMS, s.sc)
  const qVec = AXIS_IDS.map(a => s.q[a] ?? null)
  const inputs = Object.values(s.answers).map(a => a.input ?? 'grid')
  const rows = inputs.filter(x => x === 'rows').length
  const payload = profileToPayload(profile, {
    catalogue: CATALOGUE_VERSION,
    mode: s.mode,
    input: rows > inputs.length / 2 ? 'rows' : 'grid',
    q: qVec.some(v => v !== null) ? qVec : undefined,
    sc: sc ? { score: sc.score, se: sc.se } : undefined,
    country: s.country ?? undefined,
  })
  const results = deriveResults(payload, CATALOGUE, CALIBRATION)

  const splits = items
    .flatMap(item => {
      const a = s.answers[item.id]
      if (!a || a.i === null || a.n === null || a.i === a.n) return []
      return [{ item, i: a.i, n: a.n, delta: a.n - a.i }]
    })
    .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
    .slice(0, 5)

  const counts = new Map<ChipId, number>()
  for (const it of items) {
    const c = s.answers[it.id]?.chip
    if (c) counts.set(c, (counts.get(c) ?? 0) + 1)
  }
  const reasons = CHIPS.filter(c => counts.has(c))
    .map(chip => ({ chip, count: counts.get(chip)! }))
    .sort((a, b) => b.count - a.count)

  let paired = 0
  let diagonal = 0
  let extreme = 0
  let midpoint = 0
  let passed = 0
  let frames = 0
  for (const it of items) {
    const a = s.answers[it.id]
    for (const x of [a?.i ?? null, a?.n ?? null]) {
      frames++
      if (x === null) passed++
      else if (Math.abs(x) === 3) extreme++
      else if (x === 0) midpoint++
    }
    if (a && a.i !== null && a.n !== null) {
      paired++
      if (a.i === a.n) diagonal++
    }
  }
  return { items, profile, sc, payload, results, splits, reasons, diagnostics: { paired, diagonal, extreme, midpoint, passed, frames } }
}

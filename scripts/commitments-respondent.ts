/**
 * The simulated respondent used by the commitments screenshots (scripts/commitments-shots.ts).
 * Run directly to print its nearest ideal matches and answers, for hand-making test fixtures.
 */
import { readFileSync } from 'node:fs'
import { mulberry32 } from '../src/engine/prng'
import { itemsForMode } from '../src/data/items'
import { archetypeSheet, respond, type Sheets } from './sim'
import type { Answers } from '../src/engine/types'

export const SHOT_MODE = 'standard' as const

export function shotAnswers(slug = 'social-democracy', seed = 4): Answers {
  const sheets = JSON.parse(readFileSync('content/archetypes/sheets.json', 'utf8')) as Sheets
  const rng = mulberry32(seed)
  const items = itemsForMode(SHOT_MODE)
  return respond(rng, items, archetypeSheet(rng, items, sheets[slug]!, 'both'), { p: 0.5, pass: 0.05 })
}

if (process.argv[1]?.endsWith('commitments-respondent.ts')) {
  const { computeProfile } = await import('../src/engine/score')
  const { profileToPayload } = await import('../src/engine/payload')
  const { deriveResults } = await import('../src/engine/results')
  const { CALIBRATION } = await import('../src/data/calibration')
  const { CATALOGUE } = await import('../src/data/archetypes')
  const ans = shotAnswers(process.argv[2], Number(process.argv[3] ?? 4))
  const items = itemsForMode(SHOT_MODE)
  const prof = computeProfile(items, ans, CALIBRATION)
  const r = deriveResults(profileToPayload(prof, { catalogue: 1, mode: SHOT_MODE, input: 'grid' }), CATALOGUE, CALIBRATION)
  console.log(r.hero.kind, r.matchesIdeal.map(m => `${m.arch.slug} ${m.d.toFixed(3)}`))
  for (const it of items) console.log(it.id, ans[it.id]?.i, ans[it.id]?.n, it.text.slice(0, 80))
}

/**
 * Seeded calibration of every threshold in 12 Axes² (spec §4.9).
 * Writes src/data/calibration.json; tests re-check the criteria on a smaller run.
 *
 *   pnpm tsx scripts/calibrate.ts [--draws N]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { AXIS_IDS, MODES, type Answer, type Answers, type AxisId, type Item, type Mode } from '../src/engine/types'
import { computeProfile, gapAxis, groupByAxis, inconsistencyIndex, realityGap } from '../src/engine/score'
import { profileToPayload } from '../src/engine/payload'
import { deriveResults } from '../src/engine/results'
import { distance, type Archetype } from '../src/engine/match'
import { mulberry32 } from '../src/engine/prng'
import { MODEL, archetypeSheet, latentSheet, quantile, randomAnswers, respond, type Sheets } from './sim'
import type { Calibration } from '../src/engine/calibration'
import { ALL_ITEMS, itemsForMode } from '../src/data/items'

const args = process.argv.slice(2)
const DRAWS = Number(args[args.indexOf('--draws') + 1]) || 4000
const OUT = 'src/data/calibration.json'

const FAMILY_FALSE_ALARM = 0.1
const PER_AXIS_ALPHA = 1 - (1 - FAMILY_FALSE_ALARM) ** (1 / 12)

// ---------- inputs ----------
const catPath = 'content/archetypes/archetypes.json'
const sheetsPath = 'content/archetypes/sheets.json'
const cat = JSON.parse(readFileSync(catPath, 'utf8')) as { version: number; archetypes: Archetype[] }
const archetypes = cat.archetypes
let sheets: Sheets
if (existsSync(sheetsPath)) sheets = JSON.parse(readFileSync(sheetsPath, 'utf8')) as Sheets
else {
  // Placeholder catalogue: synthesise sheets from vectors so the pipeline runs.
  sheets = {}
  for (const a of archetypes) {
    sheets[a.slug] = {}
    for (const it of ALL_ITEMS) {
      const k = AXIS_IDS.indexOf(it.axis)
      sheets[a.slug]![it.id] = [Math.round((it.key * a.ideal[k]!) / (100 / 3)), Math.round((it.key * a.now[k]!) / (100 / 3))]
    }
  }
}

const rng = mulberry32(0x12a2)
const byAxisAll = groupByAxis(ALL_ITEMS)
const report: Record<string, unknown> = {}

// ---------- τ_G per paired-item count ----------
const tauG: Record<string, number> = {}
for (let n = 3; n <= 10; n++) {
  let worst = 0
  for (const p of MODEL.copyRates) {
    const stats: number[] = []
    const pool = byAxisAll.fed // any axis: structure is identical
    for (let d = 0; d < DRAWS * 5; d++) {
      // Pick n items with keys as balanced as possible.
      const plus = pool.filter(i => i.key === 1).slice(0, Math.ceil(n / 2))
      const minus = pool.filter(i => i.key === -1).slice(0, Math.floor(n / 2))
      const chosen = [...plus, ...minus]
      const sheet = latentSheet(rng, chosen)
      const ans = respond(rng, chosen, sheet, { p, pass: 0, noGap: true })
      const g = gapAxis(chosen, ans, { tauG: { [String(n)]: 0 } } as unknown as Calibration)
      stats.push(g.g !== null && g.agree >= 2 ? Math.abs(g.g) : 0)
    }
    worst = Math.max(worst, quantile(stats, 1 - PER_AXIS_ALPHA))
  }
  tauG[String(n)] = Math.ceil(worst + 0.5)
}
report.perAxisAlpha = PER_AXIS_ALPHA

// ---------- careless threshold (inconsistency index), per mean answers per axis ----------
const honestIdx: Record<number, number[]> = {}
const randomIdx: Record<number, number[]> = {}
const bucket = (answers: Answers, items: readonly Item[]) => {
  let c = 0
  for (const it of items) {
    const a = answers[it.id]
    if (a?.i !== null && a?.i !== undefined) c++
    if (a?.n !== null && a?.n !== undefined) c++
  }
  return Math.max(3, Math.min(10, Math.round(c / 24)))
}
for (const mode of MODES) {
  const items = itemsForMode(mode)
  const byAxis = groupByAxis(items)
  for (const pass of MODEL.passRates) {
    for (let d = 0; d < DRAWS / 2; d++) {
      const useArch = d % 2 === 1
      const a = archetypes[d % archetypes.length]!
      const sheet = useArch ? archetypeSheet(rng, items, sheets[a.slug]!, 'both') : latentSheet(rng, items)
      const ans = respond(rng, items, sheet, { p: MODEL.copyRates[d % 3]!, pass })
      ;(honestIdx[bucket(ans, items)] ??= []).push(inconsistencyIndex(ans, byAxis) ?? 0)
      const rnd = randomAnswers(rng, items, pass)
      ;(randomIdx[bucket(rnd, items)] ??= []).push(inconsistencyIndex(rnd, byAxis) ?? 0)
    }
  }
}
const careless: Record<string, number> = {}
const carelessDetection: Record<string, number> = {}
const carelessFalseFlag: Record<string, number> = {}
const buckets = Object.keys(honestIdx).map(Number).sort((a, b) => a - b)
for (let n = 3; n <= 10; n++) {
  const b = buckets.reduce((best, x) => (Math.abs(x - n) < Math.abs(best - n) ? x : best), buckets[0]!)
  // At least the honest 95th percentile, but as lenient as possible while still catching 90% of
  // random clickers: real respondents are messier than the simulation, so err toward not flagging them.
  const honest95 = quantile(honestIdx[b]!, 0.95)
  const random10 = randomIdx[b]?.length ? quantile(randomIdx[b]!, 0.1) : honest95
  const t = Math.max(honest95, random10)
  careless[String(n)] = Number(t.toFixed(3))
  const rnd = randomIdx[b] ?? []
  carelessDetection[String(n)] = rnd.length ? rnd.filter(x => x > t).length / rnd.length : NaN
  carelessFalseFlag[String(n)] = honestIdx[b]!.filter(x => x > t).length / honestIdx[b]!.length
}
report.carelessDetection = carelessDetection
report.carelessFalseFlag = carelessFalseFlag

// ---------- Reality Gap bands ----------
const rgNoGap: number[] = []
const rgRandom: number[] = []
for (const mode of MODES) {
  const items = itemsForMode(mode)
  for (let d = 0; d < DRAWS / 2; d++) {
    const sheet = latentSheet(rng, items)
    rgNoGap.push(realityGap(items, respond(rng, items, sheet, { p: MODEL.copyRates[d % 3]!, pass: 0, noGap: true })).rg!)
    rgRandom.push(realityGap(items, randomAnswers(rng, items)).rg!)
  }
}
const c1 = quantile(rgNoGap, 0.9)
const c3 = quantile(rgRandom, 0.05)
const rgCuts: [number, number, number] = [Math.ceil(c1), Math.round((c1 + c3) / 2), Math.floor(c3)]
report.rgNoGapMedian = Number(quantile(rgNoGap, 0.5).toFixed(1))
report.rgNoGapP0 = (() => {
  const xs: number[] = []
  const items = itemsForMode('standard')
  for (let d = 0; d < DRAWS / 2; d++) xs.push(realityGap(items, respond(rng, items, latentSheet(rng, items), { p: 0, pass: 0, noGap: true })).rg!)
  return Number(quantile(xs, 0.5).toFixed(1))
})()

// ---------- Match label cuts: distance of simulated sincere adherents to their own archetype ----------
const labels = {} as Calibration['labels']
for (const mode of MODES) {
  const items = itemsForMode(mode)
  const ds: number[] = []
  for (let d = 0; d < DRAWS; d++) {
    const a = archetypes[d % archetypes.length]!
    const sheet = archetypeSheet(rng, items, sheets[a.slug]!, 'ideal')
    const ans = respond(rng, items, sheet, { p: 0.5, pass: MODEL.passRates[d % 3]! })
    const prof = computeProfile(items, ans, { tauG: tauG, careless: { 3: 99 } } as unknown as Calibration)
    const u = AXIS_IDS.map(ax => prof.I[ax].score)
    ds.push(distance(u, a.ideal, a.weight))
  }
  labels[mode] = {
    veryClose: Number(quantile(ds, 0.5).toFixed(4)),
    close: Number(quantile(ds, 0.8).toFixed(4)),
    loose: Number(quantile(ds, 0.95).toFixed(4)),
  }
}

// ---------- μ: headline split margin ----------
const provisional: Calibration = { version: 1, tauG, mu: 0, rgCuts, careless, labels }
const margins: number[] = []
const noGapProfiles: { mode: Mode; ans: Answers; items: Item[] }[] = []
for (let d = 0; d < Math.min(DRAWS, 3000); d++) {
  const mode = MODES[d % 3]!
  const items = itemsForMode(mode)
  const a = archetypes[d % archetypes.length]!
  const sheet = d % 2 ? archetypeSheet(rng, items, sheets[a.slug]!, 'ideal') : latentSheet(rng, items)
  const ans = respond(rng, items, sheet, { p: MODEL.copyRates[d % 3]!, pass: MODEL.passRates[(d >> 1) % 3]!, noGap: true })
  noGapProfiles.push({ mode, ans, items })
  const prof = computeProfile(items, ans, provisional)
  const uI = AXIS_IDS.map(ax => prof.I[ax].score)
  const uN = AXIS_IDS.map(ax => prof.N[ax].score)
  const topI = [...archetypes].sort((x, y) => distance(uI, x.ideal, x.weight) - distance(uI, y.ideal, y.weight))[0]!
  const topN = [...archetypes].sort((x, y) => distance(uN, x.ideal, x.weight) - distance(uN, y.ideal, y.weight))[0]!
  margins.push(topI.slug === topN.slug ? 0 : distance(uN, topI.ideal, topI.weight) - distance(uN, topN.ideal, topN.weight))
}
const mu = Number(Math.max(0.005, quantile(margins, 0.95)).toFixed(4))
const cal: Calibration = { version: 1, tauG, mu, rgCuts, careless, labels }

// ---------- End-to-end checks with the real pipeline ----------
let falseSplit = 0
let anyNotable = 0
let n = 0
for (const { mode, ans, items } of noGapProfiles) {
  const prof = computeProfile(items, ans, cal)
  const payload = profileToPayload(prof, { catalogue: cat.version, mode, input: 'grid' })
  const r = deriveResults(payload, archetypes, cal)
  if (r.hero.kind === 'split') falseSplit++
  if (AXIS_IDS.some(ax => prof.gaps[ax].notable)) anyNotable++
  n++
}
report.splitFalseRate = Number((falseSplit / n).toFixed(4))
report.anyNotableFalseRate = Number((anyNotable / n).toFixed(4))

// Power: true keyed shift on one axis.
const power: Record<string, Record<string, number>> = {}
for (const shift of [1, 2]) {
  const row: Record<string, number> = {}
  for (const mode of MODES) {
    const items = itemsForMode(mode)
    let hit = 0
    const T = DRAWS / 4
    for (let d = 0; d < T; d++) {
      const ax = AXIS_IDS[d % 12]!
      const sheet = latentSheet(rng, items)
      const ans = respond(rng, items, sheet, { p: 0.5, pass: 0, gapAxes: { [ax]: d % 2 ? shift : -shift } })
      const prof = computeProfile(items, ans, cal)
      if (prof.gaps[ax].notable) hit++
    }
    row[mode] = Number((hit / T).toFixed(3))
  }
  power[`${shift} point${shift > 1 ? 's' : ''} (${Math.round((100 / 3) * shift)} on the axis scale)`] = row
}
report.power = power

// Random clickers: how often they still get a headline (should be rare thanks to the careless flag).
let rndHero = 0
const RT = 600
for (let d = 0; d < RT; d++) {
  const mode = MODES[d % 3]!
  const items = itemsForMode(mode)
  const prof = computeProfile(items, randomAnswers(rng, items), cal)
  const r = deriveResults(profileToPayload(prof, { catalogue: cat.version, mode, input: 'grid' }), archetypes, cal)
  if (r.hero.kind === 'split' || r.hero.kind === 'constant') rndHero++
}
report.randomGetsHeadline = Number((rndHero / RT).toFixed(3))
report.model = MODEL
report.draws = DRAWS
report.generated = process.env.CAL_DATE ?? new Date().toISOString().slice(0, 10)
report.catalogueVersion = cat.version
report.note = existsSync(sheetsPath)
  ? 'Archetype-anchored respondents use the coders’ median answer sheets.'
  : 'PROVISIONAL: placeholder catalogue; archetype-anchored respondents use synthetic sheets.'

writeFileSync(OUT, JSON.stringify({ ...cal, report }, null, 1) + '\n')
console.log(JSON.stringify({ ...cal, report }, null, 1))

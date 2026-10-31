/**
 * Audits core commitments against simulated sincere adherents (the calibration respondent model,
 * coders' sheets in both frames) at every test length. Prints each length's false rule-out rate
 * and every commitment whose own false rule-out rate exceeds the limit on any length, then the
 * effect on typical respondents and random clickers. Writes nothing unless --write, which moves
 * those commitments into the file's `dropped` list (with their worst rate).
 *
 *   pnpm tsx scripts/commitments-audit.ts [--draws N] [--write]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { mulberry32 } from '../src/engine/prng'
import { checkCommitment, validateCommitments, type CommitmentsFile, type DroppedCommitment } from '../src/engine/commitments'
import { ALL_ITEMS, itemsForMode } from '../src/data/items'
import { MODEL, archetypeSheet, falseRuleOuts, latentSheet, randomAnswers, respond, type Sheets } from './sim'
import { checkArchetype } from '../src/engine/commitments'
import { computeProfile } from '../src/engine/score'
import { rank } from '../src/engine/match'
import { AXIS_IDS, MODES, type Mode } from '../src/engine/types'
import { CATALOGUE } from '../src/data/archetypes'
import { CALIBRATION } from '../src/data/calibration'

const args = process.argv.slice(2)
const DRAWS = Number(args[args.indexOf('--draws') + 1]) || 2000
const WRITE = args.includes('--write')
// Sensitivity only (never with --write): noisier answers and bigger per-person axis shifts.
const STRESS = args.includes('--stress')
if (STRESS) Object.assign(MODEL, { noiseSd: 1.2, personAxisSd: 0.8 })
const LIMIT = 0.02
const PATH = 'content/archetypes/commitments.json'

const file = JSON.parse(readFileSync(PATH, 'utf8')) as CommitmentsFile
const slugs = (JSON.parse(readFileSync('content/archetypes/archetypes.json', 'utf8')) as { archetypes: { slug: string }[] }).archetypes.map(a => a.slug)
const book = validateCommitments(file, ALL_ITEMS, slugs)
const sheets = JSON.parse(readFileSync('content/archetypes/sheets.json', 'utf8')) as Sheets

// Own seeded stream: independent of scripts/calibrate.ts.
const rng = mulberry32(0xa0d17)
const over: DroppedCommitment[] = []
/** Per length: share of each ideology's simulated adherents ruled out of it. */
const perArch = {} as Record<Mode, Record<string, number>>
/** Per commitment: worst false rule-out rate over the three lengths, and where. */
const worstC = new Map<string, { rate: number; mode: Mode }>()
for (const mode of MODES) {
  const items = itemsForMode(mode)
  const asked = new Set(items.map(i => i.id))
  perArch[mode] = {}
  for (const slug of slugs) {
    const list = book[slug] ?? []
    if (!list.length) continue
    // Each failing commitment is credited with the rule-out it causes (several can share one).
    const fails = list.map(() => 0)
    let any = 0
    for (let d = 0; d < DRAWS; d++) {
      const sheet = archetypeSheet(rng, items, sheets[slug]!, 'both')
      const ans = respond(rng, items, sheet, { p: MODEL.copyRates[d % 3]!, pass: MODEL.passRates[(d >> 1) % 3]! })
      let out = false
      list.forEach((c, k) => {
        if (checkCommitment(c, ans, asked).verdict === 'fail') {
          fails[k]!++
          out = true
        }
      })
      if (out) any++
    }
    perArch[mode][slug] = any / DRAWS
    list.forEach((c, k) => {
      const key = `${slug}/${c.item}`
      const rate = fails[k]! / DRAWS
      if (rate > (worstC.get(key)?.rate ?? -1)) worstC.set(key, { rate, mode })
    })
  }
}
for (const slug of slugs)
  for (const c of book[slug] ?? []) {
    const w = worstC.get(`${slug}/${c.item}`)!
    if (w.rate > LIMIT) over.push({ slug, ...c, falseRuleOut: Number(w.rate.toFixed(4)) })
  }

const total = Object.keys(perArch.full).length
const kept = Object.values(book).reduce((n, l) => n + l.length, 0)
console.log(`${STRESS ? 'STRESS model ' + JSON.stringify(MODEL) + '; ' : ''}${DRAWS} adherents per ideology per length, ${total} ideologies, ${kept} commitments`)
for (const mode of MODES) {
  const rates = Object.values(perArch[mode])
  const mean = rates.reduce((a, b) => a + b, 0) / Math.max(1, rates.length)
  const worst = Object.entries(perArch[mode]).sort((a, b) => b[1] - a[1]).slice(0, 3)
  console.log(`  ${mode}: false rule-out ${(100 * mean).toFixed(3)}% (mean over ideologies); worst ${worst.map(([s, r]) => `${s} ${(100 * r).toFixed(2)}%`).join(', ')}`)
}
const topC = [...worstC.entries()].sort((a, b) => b[1].rate - a[1].rate).slice(0, 5)
console.log('  worst commitments:', topC.map(([k, w]) => `${k} ${(100 * w.rate).toFixed(2)}% (${w.mode})`).join(', '))
const fro = falseRuleOuts(mulberry32(0xc0332), sheets, book, 200)
if (fro) console.log('falseRuleOuts (calibration report function, 200/ideology):', JSON.stringify(fro.byMode))
console.log(`commitments over ${100 * LIMIT}% on any length: ${over.length}`)
for (const o of over) console.log(`  ${o.slug} ${o.item} ${o.frame} side ${o.side}: ${(100 * o.falseRuleOut).toFixed(2)}%`)

// Impact on everyone else: latent (non-adherent) respondents from the calibration model.
{
  const r2 = mulberry32(0x1a7e)
  let topOut = 0
  let outSum = 0
  let n = 0
  for (const mode of MODES) {
    const its = itemsForMode(mode)
    const ask = new Set(its.map(i => i.id))
    for (let d = 0; d < 300; d++) {
      const ans = respond(r2, its, latentSheet(r2, its), { p: 0.5, pass: 0.1 })
      const out = new Set(slugs.filter(s => checkArchetype(s, book, ans, ask).all === 'fail'))
      const prof = computeProfile(its, ans, CALIBRATION)
      const top = rank(AXIS_IDS.map(a => prof.I[a].score), CATALOGUE, 'ideal')[0]!.arch.slug
      if (out.has(top)) topOut++
      outSum += out.size
      n++
    }
  }
  console.log(`latent respondents (${n}, all lengths): nearest ideal match ruled out ${(100 * topOut / n).toFixed(1)}%; mean ideologies ruled out ${(outSum / n).toFixed(1)} of ${slugs.length}`)
}

// Random clickers: how often every ideology with commitments is ruled out (before and after the careless gate).
{
  const r3 = mulberry32(0x7a2d)
  const listed = slugs.filter(s => (book[s] ?? []).length > 0)
  let allOut = 0
  let allOutShown = 0
  let maxOut = 0
  let outSum = 0
  let n = 0
  for (const mode of MODES) {
    const its = itemsForMode(mode)
    const ask = new Set(its.map(i => i.id))
    for (let d = 0; d < 300; d++) {
      const ans = randomAnswers(r3, its)
      const out = listed.filter(s => checkArchetype(s, book, ans, ask).all === 'fail').length
      outSum += out
      maxOut = Math.max(maxOut, out)
      if (out === listed.length) {
        allOut++
        if (!computeProfile(its, ans, CALIBRATION).careless) allOutShown++
      }
      n++
    }
  }
  console.log(`random clickers (${n}, all lengths): everything ruled out ${(100 * allOut / n).toFixed(1)}% (${(100 * allOutShown / n).toFixed(1)}% not flagged careless, so shown); mean ruled out ${(outSum / n).toFixed(1)} of ${listed.length}, most ${maxOut}`)
}

if (WRITE && STRESS) throw new Error('--stress is a sensitivity check; it never writes')
if (WRITE && over.length) {
  const key = (s: string, item: string) => `${s}/${item}`
  const drop = new Set(over.map(o => key(o.slug, o.item)))
  for (const [slug, list] of Object.entries(file.commitments)) file.commitments[slug] = list.filter(c => !drop.has(key(slug, c.item)))
  file.dropped = [...(file.dropped ?? []), ...over]
  writeFileSync(PATH, JSON.stringify(file, null, 1) + '\n')
  console.log(`moved ${over.length} to dropped in ${PATH}`)
}

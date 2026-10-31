/**
 * Audits core commitments against simulated sincere adherents (the calibration respondent model,
 * coders' sheets in both frames) on the full-length test, where every commitment is asked.
 * Prints each ideology's false rule-out rate and every commitment over the limit. With --write,
 * moves those commitments into the file's `dropped` list (with their rates).
 *
 *   pnpm tsx scripts/commitments-audit.ts [--draws N] [--write]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { mulberry32 } from '../src/engine/prng'
import { checkCommitment, validateCommitments, type CommitmentsFile, type DroppedCommitment } from '../src/engine/commitments'
import { ALL_ITEMS, itemsForMode } from '../src/data/items'
import { MODEL, archetypeSheet, falseRuleOuts, latentSheet, respond, type Sheets } from './sim'
import { checkArchetype } from '../src/engine/commitments'
import { computeProfile } from '../src/engine/score'
import { rank } from '../src/engine/match'
import { AXIS_IDS, MODES } from '../src/engine/types'
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
const items = itemsForMode('full')
const asked = new Set(items.map(i => i.id))
const over: DroppedCommitment[] = []
const perArch: Record<string, number> = {}
for (const slug of slugs) {
  const list = book[slug] ?? []
  if (!list.length) continue
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
  perArch[slug] = any / DRAWS
  list.forEach((c, k) => {
    const rate = fails[k]! / DRAWS
    if (rate > LIMIT) over.push({ slug, ...c, falseRuleOut: Number(rate.toFixed(4)) })
  })
}

const total = Object.keys(perArch).length
const mean = Object.values(perArch).reduce((a, b) => a + b, 0) / Math.max(1, total)
console.log(`${STRESS ? 'STRESS model ' + JSON.stringify(MODEL) + '; ' : ''}full test, ${DRAWS} adherents per ideology, ${total} ideologies with commitments`)
console.log(`overall false rule-out (mean over ideologies): ${(100 * mean).toFixed(2)}%`)
const worst = Object.entries(perArch).sort((a, b) => b[1] - a[1]).slice(0, 10)
console.log('worst ideologies:', worst.map(([s, r]) => `${s} ${(100 * r).toFixed(1)}%`).join(', '))
const fro = falseRuleOuts(mulberry32(0xc0332), sheets, book, 200)
if (fro) console.log('falseRuleOuts (calibration report function, 200/ideology):', JSON.stringify(fro.byMode))
console.log(`commitments over ${100 * LIMIT}%: ${over.length}`)
for (const o of over) console.log(`  ${o.slug} ${o.item} ${o.frame} side ${o.side}: ${(100 * o.falseRuleOut).toFixed(1)}%`)

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

if (WRITE && STRESS) throw new Error('--stress is a sensitivity check; it never writes')
if (WRITE && over.length) {
  const key = (s: string, item: string) => `${s}/${item}`
  const drop = new Set(over.map(o => key(o.slug, o.item)))
  for (const [slug, list] of Object.entries(file.commitments)) file.commitments[slug] = list.filter(c => !drop.has(key(slug, c.item)))
  file.dropped = [...(file.dropped ?? []), ...over]
  writeFileSync(PATH, JSON.stringify(file, null, 1) + '\n')
  console.log(`moved ${over.length} to dropped in ${PATH}`)
}

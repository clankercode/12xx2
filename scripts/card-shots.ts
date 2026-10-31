/**
 * Visual check of the canvas share cards: draws the post, story and wide cards for one simulated
 * respondent, plus the comparison card for a pair, straight from the source modules.
 * Usage: pnpm tsx scripts/card-shots.ts [baseURL] [outDir]  → <outDir>/card-<size>.png, compare-card-<size>.png
 */
import { chromium } from '@playwright/test'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { computeProfile } from '../src/engine/score'
import { profileToPayload } from '../src/engine/payload'
import { mulberry32 } from '../src/engine/prng'
import { itemsForMode } from '../src/data/items'
import { CALIBRATION } from '../src/data/calibration'
import { archetypeSheet, respond, type Sheets } from './sim'

const base = process.argv[2] ?? 'http://localhost:21313/'
const out = process.argv[3] ?? 'shots/cards'
mkdirSync(out, { recursive: true })
const sheets = JSON.parse(readFileSync('content/archetypes/sheets.json', 'utf8')) as Sheets

function payload(slug: string, seed: number) {
  const rng = mulberry32(seed)
  const items = itemsForMode('standard')
  const ans = respond(rng, items, archetypeSheet(rng, items, sheets[slug]!, 'both'), { p: 0.5, pass: 0.05 })
  return profileToPayload(computeProfile(items, ans, CALIBRATION), { catalogue: 1, mode: 'standard', input: 'grid' })
}
const a = payload('social-democracy', 11)
const b = payload('classical-liberalism', 32)

const browser = await chromium.launch({ executablePath: existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined })
const page = await browser.newPage()
page.on('pageerror', e => console.error('pageerror', e.message))
await page.goto(base)
for (const size of ['post', 'story', 'wide'] as const) {
  // Passed as a string: tsx's injected __name helper doesn't exist in the page.
  const data = (await page.evaluate(`(async ([size, a, b]) => {
    const { drawCard, ensureFonts, cardBlob } = await import('/src/share/card.ts')
    const { drawCompareCard } = await import('/src/share/compareCard.ts')
    const { deriveResults } = await import('/src/engine/results.ts')
    const { compareResults } = await import('/src/engine/compare.ts')
    const { CATALOGUE } = await import('/src/data/archetypes.ts')
    const { CALIBRATION } = await import('/src/data/calibration.ts')
    await ensureFonts()
    const ra = deriveResults(a, CATALOGUE, CALIBRATION)
    const rb = deriveResults(b, CATALOGUE, CALIBRATION)
    const host = '12axes-squared.netlify.app'
    const one = document.createElement('canvas')
    drawCard(one, ra, { size, minimal: false, showSc: false, showCountry: false, allowSensitive: false, host })
    const two = document.createElement('canvas')
    drawCompareCard(two, ra, rb, compareResults(a, b), { size, names: ['Sam', 'Alex'], host })
    const bytes = async c => Array.from(new Uint8Array(await (await cardBlob(c)).arrayBuffer()))
    return [await bytes(one), await bytes(two)]
  })(${JSON.stringify([size, a, b])})`)) as [number[], number[]]
  writeFileSync(`${out}/card-${size}.png`, Buffer.from(data[0]))
  writeFileSync(`${out}/compare-card-${size}.png`, Buffer.from(data[1]))
}
await browser.close()
console.log(`card shots written to ${out}/`)

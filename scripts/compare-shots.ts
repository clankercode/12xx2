/**
 * Visual check for the comparison page and card: builds share links for simulated
 * adherents of two ideologies, opens the compare view, and saves the page plus each card size.
 * Usage: pnpm tsx scripts/compare-shots.ts [baseURL] [outDir]
 */
import { chromium } from '@playwright/test'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { computeProfile } from '../src/engine/score'
import { encodePayload, forSharing, profileToPayload } from '../src/engine/payload'
import { mulberry32 } from '../src/engine/prng'
import { itemsForMode } from '../src/data/items'
import { CALIBRATION } from '../src/data/calibration'
import { archetypeSheet, respond, type Sheets } from './sim'

const base = process.argv[2] ?? 'http://localhost:21313/'
const out = process.argv[3] ?? 'shots'
mkdirSync(out, { recursive: true })
const sheets = JSON.parse(readFileSync('content/archetypes/sheets.json', 'utf8')) as Sheets

function link(slug: string, seed: number, country?: string): string {
  const rng = mulberry32(seed)
  const items = itemsForMode('standard')
  const ans = respond(rng, items, archetypeSheet(rng, items, sheets[slug]!, 'both'), { p: 0.5, pass: 0.05 })
  const p = { ...profileToPayload(computeProfile(items, ans, CALIBRATION), { catalogue: 1, mode: 'standard', input: 'grid' }), country }
  return encodePayload(forSharing(p, { q: false, sc: false, country: !!country }))
}

const pairs: [string, string, string][] = [
  ['far', link('social-democracy', 11), link('anarcho-capitalism', 12)],
  ['near', link('social-liberalism', 21), link('progressive-liberalism', 22)],
  ['countries', link('christian-democracy', 31, 'DE'), link('classical-liberalism', 32, 'AU')],
]

const browser = await chromium.launch({ executablePath: existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined })
for (const [name, a, b] of pairs) {
  for (const [vp, viewport] of [
    ['desktop', { width: 1280, height: 900 }],
    ['mobile', { width: 375, height: 812 }],
  ] as const) {
    const ctx = await browser.newContext({ viewport, colorScheme: 'dark' })
    const page = await ctx.newPage()
    page.on('pageerror', e => console.error('pageerror', e.message))
    await page.goto(`${base}#c=${a}~${b}`)
    await page.locator('img[alt^="Comparison card"]').waitFor()
    await page.screenshot({ path: `${out}/compare-${name}-${vp}.png`, fullPage: true })
    if (vp === 'mobile') {
      await ctx.close()
      continue
    }
    for (const size of ['post', 'story', 'wide'] as const) {
      await page.locator(`input[name="compare-card-size"][value="${size}"]`).check({ force: true })
      await page.waitForTimeout(400)
      const img = page.locator('img[alt^="Comparison card"]')
      await img.waitFor()
      const data = await img.evaluate(async el => {
        const blob = await (await fetch((el as HTMLImageElement).src)).blob()
        return Array.from(new Uint8Array(await blob.arrayBuffer()))
      })
      writeFileSync(`${out}/compare-card-${name}-${size}.png`, Buffer.from(data))
    }
    await ctx.close()
  }
}
// Stress cases: longest ideology names on both sides, 16-character names, far-apart scores (two-digit counts).
{
  const ctx = await browser.newContext({ colorScheme: 'dark' })
  const page = await ctx.newPage()
  page.on('pageerror', e => console.error('pageerror', e.message))
  await page.goto(base)
  for (const size of ['post', 'story', 'wide'] as const) {
    // Passed as a string: tsx's injected __name helper doesn't exist in the page.
    const data = (await page.evaluate(`(async (size) => {
      const card = await import('/src/share/compareCard.ts')
      const { compareResults } = await import('/src/engine/compare.ts')
      const { ensureFonts, cardBlob } = await import('/src/share/card.ts')
      await ensureFonts()
      const v = f => Array.from({ length: 12 }, (_, k) => f(k))
      const payload = (I, N) => ({ format: 1, catalogue: 1, mode: 'full', input: 'grid', careless: false, answered: 120, total: 120,
        I, N, seI: v(() => 7), seN: v(() => 7), G: v(k => N[k] - I[k]), notable: v(() => false), rg: 10 })
      const pick = name => ({ match: { arch: { name, slug: 'x', sensitive: false }, label: 'close' }, stability: { label: 'stable' } })
      const res = (p, a, b) => ({ payload: p, hero: { kind: 'split', ideal: pick(a), now: pick(b) } })
      const pa = payload(v(k => (k % 2 ? 90 : -90)), v(k => (k % 3 ? 80 : -100)))
      const pb = payload(v(k => (k % 2 ? -85 : 95)), v(k => (k === 4 ? 80 : 100 - k * 15)))
      const c = document.createElement('canvas')
      card.drawCompareCard(c, res(pa, 'Libertarian municipalism (Communalism)', 'Traditional (Burkean) conservatism'),
        res(pb, 'Techno-progressive transhumanism', 'Developmental authoritarianism'), compareResults(pa, pb),
        { size, names: ['WWWWWWWWWWWWWWWW', 'Alexandra Louise'], host: '12axes-squared.netlify.app' })
      return Array.from(new Uint8Array(await (await cardBlob(c)).arrayBuffer()))
    })(${JSON.stringify(size)})`)) as number[]
    writeFileSync(`${out}/compare-card-stress-${size}.png`, Buffer.from(data))
  }
  await ctx.close()
}
await browser.close()
console.log(`compare shots written to ${out}/`)

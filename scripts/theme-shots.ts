/**
 * Visual check of every page in both colour schemes: drives one quiz per viewport, then
 * screenshots each state with prefers-color-scheme light and dark (theme left on "System").
 * Usage: pnpm tsx scripts/theme-shots.ts [baseURL] [outDir]  → <outDir>/<scheme>/<viewport>-NN-name.png
 */
import { chromium, type Page } from '@playwright/test'
import { existsSync, mkdirSync } from 'node:fs'
import { orderedItems, itemsForMode } from '../src/data/items'
import { computeProfile } from '../src/engine/score'
import { encodePayload, forSharing, profileToPayload } from '../src/engine/payload'
import { mulberry32 } from '../src/engine/prng'
import { CALIBRATION } from '../src/data/calibration'
import { readFileSync } from 'node:fs'
import { archetypeSheet, respond, type Sheets } from './sim'
import type { AxisId } from '../src/engine/types'

const base = process.argv[2] ?? 'http://localhost:21313/'
const out = process.argv[3] ?? 'shots/theme'
const only = process.argv[4] // optional viewport filter
const schemes = ['light', 'dark'] as const
for (const s of schemes) mkdirSync(`${out}/${s}`, { recursive: true })

const sheets = JSON.parse(readFileSync('content/archetypes/sheets.json', 'utf8')) as Sheets
function shareLink(slug: string, seed: number, country?: string): string {
  const rng = mulberry32(seed)
  const items = itemsForMode('standard')
  const ans = respond(rng, items, archetypeSheet(rng, items, sheets[slug]!, 'both'), { p: 0.5, pass: 0.05 })
  const p = { ...profileToPayload(computeProfile(items, ans, CALIBRATION), { catalogue: 1, mode: 'standard', input: 'grid' }), country }
  return encodePayload(forSharing(p, { q: false, sc: false, country: !!country }))
}

async function snap(page: Page, vp: string, name: string) {
  for (const s of schemes) {
    await page.emulateMedia({ colorScheme: s })
    // Full-page shots of a scrolled page paint the sticky header mid-page.
    await page.evaluate(() => (scrollTo(0, 0), document.fonts.ready))
    await page.waitForTimeout(150)
    await page.screenshot({ path: `${out}/${s}/${vp}-${name}.png`, fullPage: true })
  }
}

async function answerAll(page: Page, pick: (k: number) => [number, number]) {
  for (let k = 0; k < 200; k++) {
    if (!page.url().includes('#/quiz')) return
    const grid = page.locator('[role="grid"]').first()
    if (!(await grid.isVisible().catch(() => false))) return
    const [i, n] = pick(k)
    await grid.locator('[role="row"]').nth(3 - n).locator('[role="gridcell"]').nth(i + 3).click()
    // Next is always shown now; the reason chips are what a big split opens.
    const chips = page.getByRole('region', { name: 'Why the difference? (optional)' })
    if (await chips.isVisible().catch(() => false)) {
      if (k % 2 === 0) await page.getByRole('button', { name: 'Can’t trust those in charge' }).click()
      else await page.getByRole('button', { name: /^(Next statement|Continue)$/ }).click()
    }
    await page.waitForTimeout(330)
  }
}

const browser = await chromium.launch({ executablePath: existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined })
for (const [vp, viewport] of [
  ['desktop', { width: 1280, height: 900 }],
  ['mobile', { width: 390, height: 844 }],
] as const) {
  if (only && only !== vp) continue
  const ctx = await browser.newContext({ viewport, colorScheme: 'light', deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  page.on('pageerror', e => console.error('pageerror', e.message))
  await page.goto(base)
  await snap(page, vp, '01-landing')
  await page.getByRole('button', { name: /Quick/ }).click()
  await snap(page, vp, '02-intro')
  await page.getByRole('button', { name: 'Skip to the first statement' }).first().click()
  await snap(page, vp, '03-grid')
  const grid = page.locator('[role="grid"]').first()
  await grid.locator('[role="row"]').nth(1).locator('[role="gridcell"]').nth(5).click()
  await snap(page, vp, '03b-grid-picked')
  const leanI: Record<AxisId, number> = { fed: -1, dem: -2, lib: -1.5, col: 1, pla: 1.5, glo: -1, int: 0.5, mil: 1, mul: -0.5, rel: -2.5, pro: -1.5, tec: -1 }
  const leanN: Record<AxisId, number> = { ...leanI, col: -1.5, lib: 1 }
  const order = orderedItems('quick')
  const r = (x: number) => Math.max(-3, Math.min(3, Math.round(x)))
  await answerAll(page, k => {
    const it = order[k]!
    return [r(it.key * leanI[it.axis] + ((k * 7) % 3) - 1), r(it.key * leanN[it.axis] + ((k * 5) % 3) - 1)]
  })
  await snap(page, vp, '04-context')
  for (const id of ['sc-1', 'sc-2', 'sc-3', 'sc-4', 'sc-5', 'sc-6']) {
    await page.locator(`input[name="${id}"]`).nth(id.endsWith('1') || id.endsWith('3') || id.endsWith('5') ? 2 : 4).check({ force: true })
  }
  await page.locator('select').selectOption('AU')
  await page.getByRole('button', { name: 'Continue' }).click()
  const sliders = page.getByRole('slider')
  for (let i = 0; i < (await sliders.count()); i++) {
    const box = await sliders.nth(i).boundingBox()
    if (box) await page.mouse.click(box.x + box.width * (0.2 + 0.05 * i), box.y + box.height / 2)
  }
  await snap(page, vp, '05-place')
  await page.getByRole('button', { name: 'See my results' }).click()
  await page.waitForTimeout(900)
  await snap(page, vp, '06-results')
  await page.getByRole('button', { name: 'Share my result' }).click()
  await page.waitForTimeout(1500)
  await snap(page, vp, '07-share')
  const mine = (await page.getByLabel('Your result link').inputValue()).replace(/^.*#r=/, '')
  await page.goto(`${base}#r=${mine}`)
  await page.waitForTimeout(800)
  await snap(page, vp, '08-shared')
  await page.goto(`${base}#c=${shareLink('social-democracy', 11)}~${shareLink('anarcho-capitalism', 12, 'AU')}`)
  await page.locator('img[alt^="Comparison card"]').waitFor()
  await snap(page, vp, '09-compare')
  for (const [i, p] of ['method', 'criticisms', 'ideologies', 'privacy'].entries()) {
    await page.goto(`${base}#/${p}`)
    await page.waitForTimeout(300)
    await snap(page, vp, `${10 + i}-${p}`)
  }
  // A second, older run with shifted answers so the runs list and run-vs-run diff have content.
  const ids = await page.evaluate(() => {
    const h = JSON.parse(localStorage.getItem('12xx2.history.v1')!)
    const a = h.runs[0]
    const b = structuredClone(a)
    b.id = 'a1b2c3d4e5f60718'
    b.finishedAt = new Date(Date.parse(a.finishedAt) - 30 * 864e5).toISOString()
    for (const [k, v] of Object.entries(b.answers) as [string, { i: number | null; n: number | null }][]) {
      const shift = k.length % 3 === 0 ? 2 : k.length % 3 === 1 ? -1 : 0
      if (v.i !== null) v.i = Math.max(-3, Math.min(3, v.i + shift))
      if (v.n !== null) v.n = Math.max(-3, Math.min(3, v.n - shift))
    }
    h.runs.push(b)
    localStorage.setItem('12xx2.history.v1', JSON.stringify(h))
    return [a.id as string, b.id as string]
  })
  await page.goto(`${base}#/history`)
  await page.reload()
  await page.waitForTimeout(400)
  await snap(page, vp, '14-history')
  await page.goto(`${base}#/run/${ids[0]}`)
  await page.waitForTimeout(500)
  await snap(page, vp, '15-run')
  await page.goto(`${base}#/runs/${ids[1]}~${ids[0]}`)
  await page.waitForTimeout(500)
  await snap(page, vp, '16-runs-diff')
  await ctx.close()
}
await browser.close()
console.log('done')

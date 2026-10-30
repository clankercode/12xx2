/**
 * Quick visual check: drive the app through its main states and save screenshots.
 * Usage: pnpm tsx scripts/shots.ts [baseURL] [outDir]
 */
import { chromium, type Page } from '@playwright/test'
import { existsSync, mkdirSync } from 'node:fs'
import { orderedItems } from '../src/data/items'
import type { AxisId } from '../src/engine/types'

const base = process.argv[2] ?? 'http://localhost:21313/'
const out = process.argv[3] ?? 'shots'
mkdirSync(out, { recursive: true })

async function answerAll(page: Page, pick: (k: number) => [number, number]) {
  for (let k = 0; k < 200; k++) {
    if (!page.url().includes('#/quiz')) return
    const grid = page.locator('[role="grid"]').first()
    if (!(await grid.isVisible().catch(() => false))) return
    const [i, n] = pick(k)
    const row = 3 - n
    const col = i + 3
    await grid.locator('[role="row"]').nth(row).locator('[role="gridcell"]').nth(col).click()
    const next = page.getByRole('button', { name: 'Next statement' })
    if (await next.isVisible().catch(() => false)) {
      if (k % 2 === 0) await page.getByRole('button', { name: 'Can’t trust those in charge' }).click()
      else await next.click()
    }
    await page.waitForTimeout(330)
  }
}

const browser = await chromium.launch({ executablePath: existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined })
for (const [name, viewport] of [
  ['desktop', { width: 1280, height: 900 }],
  ['mobile', { width: 375, height: 812 }],
] as const) {
  const ctx = await browser.newContext({ viewport, colorScheme: 'dark', deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  page.on('pageerror', e => console.error('pageerror', e.message))
  await page.goto(base)
  await page.screenshot({ path: `${out}/${name}-01-landing.png`, fullPage: true })
  await page.getByRole('button', { name: /Quick/ }).click()
  await page.screenshot({ path: `${out}/${name}-02-intro.png`, fullPage: true })
  await page.getByRole('button', { name: 'Start the questions' }).click()
  await page.screenshot({ path: `${out}/${name}-03-grid.png`, fullPage: true })
  // A coherent respondent: a lean per axis; here and now differs on Ownership and Liberty vs security.
  const leanI: Record<AxisId, number> = { fed: -1, dem: -2, lib: -1.5, col: 1, pla: 1.5, glo: -1, int: 0.5, mil: 1, mul: -0.5, rel: -2.5, pro: -1.5, tec: -1 }
  const leanN: Record<AxisId, number> = { ...leanI, col: -1.5, lib: 1 }
  const order = orderedItems('quick')
  const r = (x: number) => Math.max(-3, Math.min(3, Math.round(x)))
  await answerAll(page, k => {
    const it = order[k]!
    return [r(it.key * leanI[it.axis] + ((k * 7) % 3) - 1), r(it.key * leanN[it.axis] + ((k * 5) % 3) - 1)]
  })
  await page.screenshot({ path: `${out}/${name}-04-context.png`, fullPage: true })
  for (const id of ['sc-1', 'sc-2', 'sc-3', 'sc-4', 'sc-5', 'sc-6']) {
    await page.locator(`input[name="${id}"]`).nth(id.endsWith('1') || id.endsWith('3') || id.endsWith('5') ? 2 : 4).check({ force: true })
  }
  await page.locator('select').selectOption('AU')
  await page.getByRole('button', { name: 'Continue' }).click()
  const sliders = page.getByRole('slider')
  const count = await sliders.count()
  for (let i = 0; i < count; i++) {
    const box = await sliders.nth(i).boundingBox()
    if (box) await page.mouse.click(box.x + box.width * (0.2 + 0.05 * i), box.y + box.height / 2)
  }
  await page.screenshot({ path: `${out}/${name}-05-place.png`, fullPage: true })
  await page.getByRole('button', { name: 'See my results' }).click()
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${out}/${name}-06-results.png`, fullPage: true })
  await page.getByRole('button', { name: 'Share my result' }).click()
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${out}/${name}-07-share.png`, fullPage: true })
  if (name === 'desktop') {
    for (const size of ['Post 4:5', 'Story 9:16', 'Wide']) {
      await page.getByRole('radio', { name: size }).check({ force: true })
      await page.waitForTimeout(600)
      const dl = page.waitForEvent('download')
      await page.getByRole('button', { name: 'Download PNG' }).click()
      await (await dl).saveAs(`${out}/card-${size.split(' ')[0]!.toLowerCase()}.png`)
    }
  }
  const link = await page.getByLabel('Your result link').inputValue()
  await page.goto(link.replace(/^https?:\/\/[^/]+\//, base))
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${out}/${name}-08-shared.png`, fullPage: true })
  await page.goto(`${base}#/method`)
  await page.screenshot({ path: `${out}/${name}-09-method.png`, fullPage: true })
  await ctx.close()
}
await browser.close()
console.log('done')

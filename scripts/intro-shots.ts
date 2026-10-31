/**
 * Visual check of the how-to steps shown before the first statement: picks Quick, then
 * screenshots every step at desktop and phone width in both colour schemes.
 * Usage: pnpm tsx scripts/intro-shots.ts [baseURL] [outDir]  → <outDir>/<viewport>-<scheme>-step-N.png
 */
import { chromium } from '@playwright/test'
import { existsSync, mkdirSync } from 'node:fs'

const base = process.argv[2] ?? 'http://localhost:21313/'
const out = process.argv[3] ?? 'shots/intro'
mkdirSync(out, { recursive: true })

const browser = await chromium.launch({ executablePath: existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined })
for (const [vp, viewport] of [
  ['desktop', { width: 1280, height: 900 }],
  ['phone', { width: 390, height: 844 }],
] as const) {
  for (const scheme of ['dark', 'light'] as const) {
    const page = await browser.newPage({ viewport, colorScheme: scheme })
    await page.goto(base)
    await page.getByRole('button', { name: /Quick/ }).click()
    for (let k = 1; k <= 6; k++) {
      await page.evaluate(() => (scrollTo(0, 0), document.fonts.ready))
      await page.waitForTimeout(200)
      await page.screenshot({ path: `${out}/${vp}-${scheme}-step-${k}.png`, fullPage: true })
      const grid = page.locator('[role="grid"]').first()
      if (await grid.isVisible().catch(() => false)) {
        await grid.locator('[role="row"]').nth(2).locator('[role="gridcell"]').nth(5).click()
        await page.mouse.move(0, 0)
        await page.screenshot({ path: `${out}/${vp}-${scheme}-step-${k}-tapped.png`, fullPage: true })
      }
      const next = page.getByRole('button', { name: /^Next/ })
      if (!(await next.isVisible().catch(() => false))) break
      await next.click()
    }
    await page.close()
  }
}
await browser.close()

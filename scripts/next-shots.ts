/**
 * Next button and auto-advance setting under the statement: grid and two-row modes, unanswered,
 * revisited (answered), and a big split with reason chips, at 1280 dark and 390 light.
 * Usage: pnpm tsx scripts/next-shots.ts [baseURL] [outDir]. Fails if any page scrolls sideways.
 */
import { chromium, type Page } from '@playwright/test'
import { existsSync, mkdirSync } from 'node:fs'

const base = process.argv[2] ?? 'http://localhost:21313/'
const out = process.argv[3] ?? 'shots/next'
mkdirSync(out, { recursive: true })

const cell = (page: Page, i: number, n: number) =>
  page.locator('[role="grid"]').first().locator('[role="row"]').nth(3 - n).locator('[role="gridcell"]').nth(i + 3)

const browser = await chromium.launch({ executablePath: existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined })
const wide: string[] = []
for (const [vp, viewport, scheme] of [
  ['1280-dark', { width: 1280, height: 900 }, 'dark'],
  ['390-light', { width: 390, height: 844 }, 'light'],
] as const) {
  const ctx = await browser.newContext({ viewport, colorScheme: scheme, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  const shot = async (name: string) => {
    await page.mouse.move(0, 0)
    await page.waitForTimeout(150)
    const sw = await page.evaluate(() => document.documentElement.scrollWidth)
    if (sw > viewport.width) wide.push(`${vp}-${name}: ${sw}px`)
    await page.screenshot({ path: `${out}/${vp}-${name}.png`, fullPage: true })
  }
  await page.goto(base)
  await page.getByRole('button', { name: /Quick/ }).click()
  await page.getByRole('button', { name: 'Skip to the first statement' }).first().click()
  await page.getByText(/^1 of \d+$/).waitFor()
  await shot('grid-unanswered')
  await cell(page, 1, 1).click()
  await page.getByText(/^2 of \d+$/).waitFor()
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await page.getByText(/^1 of \d+$/).waitFor()
  await shot('grid-revisited')
  await page.getByRole('button', { name: 'Next statement' }).click()
  await cell(page, 3, -1).click()
  await page.getByRole('region', { name: 'Why the difference? (optional)' }).waitFor()
  await shot('grid-chips')
  await page.getByRole('button', { name: 'Next statement' }).click()
  await page.getByText(/^3 of \d+$/).waitFor()
  await page.getByRole('button', { name: 'Use two rows instead of the grid' }).click()
  await shot('rows-unanswered')
  await page.getByRole('group', { name: 'In your ideal system' }).getByText('Agree', { exact: true }).click()
  await page.getByRole('group', { name: 'Here and now' }).getByText('Slightly agree').click()
  await page.getByText(/^4 of \d+$/).waitFor()
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await page.getByText(/^3 of \d+$/).waitFor()
  await page.getByRole('group', { name: 'In your ideal system' }).getByText('Disagree', { exact: true }).click()
  await shot('rows-revisited-edited')
  await page.getByLabel('Move to the next statement automatically').uncheck()
  await shot('rows-auto-off')
  await page.getByLabel('Move to the next statement automatically').check()
  await ctx.close()
}
await browser.close()
if (wide.length) {
  console.error(`Sideways scroll:\n${wide.join('\n')}`)
  process.exit(1)
}
console.log(`Saved to ${out}/`)

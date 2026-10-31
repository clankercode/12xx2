/**
 * Changing answers after the results: the results page with "Review and change my answers", the review
 * list, a statement being changed, the re-scored results with the Edited note, and the runs page, at
 * 1280 dark and 390 light. Usage: pnpm tsx scripts/edit-shots.ts [baseURL] [outDir]. Fails on sideways scroll.
 */
import { chromium, type Page } from '@playwright/test'
import { existsSync, mkdirSync } from 'node:fs'

const base = process.argv[2] ?? 'http://localhost:21313/'
const out = process.argv[3] ?? 'shots/edit'
mkdirSync(out, { recursive: true })

const cell = (page: Page, i: number, n: number) =>
  page.locator('[role="grid"]').first().locator('[role="row"]').nth(3 - n).locator('[role="gridcell"]').nth(i + 3)

async function finishQuick(page: Page) {
  await page.goto(base)
  await page.getByRole('button', { name: /Quick/ }).click()
  await page.getByRole('button', { name: 'Skip to the first statement' }).first().click()
  const total = Number((await page.getByText(/^1 of \d+$/).innerText()).split(' of ')[1])
  const redCard = page.getByRole('heading', { name: 'Red lines', exact: true })
  for (let k = 0; k < total; k++) {
    if (await redCard.isVisible().catch(() => false)) await page.getByRole('button', { name: 'Continue to the red lines' }).click()
    // Some passes and one-frame passes, so the list shows every compact form.
    if (k % 11 === 5) {
      await page.getByRole('button', { name: 'Pass', exact: true }).click()
    } else {
      const i = [2, -1, 3, -2, 1, 0, -3][k % 7]!
      const n = Math.max(-3, Math.min(3, i + (k % 4 === 0 ? -1 : 0)))
      await cell(page, i, n).click()
    }
    if (k < total - 1) await page.getByText(`${k + 2} of ${total}`, { exact: true }).or(redCard).waitFor()
  }
  await page.getByRole('heading', { name: 'How well does your system work by its own rules?' }).waitFor()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('heading', { name: 'Where is your country now?' }).waitFor()
  await page.getByRole('button', { name: 'See my results' }).click()
  await page.getByRole('region', { name: 'Headline result' }).waitFor()
}

const browser = await chromium.launch({ executablePath: existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined })
const wide: string[] = []
for (const [vp, viewport, scheme] of [
  ['1280-dark', { width: 1280, height: 900 }, 'dark'],
  ['390-light', { width: 390, height: 844 }, 'light'],
] as const) {
  const ctx = await browser.newContext({ viewport, colorScheme: scheme, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  const shot = async (name: string, fullPage = false) => {
    await page.mouse.move(0, 0)
    await page.waitForTimeout(200)
    const sw = await page.evaluate(() => document.documentElement.scrollWidth)
    if (sw > viewport.width) wide.push(`${vp}-${name}: ${sw}px`)
    await page.screenshot({ path: `${out}/${vp}-${name}.png`, fullPage })
  }
  await finishQuick(page)
  await page.getByRole('button', { name: 'Review and change my answers' }).scrollIntoViewIfNeeded()
  await page.evaluate(() => scrollBy(0, 160))
  await shot('results-action')

  await page.getByRole('button', { name: 'Review and change my answers' }).click()
  await page.getByRole('heading', { name: 'Review your answers', level: 1 }).waitFor()
  await shot('review-list')
  await shot('review-list-full', true)

  await page.locator('[data-review-row="1"]').click()
  await page.getByText(/^2 of \d+$/).waitFor()
  await shot('editing-prefilled')
  await cell(page, 3, -3).click()
  await page.getByRole('region', { name: 'Why the difference? (optional)' }).waitFor()
  await page.getByRole('button', { name: /Conditions/ }).first().click().catch(() => {})
  await shot('editing-changed')
  await page.evaluate(() => scrollTo(0, 0))
  await shot('editing-changed-top')

  await page.keyboard.press('Escape')
  await page.getByRole('heading', { name: 'Review your answers', level: 1 }).waitFor()
  await page.waitForTimeout(300)
  await shot('review-list-after-change')

  await page.getByRole('button', { name: 'Done, show my results' }).first().click()
  await page.getByRole('region', { name: 'Headline result' }).waitFor()
  await shot('results-edited')

  await page.getByRole('link', { name: 'All my runs' }).click()
  await page.getByRole('heading', { name: 'Your runs' }).waitFor()
  await page.evaluate(() => scrollTo(0, 0))
  await shot('runs')
  await ctx.close()
}
await browser.close()
if (wide.length) {
  console.error(`Sideways scroll:\n${wide.join('\n')}`)
  process.exit(1)
}
console.log(`Saved to ${out}/`)

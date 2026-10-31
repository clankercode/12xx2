/**
 * Visual check of the split-tile grid: the landing hero and the quiz grid at desktop and
 * phone width, dark and light, in every palette; initial, hover, focus and selected states,
 * the centre selected, and the how-to practice grid. Reduced motion is emulated so the tour
 * holds still and every shot is deterministic.
 * Usage: pnpm tsx scripts/hero-shots.ts [baseURL] [outDir] [filter]
 *   → <outDir>/<width>-<scheme>-<palette>-<state>.png  (filter: substring of "<width>-<scheme>-<palette>")
 */
import { chromium, type Page } from '@playwright/test'
import { existsSync, mkdirSync } from 'node:fs'

const base = process.argv[2] ?? 'http://localhost:21313/'
const out = process.argv[3] ?? 'shots/hero'
const filter = process.argv[4] ?? ''
mkdirSync(out, { recursive: true })

const settle = async (page: Page) => {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(150)
}
const cell = (page: Page, i: number, n: number) =>
  page.locator('[role="grid"]').first().locator('[role="row"]').nth(3 - n).locator('[role="gridcell"]').nth(i + 3)

const browser = await chromium.launch({ executablePath: existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined })
for (const width of [1280, 390]) {
  for (const scheme of ['dark', 'light'] as const) {
    for (const pal of ['gr', 'bo', 'rt', 'mono']) {
      const tag = `${width}-${scheme}-${pal}`
      if (!tag.includes(filter)) continue
      const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme: scheme, reducedMotion: 'reduce' })
      await page.addInitScript(p => {
        try {
          localStorage.setItem('12xx2.palette', p)
        } catch {}
      }, pal)
      const shot = async (name: string, target = page.locator('figure').first()) => {
        await settle(page)
        try {
          await target.screenshot({ path: `${out}/${tag}-${name}.png`, timeout: 10_000 })
        } catch (e) {
          await page.screenshot({ path: `${out}/${tag}-${name}-FAILED.png`, fullPage: true })
          throw e
        }
      }

      // The sticky header would cover element shots once they scroll under it.
      await page.addInitScript(() =>
        addEventListener('DOMContentLoaded', () => {
          const s = document.createElement('style')
          s.textContent = 'header { position: static !important; }'
          document.head.append(s)
        }),
      )

      // Landing hero: tour at its first stop, the centre stop, story, then the "Try it" grid.
      await page.goto(base)
      await shot('hero-initial')
      if (pal === 'gr') {
        await settle(page)
        await page.screenshot({ path: `${out}/${tag}-landing-full.png`, fullPage: true })
      }
      await page.getByRole('button', { name: 'Neutral or torn' }).click()
      await shot('hero-centre')
      await page.locator('label', { hasText: 'Two people' }).click()
      await shot('hero-story')
      await page.locator('label', { hasText: 'Try it' }).click()
      await cell(page, 2, 1).hover()
      await shot('hero-try-hover')
      await cell(page, 0, 0).click()
      await page.mouse.move(0, 0)
      await shot('hero-try-centre-selected')

      // Quiz: the how-to practice grid, then the first statement.
      await page.goto(base)
      await page.getByRole('button', { name: /Quick/ }).click()
      await page.getByRole('button', { name: 'Next: answering on the grid' }).click()
      const practice = page.getByRole('region', { name: 'Practice statement' })
      await shot('practice-initial', practice)
      await cell(page, 2, -1).click()
      await page.mouse.move(0, 0)
      await shot('practice-selected', practice)
      await page.getByRole('button', { name: 'Skip to the first statement' }).first().click()
      const answer = page.locator('[data-answer-area]')
      await page.mouse.move(0, 0)
      await shot('quiz-initial', answer)
      await cell(page, -2, 2).hover()
      await shot('quiz-hover', answer)
      await page.mouse.move(0, 0)
      await page.locator('[role="gridcell"][tabindex="0"]').first().focus()
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('ArrowUp')
      await shot('quiz-focus', answer)
      await cell(page, 2, 3).click()
      await page.getByText(/^2 of \d+$/).waitFor()
      await page.getByRole('button', { name: 'Back', exact: true }).click()
      await page.mouse.move(0, 0)
      await shot('quiz-selected', answer)
      await cell(page, 0, 0).click()
      await page.getByText(/^2 of \d+$/).waitFor()
      await page.getByRole('button', { name: 'Back', exact: true }).click()
      await page.mouse.move(0, 0)
      await shot('quiz-centre-selected', answer)
      if (pal === 'gr') {
        await settle(page)
        await page.screenshot({ path: `${out}/${tag}-quiz-full.png`, fullPage: true })
        // Horizontal overflow check (the phone width must not scroll sideways).
        const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
        if (over > 0) console.log(`OVERFLOW ${tag}: ${over}px`)
      }
      await page.close()
      console.log(tag)
    }
  }
}
await browser.close()

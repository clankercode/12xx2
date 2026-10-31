/**
 * Visual check for red lines. Needs a dev server with the test fixture (it lists red-line commitments):
 *   COMMITMENTS_FIXTURE=tests/fixtures/commitments.json pnpm vite
 * Captures the red-line intro card and a red-line statement (a Standard run at its first red line),
 * then a finished run whose red-line answers contradict fixture commitments: the matrix with its
 * Red lines column, "Your red lines", the share sheet opt-in (off, then on) and the shared panel.
 * Usage: pnpm tsx scripts/redlines-shots.ts [baseURL] [outDir]
 */
import { chromium } from '@playwright/test'
import { existsSync, mkdirSync } from 'node:fs'
import { EMPTY, type Session } from '../src/state/session'
import { itemsForMode } from '../src/data/items'
import { RED_IDS } from '../src/data/redlines'
import type { Answer, Answers } from '../src/engine/types'
import { SHOT_MODE, shotAnswers } from './commitments-respondent'

const base = process.argv[2] ?? 'http://localhost:21313/'
const out = process.argv[3] ?? 'shots'
mkdirSync(out, { recursive: true })

const axis = shotAnswers()
/** Mostly on the humane side; agrees with torture (red-03, firmly) and neutral on rulers under the law (red-08). */
const red: Answers = Object.fromEntries(
  RED_IDS.map((id, k) => {
    if (id === 'red-03') return [id, { i: 2, n: 3 }]
    if (id === 'red-08') return [id, { i: 0, n: 1 }]
    const humane = [-1, 1, -1, 1, -1, 1, -1, 1, -1, -1][k]!
    return [id, { i: (3 * humane) as Answer, n: (2 * humane) as Answer }]
  }),
)
const atRedLines: Session = { ...EMPTY, mode: SHOT_MODE, answers: axis, stage: 'quiz', index: itemsForMode(SHOT_MODE).length }
const finished: Session = {
  ...EMPTY,
  mode: SHOT_MODE,
  answers: { ...axis, ...red },
  stage: 'done',
  runId: 'dddddddddddddddd',
  finishedAt: '2026-10-31T09:00:00.000Z',
}

const browser = await chromium.launch({ executablePath: existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined })
for (const [vp, viewport] of [
  ['desktop', { width: 1280, height: 900 }],
  ['mobile', { width: 390, height: 844 }],
] as const) {
  const open = async (session: Session) => {
    const ctx = await browser.newContext({ viewport, colorScheme: 'dark' })
    await ctx.addInitScript(s => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem('12xx2.session.v1', s)
        sessionStorage.setItem('seeded', '1')
      }
    }, JSON.stringify(session))
    const page = await ctx.newPage()
    page.on('pageerror', e => console.error('pageerror', e.message))
    // Element screenshots scroll the element to the top, under the sticky header: let it scroll away.
    page.on('load', () => page.addStyleTag({ content: 'header { position: static !important; }' }).catch(() => {}))
    return { ctx, page }
  }
  const settle = async (page: import('@playwright/test').Page) => {
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(500)
    const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
    if (sw > iw) {
      // Name the sections whose removal stops the sideways scroll, so the culprit is obvious.
      const culprits = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>('section, div.lamp, header, footer, form'))
          .filter(el => {
            const prev = el.style.display
            el.style.display = 'none'
            const fits = document.documentElement.scrollWidth <= innerWidth
            el.style.display = prev
            return fits
          })
          .slice(0, 5)
          .map(el => `${el.tagName.toLowerCase()}[${el.getAttribute('aria-labelledby') ?? el.getAttribute('aria-label') ?? el.className}] "${(el.textContent ?? '').slice(0, 40)}"`),
      )
      console.error(`${vp} ${page.url()}: page scrolls sideways (${sw} > ${iw}): hiding any of ${culprits.join(' | ') || '(none found)'} fixes it`)
    }
  }

  {
    const { ctx, page } = await open(atRedLines)
    await page.goto(`${base}#/quiz`)
    await page.getByRole('heading', { name: 'Red lines', exact: true }).waitFor()
    await settle(page)
    await page.screenshot({ path: `${out}/redlines-intro-${vp}.png`, fullPage: true })
    await page.getByRole('button', { name: 'Continue to the red lines' }).click()
    await page.getByText('Red line 1 of 10').waitFor()
    await settle(page)
    await page.screenshot({ path: `${out}/redlines-statement-${vp}.png`, fullPage: true })
    await ctx.close()
  }

  const { ctx, page } = await open(finished)
  await page.goto(`${base}#/results`)
  await settle(page)
  await page.screenshot({ path: `${out}/redlines-results-${vp}.png`, fullPage: true })
  await page.locator('section[aria-labelledby="core-commitments"]').screenshot({ path: `${out}/redlines-matrix-${vp}.png` })
  await page.locator('section[aria-labelledby="your-red-lines"]').screenshot({ path: `${out}/redlines-yours-${vp}.png` })
  await page.getByRole('button', { name: 'Share my result' }).click()
  await page.waitForTimeout(800)
  const include = page.locator('fieldset:has(legend:text-is("Include (off by default)"))')
  await include.screenshot({ path: `${out}/redlines-share-off-${vp}.png` })
  await page.getByLabel(/Include where I stand on the red-line statements/).check()
  await page.waitForTimeout(300)
  await page.locator('section[aria-label="Share your result"]').screenshot({ path: `${out}/redlines-share-on-${vp}.png` })
  const link = await page.getByLabel('Your result link').inputValue()
  console.log(vp, 'link', link)
  await page.goto(link.replace(/^https?:\/\/[^/]+\//, base))
  await settle(page)
  await page.locator('section[aria-labelledby="shared-red-lines"]').screenshot({ path: `${out}/redlines-shared-${vp}.png` })
  await page.goto(`${base}#/ideologies`)
  await settle(page)
  await page.locator('section#social-democracy').screenshot({ path: `${out}/redlines-ideology-${vp}.png` })
  await page.goto(`${base}#/method`)
  await settle(page)
  const top = await page.locator('h3#red-lines').evaluate(e => e.getBoundingClientRect().top + window.scrollY)
  await page.screenshot({ path: `${out}/redlines-method-${vp}.png`, fullPage: true, clip: { x: 0, y: top - 20, width: viewport.width, height: 700 } })
  await ctx.close()
}
await browser.close()
console.log('done')

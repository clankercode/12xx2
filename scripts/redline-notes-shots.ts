/**
 * Visual check for the red-line explainers: the intro card, red-10 with its note, "Your red lines"
 * with notes, and the Method page's red-lines section, at 1280 dark and 390 light. Needs a dev
 * server on the real commitments: `pnpm vite`.
 * Usage: pnpm tsx scripts/redline-notes-shots.ts [baseURL] [outDir]
 */
import { chromium, type Page } from '@playwright/test'
import { existsSync, mkdirSync } from 'node:fs'
import { EMPTY, type Session } from '../src/state/session'
import { itemsForMode } from '../src/data/items'
import { RED_IDS } from '../src/data/redlines'
import type { Answer, Answers } from '../src/engine/types'
import { SHOT_MODE, shotAnswers } from './commitments-respondent'

const base = process.argv[2] ?? 'http://localhost:21313/'
const out = process.argv[3] ?? 'shots/redlines2'
mkdirSync(out, { recursive: true })

const axis = shotAnswers()
const red: Answers = Object.fromEntries(
  RED_IDS.map((id, k) => {
    const humane = [-1, 1, -1, 1, -1, 1, -1, 1, -1, -1][k]!
    return [id, { i: (3 * humane) as Answer, n: (2 * humane) as Answer }]
  }),
)
const atRedLines: Session = { ...EMPTY, mode: SHOT_MODE, answers: axis, stage: 'quiz', index: itemsForMode(SHOT_MODE).length }
/** At red-10 with red-01 to red-09 answered and red-10 not yet, so its grid is blank. */
const atRed10: Session = {
  ...atRedLines,
  answers: { ...axis, ...Object.fromEntries(Object.entries(red).filter(([id]) => id !== 'red-10')) },
  index: itemsForMode(SHOT_MODE).length + 9,
}
const finished: Session = { ...EMPTY, mode: SHOT_MODE, answers: { ...axis, ...red }, stage: 'done', runId: 'eeeeeeeeeeeeeeee', finishedAt: '2026-11-01T09:00:00.000Z' }

const browser = await chromium.launch({ executablePath: existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined })
for (const [tag, viewport, scheme] of [
  ['1280-dark', { width: 1280, height: 900 }, 'dark'],
  ['390-light', { width: 390, height: 844 }, 'light'],
] as const) {
  const open = async (session: Session) => {
    const ctx = await browser.newContext({ viewport, colorScheme: scheme, deviceScaleFactor: 1 })
    await ctx.addInitScript(s => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem('12xx2.session.v1', s)
        sessionStorage.setItem('seeded', '1')
      }
    }, JSON.stringify(session))
    const page = await ctx.newPage()
    page.on('pageerror', e => console.error('pageerror', e.message))
    page.on('load', () => page.addStyleTag({ content: 'header { position: static !important; }' }).catch(() => {}))
    return { ctx, page }
  }
  const settle = async (page: Page) => {
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(500)
    const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
    if (sw > iw) console.error(`${tag} ${page.url()}: page scrolls sideways (${sw} > ${iw})`)
  }

  {
    const { ctx, page } = await open(atRedLines)
    await page.goto(`${base}#/quiz`)
    await page.getByRole('heading', { name: 'Red lines', exact: true }).waitFor()
    await settle(page)
    await page.screenshot({ path: `${out}/intro-${tag}.png`, fullPage: true })
    await ctx.close()
  }
  {
    const { ctx, page } = await open(atRed10)
    await page.goto(`${base}#/quiz`)
    await page.getByText('Red line 10 of 10').waitFor()
    await settle(page)
    await page.screenshot({ path: `${out}/red10-${tag}.png`, fullPage: true })
    await ctx.close()
  }
  {
    const { ctx, page } = await open(finished)
    await page.goto(`${base}#/results`)
    await page.locator('section[aria-labelledby="your-red-lines"]').waitFor()
    await settle(page)
    await page.locator('section[aria-labelledby="your-red-lines"]').screenshot({ path: `${out}/your-red-lines-${tag}.png` })
    await page.goto(`${base}#/method`)
    await settle(page)
    const top = await page.locator('h3#red-lines').evaluate(e => e.getBoundingClientRect().top + window.scrollY)
    await page.screenshot({ path: `${out}/method-${tag}.png`, fullPage: true, clip: { x: 0, y: top - 20, width: viewport.width, height: viewport.width < 600 ? 2000 : 1100 } })
    await ctx.close()
  }
}
await browser.close()
console.log(`wrote ${out}/`)

/**
 * Visual check for core commitments. Needs a dev server started with the test fixture:
 *   COMMITMENTS_FIXTURE=tests/fixtures/commitments.json pnpm vite
 * Seeds a finished run whose nearest match the fixture rules out, then captures the results page,
 * the shared view of its link, and the ideologies and method sections.
 * With real data instead (no fixture), SHOT_RESPONDENT=latent seeds a typical respondent whose
 * nearest match the shipped commitments rule out.
 * Usage: pnpm tsx scripts/commitments-shots.ts [baseURL] [outDir]
 */
import { chromium } from '@playwright/test'
import { existsSync, mkdirSync } from 'node:fs'
import { EMPTY, type Session } from '../src/state/session'
import { SHOT_MODE, ruledOutLatentAnswers, shotAnswers } from './commitments-respondent'

const base = process.argv[2] ?? 'http://localhost:21313/'
const out = process.argv[3] ?? 'shots'
mkdirSync(out, { recursive: true })

const session: Session = {
  ...EMPTY,
  mode: SHOT_MODE,
  answers: process.env.SHOT_RESPONDENT === 'latent' ? ruledOutLatentAnswers() : shotAnswers(),
  stage: 'done',
  runId: 'cccccccccccccccc',
  finishedAt: '2026-10-31T09:00:00.000Z',
}

const browser = await chromium.launch({ executablePath: existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined })
for (const [vp, viewport] of [
  ['desktop', { width: 1280, height: 900 }],
  ['mobile', { width: 390, height: 844 }],
] as const) {
  const ctx = await browser.newContext({ viewport, colorScheme: 'dark' })
  await ctx.addInitScript(s => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('12xx2.session.v1', s)
      sessionStorage.setItem('seeded', '1')
    }
  }, JSON.stringify(session))
  const page = await ctx.newPage()
  page.on('pageerror', e => console.error('pageerror', e.message))
  const settle = async () => {
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(500)
    const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
    if (sw > iw) console.error(`${vp} ${page.url()}: page scrolls sideways (${sw} > ${iw})`)
  }
  await page.goto(`${base}#/results`)
  await settle()
  await page.screenshot({ path: `${out}/commitments-results-${vp}.png`, fullPage: true })
  await page.locator('section[aria-label="Headline result"]').screenshot({ path: `${out}/commitments-hero-${vp}.png` })
  await page.locator('section:has(> h2:text-is("Closest ideologies"))').screenshot({ path: `${out}/commitments-matches-${vp}.png` })
  await page.locator('section[aria-labelledby="core-commitments"]').screenshot({ path: `${out}/commitments-matrix-${vp}.png` })

  await page.getByRole('button', { name: 'Share my result' }).click()
  await page.waitForTimeout(800)
  const link = await page.getByLabel('Your result link').inputValue()
  console.log(vp, 'link', link)
  await page.goto(link.replace(/^https?:\/\/[^/]+\//, base))
  await settle()
  await page.locator('section[aria-label="Headline result"]').screenshot({ path: `${out}/commitments-shared-hero-${vp}.png` })
  await page.locator('section:has(> h2:text-is("Closest ideologies"))').screenshot({ path: `${out}/commitments-shared-matches-${vp}.png` })

  await page.goto(`${base}#/ideologies`)
  await settle()
  await page.locator('section#social-democracy').screenshot({ path: `${out}/commitments-ideology-${vp}.png` })
  await page.goto(`${base}#/method`)
  await settle()
  const h = page.locator('h2#core-commitments')
  const top = await h.evaluate(e => e.getBoundingClientRect().top + window.scrollY)
  await page.screenshot({ path: `${out}/commitments-method-${vp}.png`, fullPage: true, clip: { x: 0, y: top - 20, width: viewport.width, height: 760 } })
  await ctx.close()
}
await browser.close()
console.log('done')

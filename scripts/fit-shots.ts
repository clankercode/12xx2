/**
 * Visual check for the fit-set headline: finds a simulated respondent for each headline case
 * (one fit, several, exactly four, more than four, none, a split, here and now fitting nothing,
 * a ruled-out nearest, overlapping frames),
 * seeds each as a finished run and captures the results hero at 1280 and 390 wide in dark and
 * light, plus the shared view, the compare page and the share cards for every case.
 * Needs `just dev` running.
 * Usage: pnpm tsx scripts/fit-shots.ts [baseURL] [outDir]  → <outDir>/<case>-<scheme>-<width>.png, <outDir>/cards/
 */
import { chromium } from '@playwright/test'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { EMPTY, type Session } from '../src/state/session'
import { deriveOwn } from '../src/state/derive'
import { encodePayload, forSharing } from '../src/engine/payload'
import { mulberry32 } from '../src/engine/prng'
import { itemsForMode } from '../src/data/items'
import { sameInBothFrames, type Results } from '../src/engine/results'
import { CATALOGUE } from '../src/data/archetypes'
import { heroName } from '../src/ui/copy'
import type { Mode } from '../src/engine/types'
import { archetypeSheet, latentSheet, respond, type Sheets } from './sim'

const base = process.argv[2] ?? 'http://localhost:21313/'
const out = process.argv[3] ?? 'shots/fit'
mkdirSync(`${out}/cards`, { recursive: true })
const sheets = JSON.parse(readFileSync('content/archetypes/sheets.json', 'utf8')) as Sheets

type Case = 'single' | 'multi' | 'four' | 'many' | 'none' | 'split' | 'now-empty' | 'ruled-out' | 'overlap'
const CASES: Record<Case, (r: Results) => boolean> = {
  single: r => r.hero.kind === 'constant' && sameInBothFrames(r.hero) && r.hero.ideal.fits.length === 1 && !r.hero.ideal.ruledOutInRange.length,
  multi: r => r.hero.kind === 'constant' && sameInBothFrames(r.hero) && r.hero.ideal.fits.length === 2,
  four: r => r.hero.kind === 'constant' && r.hero.ideal.fits.length === 4,
  many: r => r.hero.kind === 'constant' && r.hero.ideal.fits.length > 4,
  none: r => r.hero.kind === 'no-fit' && !!r.hero.ideal.nearest && !r.hero.ideal.ruledOutInRange.length,
  split: r => r.hero.kind === 'split',
  // The ideal fits, here and now fits nothing: not a split (review S1).
  'now-empty': r => r.hero.kind === 'constant' && !!r.hero.now && r.hero.now.fits.length === 0,
  // The nearest ideology by distance is ruled out by a core commitment.
  'ruled-out': r =>
    (r.hero.kind === 'constant' || r.hero.kind === 'no-fit') &&
    !!r.hero.ideal.ruledOutInRange[0] &&
    (!r.hero.ideal.fits[0] || r.hero.ideal.ruledOutInRange[0].d < r.hero.ideal.fits[0].d),
  overlap: r => r.hero.kind === 'constant' && !!r.hero.now && r.hero.now.fits.length > 0 && !sameInBothFrames(r.hero),
}

const session = (mode: Mode, answers: Session['answers'], k: number): Session => ({
  ...EMPTY,
  mode,
  answers,
  stage: 'done',
  runId: `f17${String(k).padStart(13, '0')}`,
  finishedAt: '2026-10-31T09:00:00.000Z',
})

/** First simulated respondent (seeded, deterministic) whose results fall in each case. */
function find(): Map<Case, Session> {
  const found = new Map<Case, Session>()
  const want = Object.keys(CASES) as Case[]
  const open = CATALOGUE.filter(a => !a.sensitive)
  for (let k = 0; k < 4000 && found.size < want.length; k++) {
    const mode: Mode = (['standard', 'quick', 'full'] as const)[k % 3]!
    const items = itemsForMode(mode)
    const rng = mulberry32(1000 + k)
    const latent = k % 5 === 4
    const a = open[k % open.length]!
    const sheet = latent ? latentSheet(rng, items) : archetypeSheet(rng, items, sheets[a.slug]!, 'both')
    const s = session(mode, respond(rng, items, sheet, { p: 0.5, pass: 0.05 }), k)
    const own = deriveOwn(s)
    if (!own) continue
    for (const c of want) if (!found.has(c) && CASES[c](own.results)) found.set(c, s)
  }
  return found
}

const found = find()
for (const [c, s] of found) console.log(c.padEnd(10), s.mode?.padEnd(9), heroName(deriveOwn(s)!.results))
const missing = (Object.keys(CASES) as Case[]).filter(c => !found.has(c))
if (missing.length) console.error('no respondent found for', missing.join(', '))

const browser = await chromium.launch({ executablePath: existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined })
for (const [c, s] of found) {
  for (const width of [1280, 390]) {
    const ctx = await browser.newContext({ viewport: { width, height: width > 500 ? 900 : 844 } })
    await ctx.addInitScript(json => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem('12xx2.session.v1', json)
        localStorage.setItem('12xx2.history.v1', '[]')
        sessionStorage.setItem('seeded', '1')
      }
    }, JSON.stringify(s))
    const page = await ctx.newPage()
    page.on('pageerror', e => console.error('pageerror', e.message))
    await page.goto(`${base}#/results`)
    for (const scheme of ['dark', 'light'] as const) {
      await page.emulateMedia({ colorScheme: scheme })
      await page.evaluate(() => (scrollTo(0, 0), document.fonts.ready))
      await page.waitForTimeout(300)
      const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
      if (sw > iw) console.error(`${c} ${width}: page scrolls sideways (${sw} > ${iw})`)
      await page.locator('section[aria-label="Headline result"]').screenshot({ path: `${out}/${c}-${scheme}-${width}.png` })
      if (c === 'many' || c === 'ruled-out')
        await page.locator('section:has(> h2:text-is("Closest ideologies"))').screenshot({ path: `${out}/${c}-matches-${scheme}-${width}.png` })
    }
    await ctx.close()
  }
}

// Shared view (the viewer's wording) and the compare page, dark at both widths.
const enc = (s: Session) => encodePayload(forSharing(deriveOwn(s)!.payload, { q: false, sc: false, country: false }))
const multi = found.get('multi')
const split = found.get('split')
for (const width of [1280, 390]) {
  const ctx = await browser.newContext({ viewport: { width, height: width > 500 ? 900 : 844 }, colorScheme: 'dark' })
  const page = await ctx.newPage()
  if (multi) {
    await page.goto(`${base}#r=${enc(multi)}`)
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(300)
    await page.locator('section[aria-label="Headline result"]').screenshot({ path: `${out}/shared-multi-dark-${width}.png` })
  }
  await page.goto(`${base}#/method`)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)
  const top = await page.locator('h3#fit-set').evaluate(e => e.getBoundingClientRect().top + window.scrollY)
  await page.screenshot({ path: `${out}/method-dark-${width}.png`, fullPage: true, clip: { x: 0, y: top - 20, width, height: width > 500 ? 1400 : 2400 } })
  if (multi && split) {
    await page.goto(`${base}#c=${enc(multi)}~${enc(split)}`)
    await page.reload()
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(300)
    await page.locator('section').first().screenshot({ path: `${out}/compare-dark-${width}.png` })
  }
  await ctx.close()
}

// Share cards for every case, plus a comparison card.
const page = await browser.newPage()
page.on('pageerror', e => console.error('pageerror', e.message))
await page.goto(base)
const payloads = Object.fromEntries([...found].map(([c, s]) => [c, deriveOwn(s)!.payload]))
for (const size of ['post', 'story', 'wide'] as const) {
  // Passed as a string: tsx's injected __name helper doesn't exist in the page.
  const data = (await page.evaluate(`(async ([size, payloads]) => {
    const { drawCard, ensureFonts, cardBlob } = await import('/src/share/card.ts')
    const { drawCompareCard } = await import('/src/share/compareCard.ts')
    const { compareResults } = await import('/src/engine/compare.ts')
    const { deriveShared } = await import('/src/state/shared.ts')
    await ensureFonts()
    const host = '12axes-squared.netlify.app'
    const bytes = async c => Array.from(new Uint8Array(await (await cardBlob(c)).arrayBuffer()))
    const res = {}
    for (const [k, p] of Object.entries(payloads)) {
      const c = document.createElement('canvas')
      drawCard(c, deriveShared(p), { size, minimal: false, showSc: false, showCountry: false, allowSensitive: false, host })
      res[k] = await bytes(c)
    }
    if (payloads.multi && payloads.split) {
      const c = document.createElement('canvas')
      drawCompareCard(c, deriveShared(payloads.multi), deriveShared(payloads.split), compareResults(payloads.multi, payloads.split), { size, names: ['Sam', 'Alex'], host })
      res['compare'] = await bytes(c)
    }
    return res
  })(${JSON.stringify([size, payloads])})`)) as Record<string, number[]>
  for (const [k, b] of Object.entries(data)) writeFileSync(`${out}/cards/${k}-${size}.png`, Buffer.from(b))
}
await browser.close()
console.log(`fit shots written to ${out}/`)

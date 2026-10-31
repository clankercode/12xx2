/**
 * Visual check for the ideology map: the results "Exact from here" panel (owner, here-and-now
 * toggle, a ruled-out nearest, the shared view) and every #/map view, at 1280 dark and 390 light.
 * Fails (exit 1) on any sideways scroll or page error. Needs a dev server.
 * Usage: pnpm tsx scripts/map-shots.ts [baseURL] [outDir]  → <outDir>/*.png
 */
import { chromium, type Page } from '@playwright/test'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { EMPTY, type Session } from '../src/state/session'
import { deriveOwn } from '../src/state/derive'
import { encodePayload, forSharing } from '../src/engine/payload'
import { mulberry32 } from '../src/engine/prng'
import { itemsForMode } from '../src/data/items'
import { CATALOGUE } from '../src/data/archetypes'
import { distance, rank } from '../src/engine/match'
import { ruledOutSlugs } from '../src/data/commitments'
import type { Mode } from '../src/engine/types'
import { archetypeSheet, respond, type Sheets } from './sim'

const base = process.argv[2] ?? 'http://localhost:21313/'
const out = process.argv[3] ?? 'shots/map'
mkdirSync(out, { recursive: true })
const sheets = JSON.parse(readFileSync('content/archetypes/sheets.json', 'utf8')) as Sheets
let failed = false

const session = (mode: Mode, answers: Session['answers'], k: number): Session => ({
  ...EMPTY,
  mode,
  answers,
  stage: 'done',
  runId: `a17${String(k).padStart(13, '0')}`,
  finishedAt: '2026-11-01T09:00:00.000Z',
})

/** A sincere-looking respondent: reliable, matched, and (if wanted) with a ruled-out ideology in its nearest five. */
function find(mode: Mode, wantRuledOut: boolean): Session {
  for (let k = 0; k < 3000; k++) {
    const items = itemsForMode(mode)
    const rng = mulberry32(5000 + k)
    const a = CATALOGUE.filter(x => !x.sensitive)[k % 40]!
    const s = session(mode, respond(rng, items, archetypeSheet(rng, items, sheets[a.slug]!, 'both'), { p: 0.5, pass: 0.05 }), k)
    const own = deriveOwn(s)
    if (!own || own.results.hero.kind === 'unreliable' || own.results.hero.kind === 'insufficient') continue
    const top5 = rank(own.payload.I, CATALOGUE, 'ideal').slice(0, 5).map(r => r.arch.slug)
    const out = ruledOutSlugs(own.payload)
    if (wantRuledOut === top5.some(t => out.has(t))) return s
  }
  throw new Error('no respondent found')
}

async function seeded(width: number, scheme: 'dark' | 'light', s: Session | null) {
  const browser = await chromium.launch({ executablePath: existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined })
  const ctx = await browser.newContext({ viewport: { width, height: width > 500 ? 900 : 844 }, colorScheme: scheme, deviceScaleFactor: width > 500 ? 1 : 2 })
  if (s)
    await ctx.addInitScript(json => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem('12xx2.session.v1', json)
        localStorage.setItem('12xx2.history.v1', '[]')
        sessionStorage.setItem('seeded', '1')
      }
    }, JSON.stringify(s))
  const page = await ctx.newPage()
  page.on('pageerror', e => {
    failed = true
    console.error('pageerror', e.message)
  })
  return { browser, page }
}

async function settle(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(800)
  const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
  if (sw > iw) {
    failed = true
    console.error(`${name}: page scrolls sideways (${sw} > ${iw})`)
  }
}

const std = find('standard', false)
const ruled = find('standard', true)
const quick = find('quick', false)
for (const [n, s] of [['standard', std], ['ruled-out', ruled], ['quick', quick]] as const) {
  const own = deriveOwn(s)!
  const near = rank(own.payload.I, CATALOGUE, 'ideal')[0]!
  console.log(n.padEnd(10), own.results.hero.kind, near.arch.slug, distance(own.payload.I, near.arch.ideal, near.arch.weight).toFixed(3))
}

const panel = (page: Page) => page.locator('section[aria-labelledby="exact-h"]')

// Results panel: owner, dark 1280 and light 390; here-and-now toggle; ruled-out nearest; a Quick run.
for (const [w, scheme] of [[1280, 'dark'], [390, 'light']] as const) {
  const { browser, page } = await seeded(w, scheme, std)
  await page.goto(`${base}#/results`)
  await panel(page).scrollIntoViewIfNeeded()
  await settle(page, `results ${w}`)
  await panel(page).screenshot({ path: `${out}/results-panel-${scheme}-${w}.png` })
  if (w === 1280) {
    await page.getByRole('button', { name: 'Here and now' }).click()
    await settle(page, 'results now')
    await panel(page).screenshot({ path: `${out}/results-panel-now-${scheme}-${w}.png` })
    await page.locator('section[aria-labelledby="exact-h"] svg a').first().hover()
    await page.waitForTimeout(200)
    await panel(page).screenshot({ path: `${out}/results-panel-hover-${scheme}-${w}.png` })
  }
  await browser.close()
}
{
  const { browser, page } = await seeded(1280, 'dark', ruled)
  await page.goto(`${base}#/results`)
  await panel(page).scrollIntoViewIfNeeded()
  await settle(page, 'results ruled-out')
  await panel(page).screenshot({ path: `${out}/results-panel-ruled-out-dark-1280.png` })
  // The shared view of the same result: catalogue without sensitive names (no opt-in), rule-outs from the link.
  const enc = encodePayload(forSharing(deriveOwn(ruled)!.payload, { q: false, sc: false, country: false }))
  await page.goto(`${base}#r=${enc}`)
  await panel(page).scrollIntoViewIfNeeded()
  await settle(page, 'shared')
  await panel(page).screenshot({ path: `${out}/results-panel-shared-dark-1280.png` })
  await browser.close()
}
{
  const { browser, page } = await seeded(390, 'dark', quick)
  await page.goto(`${base}#/results`)
  await panel(page).scrollIntoViewIfNeeded()
  await settle(page, 'results quick 390')
  await panel(page).screenshot({ path: `${out}/results-panel-quick-dark-390.png` })
  await browser.close()
}

// #/map, every view, dark 1280 with the respondent; then phone width.
{
  const { browser, page } = await seeded(1280, 'dark', std)
  const shot = async (name: string, full = true) => {
    await settle(page, name)
    await page.screenshot({ path: `${out}/${name}.png`, fullPage: full })
  }
  const tab = (name: string) => page.getByRole('tab', { name }).click()
  await page.goto(`${base}#/map`)
  await shot('map-2d-dark-1280')
  await page.getByRole('combobox', { name: /^Find/ }).selectOption({ label: 'Kemalism' })
  await shot('map-2d-selected-dark-1280')
  await page.getByRole('combobox', { name: /^Overlay/ }).selectOption('bands')
  await shot('map-2d-bands-dark-1280')
  await page.getByRole('combobox', { name: /^Overlay/ }).selectOption('halo')
  await page.getByRole('combobox', { name: /^Find/ }).selectOption('')
  await shot('map-2d-halos-dark-1280')
  await page.getByRole('combobox', { name: /^Overlay/ }).selectOption('none')
  await page.getByRole('button', { name: 'Both' }).click()
  await shot('map-2d-both-dark-1280')
  await page.getByRole('button', { name: 'Ideal', exact: true }).click()
  // Shepard brushing: hover the plot's busiest region.
  const shep = page.locator('svg[aria-label^="Shepard plot"]')
  await shep.scrollIntoViewIfNeeded()
  const box = (await shep.boundingBox())!
  for (let k = 0; k < 40; k++) {
    await page.mouse.move(box.x + box.width * (0.35 + k * 0.004), box.y + box.height * (0.45 - k * 0.002))
    if (await page.getByText(/Pair picked|too far apart by|too close by/).count()) break
  }
  await shot('map-shepard-brush-dark-1280')
  await page.mouse.move(5, 5)
  await page.evaluate(() => scrollTo(0, 0))
  await tab('3D map')
  const svg = page.locator('svg[aria-label^="3D map"]')
  const b3 = (await svg.boundingBox())!
  await page.mouse.move(b3.x + b3.width / 2, b3.y + b3.height / 2)
  await page.mouse.down()
  await page.mouse.move(b3.x + b3.width / 2 + 140, b3.y + b3.height / 2 + 50, { steps: 8 })
  await page.mouse.up()
  await page.getByRole('combobox', { name: /^Find/ }).selectOption({ label: 'Fascism (historical, interwar)' })
  await shot('map-3d-dark-1280')
  await tab('Exact from here')
  await shot('map-ego-you-dark-1280')
  await page.getByRole('combobox', { name: /^Centre on/ }).selectOption({ label: 'Neoliberalism' })
  await shot('map-ego-neoliberalism-theirs-dark-1280')
  await page.getByRole('button', { name: 'Its own weights' }).click()
  await shot('map-ego-neoliberalism-own-dark-1280')
  await tab('Explore')
  await shot('map-matrix-dark-1280')
  await page.getByRole('button', { name: 'Asymmetry' }).click()
  await shot('map-matrix-asym-dark-1280')
  await page.getByRole('button', { name: 'Axis slice' }).click()
  await page.getByRole('combobox', { name: /^Find/ }).selectOption({ label: 'Christian democracy' })
  await shot('map-slice-dark-1280')
  await browser.close()
}
for (const scheme of ['dark', 'light'] as const) {
  const { browser, page } = await seeded(390, scheme, std)
  await page.goto(`${base}#/map`)
  await settle(page, `map 390 ${scheme}`)
  await page.screenshot({ path: `${out}/map-2d-${scheme}-390.png`, fullPage: true })
  await page.getByRole('tab', { name: 'Exact from here' }).click()
  await settle(page, `map ego 390 ${scheme}`)
  await page.screenshot({ path: `${out}/map-ego-${scheme}-390.png`, fullPage: true })
  await page.getByRole('tab', { name: 'Explore' }).click()
  await settle(page, `map matrix 390 ${scheme}`)
  await browser.close()
}
// No run on this device: no "you" point.
{
  const { browser, page } = await seeded(1280, 'light', null)
  await page.goto(`${base}#/map`)
  await settle(page, 'map no run')
  await page.screenshot({ path: `${out}/map-2d-norun-light-1280.png` })
  await browser.close()
}
if (failed) process.exit(1)
console.log(`wrote ${out}/`)

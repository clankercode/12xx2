/**
 * Visual check for the runs pages: seeds two simulated runs into localStorage, then captures
 * the list, a run view and the run-vs-run diff.
 * Usage: pnpm tsx scripts/history-shots.ts [baseURL] [outDir]
 */
import { chromium } from '@playwright/test'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { mulberry32 } from '../src/engine/prng'
import { itemsForMode } from '../src/data/items'
import { buildRun, upsertRun, type Run } from '../src/state/history'
import { EMPTY } from '../src/state/session'
import { archetypeSheet, respond, type Sheets } from './sim'

const base = process.argv[2] ?? 'http://localhost:21313/'
const out = process.argv[3] ?? 'shots'
mkdirSync(out, { recursive: true })
const sheets = JSON.parse(readFileSync('content/archetypes/sheets.json', 'utf8')) as Sheets

function run(slug: string, seed: number, mode: 'quick' | 'standard', id: string, at: string, headline: string): Run {
  const rng = mulberry32(seed)
  const items = itemsForMode(mode)
  const answers = respond(rng, items, archetypeSheet(rng, items, sheets[slug]!, 'both'), { p: 0.5, pass: 0.05 })
  return buildRun({ ...EMPTY, mode, answers, stage: 'done', runId: id, finishedAt: at, country: 'AU' }, headline)!
}
let runs: Run[] = []
runs = upsertRun(runs, run('social-liberalism', 1, 'quick', 'aaaaaaaaaaaaaaaa', '2026-09-12T09:30:00.000Z', 'Social democracy'))
runs = upsertRun(runs, run('georgism', 2, 'standard', 'bbbbbbbbbbbbbbbb', '2026-10-31T08:10:00.000Z', 'Georgism → Social liberalism'))

const browser = await chromium.launch({ executablePath: existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined })
for (const [vp, viewport] of [
  ['desktop', { width: 1280, height: 900 }],
  ['mobile', { width: 390, height: 844 }],
] as const) {
  const ctx = await browser.newContext({ viewport, colorScheme: 'dark' })
  await ctx.addInitScript(r => localStorage.setItem('12xx2.history.v1', r), JSON.stringify({ v: 1, runs }))
  const page = await ctx.newPage()
  page.on('pageerror', e => console.error('pageerror', e.message))
  for (const [name, hash] of [
    ['list', '#/history'],
    ['run', '#/run/bbbbbbbbbbbbbbbb'],
    ['diff', '#/runs/aaaaaaaaaaaaaaaa~bbbbbbbbbbbbbbbb'],
  ] as const) {
    await page.goto(`${base}${hash}`)
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${out}/history-${name}-${vp}.png`, fullPage: true })
  }
  await ctx.close()
}
await browser.close()
console.log(`history shots written to ${out}/`)

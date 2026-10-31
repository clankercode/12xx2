import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

const AXES = ['fed', 'dem', 'lib', 'col', 'pla', 'glo', 'int', 'mil', 'mul', 'rel', 'pro', 'tec']
/** A consistent lean per axis (−2…2): a sincere respondent, so the result is neither careless nor flat. */
const LEAN: Record<string, number> = { fed: 1, dem: -2, lib: -1, col: 1, pla: 2, glo: -1, int: 1, mil: -1, mul: 2, rel: -2, pro: 1, tec: -1 }
const KEY = new Map<string, number>()
for (const a of AXES)
  for (const it of (JSON.parse(readFileSync(`content/items/${a}.json`, 'utf8')) as { items: { id: string; key: number }[] }).items) KEY.set(it.id, it.key)

/**
 * Answers a Quick run as someone with a steady view: each statement's id comes from its report link,
 * the answer follows the item's key and the axis lean, and here-and-now sits one step lower on some items.
 */
async function answerSincerely(page: Page) {
  const total = Number((await page.getByText(/^1 of \d+$/).innerText()).split(' of ')[1])
  const redCard = page.getByRole('heading', { name: 'Red lines', exact: true })
  for (let k = 0; k < total; k++) {
    if (await redCard.isVisible().catch(() => false)) await page.getByRole('button', { name: 'Continue to the red lines' }).click()
    const href = (await page.getByRole('link', { name: 'Report this statement' }).getAttribute('href')) ?? ''
    const id = /Statement%20([a-z]+-\d+)%3A/.exec(href)?.[1] ?? ''
    const key = KEY.get(id)
    // Red lines (not in the axis files): a mild disagreement, so nothing is ruled out by accident.
    const i = key === undefined ? -1 : Math.max(-3, Math.min(3, key * LEAN[id.slice(0, 3)]!))
    const n = Math.max(-3, i - (k % 3 === 0 ? 1 : 0))
    const grid = page.locator('[role="grid"]').first()
    await grid.locator('[role="row"]').nth(3 - n).locator('[role="gridcell"]').nth(i + 3).click()
    if (k < total - 1) await expect(page.getByText(`${k + 2} of ${total}`, { exact: true }).or(redCard)).toBeVisible()
  }
  await expect(page.getByRole('heading', { name: 'How well does your system work by its own rules?' })).toBeVisible()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: 'Where is your country now?' })).toBeVisible()
  await page.getByRole('button', { name: 'See my results' }).click()
  await expect(page.getByRole('region', { name: 'Headline result' })).toBeVisible()
}

const noSideways = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
const TABS = ['2D map', '3D map', 'Exact from here', 'Explore']

test('results: "Exact from here" renders after a Quick run, with the whole-map link; no sideways scroll at 390px', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Quick/ }).click()
  await page.getByRole('button', { name: 'Skip to the first statement' }).first().click()
  await answerSincerely(page)
  const panel = page.getByRole('region', { name: 'Exact from here' })
  await expect(panel).toBeVisible()
  await expect(panel.locator('svg[aria-label]')).toBeVisible()
  await expect(panel.getByRole('listitem')).toHaveCount(5)
  await expect(panel.getByRole('button', { name: 'Here and now' })).toBeVisible()
  await expect(panel.getByRole('link', { name: /See the whole map/ })).toHaveAttribute('href', '#/map')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(panel).toBeVisible()
  await noSideways(page)
  // The link opens the map, with this run on it.
  await panel.getByRole('link', { name: /See the whole map/ }).click()
  await expect(page.getByRole('heading', { name: 'Ideology map', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Your result on the map' })).toBeVisible()
})

test('#/map: every view loads with no requests beyond the app, and the tabs work from the keyboard', async ({ page, baseURL }) => {
  const foreign: string[] = []
  page.on('request', r => {
    const u = new URL(r.url())
    if (!['data:', 'blob:'].includes(u.protocol) && u.origin !== new URL(baseURL!).origin) foreign.push(r.url())
  })
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto('/#/map')
  await expect(page.getByRole('heading', { name: 'Ideology map', level: 1 })).toBeVisible()
  await expect(page.locator('svg[aria-label^="2D map"]')).toBeVisible()
  await page.getByRole('tab', { name: '3D map' }).click()
  await expect(page.locator('svg[aria-label^="3D map"]')).toBeVisible()
  await page.getByRole('tab', { name: 'Exact from here' }).click()
  await expect(page.getByRole('heading', { name: /^Exact from / })).toBeVisible()
  await page.getByRole('tab', { name: 'Explore' }).click()
  await expect(page.getByRole('heading', { name: 'Directed distances' })).toBeVisible()
  await page.getByRole('button', { name: 'Axis slice' }).click()
  await expect(page.locator('svg[aria-label^="Axis slice"]')).toBeVisible()
  // Arrow keys move between tabs.
  await page.getByRole('tab', { name: 'Explore' }).focus()
  await page.keyboard.press('Home')
  await expect(page.getByRole('tab', { name: '2D map' })).toBeFocused()
  await expect(page.getByRole('tab', { name: '2D map' })).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: '3D map' })).toHaveAttribute('aria-selected', 'true')
  // Find (a keyboard route to every dot) picks an ideology and shows its panel; its name links to the catalogue entry.
  await page.getByRole('combobox', { name: /^Find/ }).selectOption({ label: 'Kemalism' })
  await expect(page.getByRole('heading', { name: 'Kemalism', level: 2 })).toBeVisible()
  expect(foreign).toEqual([])
  expect(errors).toEqual([])
})

for (const tab of TABS)
  test(`no sideways scrolling at 390px: #/map ${tab}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/#/map')
    await page.getByRole('tab', { name: tab }).click()
    await expect(page.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('#map-panel svg').first()).toBeVisible()
    await noSideways(page)
  })

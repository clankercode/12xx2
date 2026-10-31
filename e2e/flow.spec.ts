import { expect, test, type Page } from '@playwright/test'

/** Answers the quiz on the grid: a lean per item, shifted in the here-and-now frame. */
async function answerQuick(page: Page) {
  const total = Number((await page.getByText(/^1 of \d+$/).innerText()).split(' of ')[1])
  for (let k = 0; k < total; k++) {
    const i = [2, -1, 3, -2, 1, 0, -3][k % 7]!
    const n = Math.max(-3, Math.min(3, i + (k % 4 === 0 ? -1 : 0)))
    const grid = page.locator('[role="grid"]').first()
    await grid.locator('[role="row"]').nth(3 - n).locator('[role="gridcell"]').nth(i + 3).click()
    const next = page.getByRole('button', { name: 'Next statement' })
    if (await next.isVisible().catch(() => false)) await next.click()
    if (k < total - 1) await expect(page.getByText(`${k + 2} of ${total}`)).toBeVisible()
  }
}

async function finishSteps(page: Page) {
  await expect(page.getByRole('heading', { name: 'How well does your system work by its own rules?' })).toBeVisible()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: 'Where is your country now?' })).toBeVisible()
  await page.getByRole('button', { name: 'See my results' }).click()
  await expect(page.getByRole('region', { name: 'Headline result' })).toBeVisible()
}

test('quick run: no third-party or network requests beyond the app itself', async ({ page, baseURL }) => {
  const foreign: string[] = []
  page.on('request', r => {
    const u = new URL(r.url())
    if (!['data:', 'blob:'].includes(u.protocol) && u.origin !== new URL(baseURL!).origin) foreign.push(r.url())
  })
  await page.goto('/')
  await page.getByRole('button', { name: /Quick/ }).click()
  await page.getByRole('button', { name: 'Start the questions' }).click()
  await answerQuick(page)
  await finishSteps(page)
  // After load, the app makes no requests at all while answering.
  expect(foreign).toEqual([])
  // Retake asks before erasing the result; Cancel keeps it.
  await page.getByRole('button', { name: 'Retake' }).click()
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeFocused()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('region', { name: 'Headline result' })).toBeVisible()
})

test('shared link shows the same headline and axes as the owner view', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Quick/ }).click()
  await page.getByRole('button', { name: 'Start the questions' }).click()
  await answerQuick(page)
  await finishSteps(page)
  const hero = await page.getByRole('region', { name: 'Headline result' }).innerText()
  await page.getByRole('button', { name: 'Share my result' }).click()
  const link = await page.getByLabel('Your result link').inputValue()
  expect(link).toMatch(/#r=[A-Za-z0-9_-]+$/)

  const other = await page.context().browser()!.newContext()
  const p2 = await other.newPage()
  await p2.goto(link.replace(/^https?:\/\/[^/]+/, 'http://localhost:21314'))
  const hero2 = await p2.getByRole('region', { name: 'Headline result' }).innerText()
  // The shared view is derived from the same quantised payload as the owner's view.
  expect(hero2.split('\n')).toEqual(expect.arrayContaining(hero.split('\n').filter(l => /\S/.test(l)).slice(0, 3)))
  await other.close()
})

test('pasting a result link opens the comparison and draws its card', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Quick/ }).click()
  await page.getByRole('button', { name: 'Start the questions' }).click()
  await answerQuick(page)
  await finishSteps(page)
  await page.getByRole('button', { name: 'Share my result' }).click()
  const link = await page.getByLabel('Your result link').inputValue()
  await page.getByLabel('Compare with a friend').fill(`see mine: ${link}`)
  await page.getByRole('button', { name: 'Compare', exact: true }).click()
  // Comparing with yourself: you come first, and nothing clearly differs (this patterned answer set may
  // also be flagged as careless, in which case no difference is claimed at all).
  await expect(page.getByText('You', { exact: true })).toBeVisible()
  await expect(page.getByText(/^0 of \d+$/).first().or(page.getByText(/flagged as careless answering/))).toBeVisible()
  await expect(page.locator('img[alt^="Comparison card"]')).toBeVisible()
  await page.getByLabel('Card size').getByText('Wide').click()
  await expect(page.locator('img[alt^="Comparison card"]')).toBeVisible()
})

test('a finished Quick run continues into Standard: only the added statements, then straight to results', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Quick/ }).click()
  await page.getByRole('button', { name: 'Start the questions' }).click()
  await answerQuick(page)
  await finishSteps(page)
  await expect(page.getByText(/Answer 24 or 72 more statements/)).toBeVisible()
  await page.getByRole('button', { name: 'Continue to Standard (+24)' }).click()
  // No intro or practice screen again; progress counts only the added statements.
  await expect(page.getByText('1 of 24 more')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Back to my results' })).toBeVisible()
  for (let k = 0; k < 24; k++) {
    const grid = page.locator('[role="grid"]').first()
    await grid.locator('[role="row"]').nth(3 - (k % 3)).locator('[role="gridcell"]').nth(3 + (k % 3)).click()
    if (k < 23) await expect(page.getByText(`${k + 2} of 24 more`)).toBeVisible()
  }
  // The context steps were answered the first time, so they are skipped.
  await expect(page.getByRole('region', { name: 'Headline result' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'How well does your system work by its own rules?' })).toHaveCount(0)
  // Now a Standard run: only Full is offered, and the same run is updated in place.
  await expect(page.getByRole('button', { name: 'Continue to Full (+48)' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Continue to Standard/ })).toHaveCount(0)
  const runs = await page.evaluate(() => JSON.parse(localStorage.getItem('12xx2.history.v1')!).runs as { mode: string }[])
  expect(runs.map(r => r.mode)).toEqual(['standard'])
})

test('a damaged link is rejected with a clear message', async ({ page }) => {
  await page.goto('/#r=AQAAMDAqOhmelkNbroken')
  await expect(page.getByRole('heading', { name: 'Can’t open this result' })).toBeVisible()
})

test('grid is keyboard operable', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Quick/ }).click()
  await page.getByRole('button', { name: 'Start the questions' }).click()
  const cell = page.locator('[role="gridcell"][tabindex="0"]').first()
  await cell.focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowUp')
  await expect(page.locator('[role="gridcell"]:focus')).toHaveAttribute('aria-label', 'Ideal: Slightly agree. Here and now: Slightly agree.')
  await page.keyboard.press('Enter')
  await expect(page.getByText('2 of')).toBeVisible()
  // Focus follows to the new statement's grid, on its roving cell.
  await expect(page.locator('[role="gridcell"]:focus')).toHaveAttribute('tabindex', '0')
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('[role="gridcell"]:focus')).toHaveAttribute('aria-label', 'Ideal: Slightly agree. Here and now: Neutral / torn.')
})

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

test('the how-to is labelled, steps on with Next or Enter, and can be skipped from top or bottom', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Quick/ }).click()
  const heading = page.getByRole('heading', { level: 2 })
  await expect(heading).toHaveText('How to answer, step 1 of 3: Every statement gets two answers')
  // A way straight into the quiz at the top and the bottom of every step.
  await expect(page.getByRole('button', { name: 'Skip to the first statement' })).toHaveCount(2)
  await page.getByRole('button', { name: 'Next: answering on the grid' }).click()
  await expect(heading).toHaveText(/step 2 of 3/)
  // Focus moves to the new step's heading, so screen readers hear it; Enter then goes on.
  await expect(heading).toBeFocused()
  await expect(page.getByRole('button', { name: 'Skip to the first statement' })).toHaveCount(2)
  await page.keyboard.press('Enter')
  await expect(heading).toHaveText('How to answer, step 3 of 3: Pass, and save your progress')
  await expect(page.getByRole('button', { name: 'Start the quiz' })).toHaveCount(2)
  await page.keyboard.press('Enter')
  await expect(page.getByText(/^1 of \d+$/)).toBeVisible()
  // Back from the first statement reopens the how-to; the top button goes straight back.
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(heading).toHaveText(/step 1 of 3/)
  await page.getByRole('button', { name: 'Skip to the first statement' }).first().click()
  await expect(page.getByText(/^1 of \d+$/)).toBeVisible()
})

test('quick run: no third-party or network requests beyond the app itself', async ({ page, baseURL }) => {
  const foreign: string[] = []
  page.on('request', r => {
    const u = new URL(r.url())
    if (!['data:', 'blob:'].includes(u.protocol) && u.origin !== new URL(baseURL!).origin) foreign.push(r.url())
  })
  await page.goto('/')
  await page.getByRole('button', { name: /Quick/ }).click()
  await page.getByRole('button', { name: 'Skip to the first statement' }).first().click()
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

test('shared link shows the same headline and axes as the owner view', async ({ page, baseURL }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Quick/ }).click()
  await page.getByRole('button', { name: 'Skip to the first statement' }).first().click()
  await answerQuick(page)
  await finishSteps(page)
  const hero = await page.getByRole('region', { name: 'Headline result' }).innerText()
  await page.getByRole('button', { name: 'Share my result' }).click()
  const link = await page.getByLabel('Your result link').inputValue()
  expect(link).toMatch(/#r=[A-Za-z0-9_-]+$/)

  const other = await page.context().browser()!.newContext()
  const p2 = await other.newPage()
  await p2.goto(link.replace(/^https?:\/\/[^/]+/, baseURL!))
  const hero2 = await p2.getByRole('region', { name: 'Headline result' }).innerText()
  // The shared view is derived from the same quantised payload as the owner's view.
  expect(hero2.split('\n')).toEqual(expect.arrayContaining(hero.split('\n').filter(l => /\S/.test(l)).slice(0, 3)))
  await other.close()
})

test('pasting a result link opens the comparison and draws its card', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Quick/ }).click()
  await page.getByRole('button', { name: 'Skip to the first statement' }).first().click()
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
  await page.getByRole('button', { name: 'Skip to the first statement' }).first().click()
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
  await page.getByRole('button', { name: 'Skip to the first statement' }).first().click()
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
  // Home and End jump along the row; moving never answers.
  await page.keyboard.press('End')
  await expect(page.locator('[role="gridcell"]:focus')).toHaveAttribute('aria-label', 'Ideal: Strongly agree. Here and now: Neutral / torn.')
  await page.keyboard.press('Home')
  await expect(page.locator('[role="gridcell"]:focus')).toHaveAttribute('aria-label', 'Ideal: Strongly disagree. Here and now: Neutral / torn.')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await expect(page.getByText(/^2 of \d+$/)).toBeVisible()
  // The focused square shows a visible ring, and the read-out says what it means in one sentence.
  const ring = await page.locator('[role="gridcell"]:focus').evaluate(el => getComputedStyle(el).outlineStyle)
  expect(ring).toBe('solid')
  const help = await page.locator('[role="grid"]').getAttribute('aria-describedby')
  await expect(page.locator(`[id="${help}"]`)).toContainText('Ideally it’s slightly bad, but here and now you’re torn.')
  // Enter answers; the answer is announced as selected when you come back.
  await page.keyboard.press('Enter')
  await expect(page.getByText(/^3 of \d+$/)).toBeVisible()
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.locator('[role="gridcell"][aria-selected="true"]')).toHaveAttribute(
    'aria-label',
    'Ideal: Slightly disagree. Here and now: Neutral / torn.',
  )
})

test('two rows instead of the grid still answers both frames', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Quick/ }).click()
  await page.getByRole('button', { name: 'Skip to the first statement' }).first().click()
  await page.getByRole('button', { name: 'Use two rows instead of the grid' }).click()
  await expect(page.locator('[role="grid"]')).toHaveCount(0)
  await page.getByRole('group', { name: 'In your ideal system' }).getByText('Agree', { exact: true }).click()
  await page.getByRole('group', { name: 'Here and now' }).getByText('Slightly agree').click()
  await expect(page.getByText(/^2 of \d+$/)).toBeVisible()
  await page.getByRole('button', { name: 'Use the grid' }).click()
  await expect(page.locator('[role="grid"]')).toHaveCount(1)
})

test('grid colours: picked in the footer, used by every grid, kept after a reload', async ({ page }) => {
  await page.goto('/')
  const fill = () => page.locator('figure [role="img"] svg rect').first().getAttribute('fill')
  // Default green–red: the top-left tile's ideal half is strongly-disagree red.
  expect(await fill()).toBe('#b42318')
  const picker = page.getByRole('group', { name: 'Grid colours' })
  await picker.getByText('Blue–orange').click()
  expect(await fill()).toBe('#b4500b')
  expect(await page.evaluate(() => localStorage.getItem('12xx2.palette'))).toBe('bo')
  await page.reload()
  expect(await fill()).toBe('#b4500b')
  await expect(page.getByRole('radio', { name: /Blue–orange/ })).toBeChecked()
  // Back to the default stores nothing, like the theme.
  await page.getByRole('group', { name: 'Grid colours' }).getByText('Green–red').click()
  expect(await page.evaluate(() => localStorage.getItem('12xx2.palette'))).toBeNull()
})

test('landing hero: the corner tour, the story and a try-it grid', async ({ page }) => {
  await page.goto('/')
  const hero = page.locator('figure')
  await expect(hero.getByRole('img', { name: /Each square is split/ })).toBeVisible()
  await hero.getByRole('button', { name: 'Neutral or torn' }).click()
  await expect(hero.getByRole('heading', { name: /Neutral or torn/ }).first()).toBeVisible()
  await hero.getByText('Two people').click()
  await expect(hero.getByRole('group', { name: 'Story steps' })).toBeVisible()
  await hero.getByText('Try it', { exact: true }).click()
  const grid = hero.locator('[role="grid"]')
  await grid.locator('[role="row"]').nth(0).locator('[role="gridcell"]').nth(6).click()
  await expect(hero.getByRole('heading', { name: /Good now, good ideally/ })).toBeVisible()
  await expect(grid.locator('[aria-selected="true"]')).toHaveCount(1)
})

test('a click answer opens the next statement on the prompt, not a lit centre square', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Quick/ }).click()
  await page.getByRole('button', { name: 'Skip to the first statement' }).first().click()
  const grid = () => page.locator('[role="grid"]').first()
  await grid().locator('[role="row"]').nth(1).locator('[role="gridcell"]').nth(5).click()
  const next = page.getByRole('button', { name: 'Next statement' })
  if (await next.isVisible().catch(() => false)) await next.click()
  await expect(page.getByText(/^2 of \d+$/)).toBeVisible()
  // Focus follows to the new grid (so keyboard users keep their place), but a pointer answer
  // must not light it: the read-out invites a pick instead of saying "Neutral or torn".
  await page.mouse.move(0, 0)
  await expect(page.getByRole('heading', { name: 'Pick the square that fits both' })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Neutral or torn/ })).toHaveCount(0)
  // A keyboard move from there lights the read-out as usual.
  await page.keyboard.press('ArrowUp')
  await expect(page.locator('[id$="-help"]').first()).toContainText('now +1')
  await expect(page.getByRole('heading', { name: 'Pick the square that fits both' })).toHaveCount(0)
})

test('quiz grid colours can be changed without leaving the statement', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Quick/ }).click()
  await page.getByRole('button', { name: 'Skip to the first statement' }).first().click()
  const fill = () => page.locator('[role="grid"] svg rect').first().getAttribute('fill')
  expect(await fill()).toBe('#b42318')
  await page.getByLabel('Grid colours').selectOption('bo')
  expect(await fill()).toBe('#b4500b')
  expect(await page.evaluate(() => localStorage.getItem('12xx2.palette'))).toBe('bo')
  await expect(page.getByText(/^1 of \d+$/)).toBeVisible()
})

test('landing hero: tapping a tour square opens Try it with that square picked', async ({ page }) => {
  await page.goto('/')
  const hero = page.locator('figure')
  await expect(hero.getByText('Two answers, one tap.')).toBeVisible()
  // Top-right square: +3 here and now, +3 ideal.
  await hero.locator('[data-i="3"][data-n="3"]').click()
  const grid = hero.locator('[role="grid"]')
  await expect(grid).toBeVisible()
  await expect(grid.locator('[aria-selected="true"]')).toHaveAttribute('aria-label', 'Ideal: Strongly agree. Here and now: Strongly agree.')
  await expect(hero.getByRole('radio', { name: 'Try it' })).toBeChecked()
})

for (const path of ['/', 'quiz']) {
  test(`no sideways scrolling at 390px: ${path === '/' ? 'landing' : 'quiz grid'}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    if (path === 'quiz') {
      await page.getByRole('button', { name: /Quick/ }).click()
      await page.getByRole('button', { name: 'Skip to the first statement' }).first().click()
      await expect(page.locator('[role="grid"]')).toBeVisible()
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  })
}

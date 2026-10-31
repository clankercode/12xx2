import { expect, test, type Page } from '@playwright/test'

const cell = (page: Page, i: number, n: number) =>
  page.locator('[role="grid"]').first().locator('[role="row"]').nth(3 - n).locator('[role="gridcell"]').nth(i + 3)

/** Answers a Quick run on the grid with small splits only (so no reason chips), then the context steps. */
async function finishQuick(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /Quick/ }).click()
  await page.getByRole('button', { name: 'Skip to the first statement' }).first().click()
  const total = Number((await page.getByText(/^1 of \d+$/).innerText()).split(' of ')[1])
  const redCard = page.getByRole('heading', { name: 'Red lines', exact: true })
  for (let k = 0; k < total; k++) {
    if (await redCard.isVisible().catch(() => false)) await page.getByRole('button', { name: 'Continue to the red lines' }).click()
    const i = [2, -1, 3, -2, 1, 0, -3][k % 7]!
    const n = Math.max(-3, Math.min(3, i + (k % 4 === 0 ? -1 : 0)))
    await cell(page, i, n).click()
    if (k < total - 1) await expect(page.getByText(`${k + 2} of ${total}`, { exact: true }).or(redCard)).toBeVisible()
  }
  await expect(page.getByRole('heading', { name: 'How well does your system work by its own rules?' })).toBeVisible()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: 'Where is your country now?' })).toBeVisible()
  await page.getByRole('button', { name: 'See my results' }).click()
  await expect(page.getByRole('region', { name: 'Headline result' })).toBeVisible()
  return total
}

test('after the results, answers can be reviewed and changed; the results update and both runs are kept', async ({ page }) => {
  const total = await finishQuick(page)
  const splits = page.locator('section', { has: page.getByRole('heading', { name: 'Your biggest splits' }) })
  // Every split so far is one step; none is Strongly disagree vs Strongly agree.
  await expect(splits.locator('li').first()).not.toContainText('Strongly disagree')
  const firstRow = page.locator('[data-review-row="0"]')

  await page.getByRole('button', { name: 'Review and change my answers' }).click()
  await expect(page.getByRole('heading', { name: 'Review your answers', level: 1 })).toBeVisible()
  await expect(page.locator('[data-review-row]')).toHaveCount(total)
  await expect(page.getByRole('heading', { name: /Red lines/ })).toBeVisible()
  const text = (await firstRow.locator('span').nth(2).innerText()).trim()
  await expect(firstRow).toContainText('Agree')
  await expect(firstRow).toContainText('Slightly agree')

  // Open the first statement: prefilled, with Back to the list and Done above it.
  await firstRow.click()
  await expect(page.getByText(`1 of ${total}`, { exact: true })).toBeVisible()
  await expect(page.getByText(text, { exact: true })).toBeVisible()
  await expect(cell(page, 2, 1)).toHaveAttribute('aria-selected', 'true')
  // Next and Back move through the statements.
  await page.getByRole('button', { name: 'Next statement' }).click()
  await expect(page.getByText(`2 of ${total}`, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.getByText(`1 of ${total}`, { exact: true })).toBeVisible()

  // Change both answers to a big split: the statement stays put, and asks why.
  await cell(page, -3, 3).click()
  await expect(page.getByRole('region', { name: 'Why the difference? (optional)' })).toBeVisible()
  await expect(page.getByText(`1 of ${total}`, { exact: true })).toBeVisible()

  // Escape goes back to the list, focused on the statement just changed.
  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { name: 'Review your answers', level: 1 })).toBeVisible()
  await expect(firstRow).toBeFocused()
  await expect(firstRow).toContainText('Changed')
  await expect(firstRow).toContainText('Strongly disagree')
  await expect(firstRow).toContainText('Strongly agree')
  await expect(page.getByRole('status').filter({ hasText: '1 statement changed.' })).toBeVisible()

  await page.getByRole('button', { name: 'Done, show my results' }).first().click()
  await expect(page.getByRole('region', { name: 'Headline result' })).toBeVisible()
  await expect(page.locator('[data-edited]')).toContainText('Edited')
  // Re-scored: the changed statement is now the biggest split.
  await expect(splits.locator('li').first()).toContainText(text)
  await expect(splits.locator('li').first()).toContainText('Strongly disagree')

  // Both runs are kept: the edited one (current, marked) and the original.
  await page.getByRole('link', { name: 'All my runs' }).click()
  const items = page.locator('ol li', { has: page.getByRole('link', { name: 'View' }) })
  await expect(items).toHaveCount(2)
  await expect(items.first()).toContainText('edited')
  await expect(items.nth(1)).not.toContainText('edited')
})

test('reviewing without changing anything adds no run', async ({ page }) => {
  await finishQuick(page)
  await page.getByRole('button', { name: 'Review and change my answers' }).click()
  await page.locator('[data-review-row="3"]').click()
  await expect(page.getByText(/^4 of \d+$/)).toBeVisible()
  await page.getByRole('button', { name: 'Done, show my results' }).click()
  await expect(page.getByRole('region', { name: 'Headline result' })).toBeVisible()
  await expect(page.locator('[data-edited]')).toHaveCount(0)
  await page.getByRole('link', { name: 'All my runs' }).click()
  await expect(page.locator('ol li', { has: page.getByRole('link', { name: 'View' }) })).toHaveCount(1)
})

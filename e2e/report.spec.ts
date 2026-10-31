import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import type { Session } from '../src/state/session'
import type { Report } from '../src/engine/report'

const axes = ['fed', 'dem', 'lib', 'col', 'pla', 'glo', 'int', 'mil', 'mul', 'rel', 'pro', 'tec']
const items = axes.flatMap(axis => (JSON.parse(readFileSync(new URL(`../content/items/${axis}.json`, import.meta.url), 'utf8')).items as { id: string; key: number; tier: string }[]).filter(item => item.tier === 'quick'))
const redLines = JSON.parse(readFileSync(new URL('../content/items/red.json', import.meta.url), 'utf8')).items as { id: string; humane: number }[]

for (const clipboard of ['modern', 'fallback', 'manual'] as const) {
  test(`full report is owner-only and copies via ${clipboard}`, async ({ page }) => {
    if (clipboard === 'fallback') await page.setViewportSize({ width: 390, height: 844 })
    const session: Session = {
      v: 1, mode: 'quick', stage: 'done', finishedAt: '2026-11-01T00:00:00.000Z', runId: 'abcdef1234567890',
      index: items.length + redLines.length, input: 'grid', sc: {}, country: null, q: {}, save: false, incoming: null, extendFrom: null, extendRed: null, review: null, editedFrom: null,
      answers: Object.fromEntries([
        ...items.map(it => [it.id, { i: it.key * 2, n: it.key, input: 'grid' }]),
        ...redLines.map(r => [r.id, { i: r.humane, n: r.humane, input: 'rows' }]),
      ]) as Session['answers'],
    }
    await page.addInitScript(({ session, clipboard }) => {
      localStorage.setItem('12xx2.session.v1', JSON.stringify(session))
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
        writeText: async (text: string) => {
          if (clipboard !== 'modern') throw new Error('No clipboard permission')
          ;(window as Window & { copiedReport?: string }).copiedReport = text
        },
      } })
      Object.defineProperty(document, 'execCommand', { configurable: true, value: (command: string) => {
        if (clipboard === 'manual') return false
        if (command !== 'copy') throw new Error('Expected copy')
        ;(window as Window & { copiedReport?: string }).copiedReport = (document.activeElement as HTMLTextAreaElement).value
        return true
      } })
    }, { session, clipboard })
    await page.goto('/#/results')
    await expect(page.getByRole('region', { name: 'Headline result' })).toBeVisible()
    const disclosure = page.locator('details').filter({ hasText: 'For feedback and debugging' })
    await expect(disclosure).not.toHaveAttribute('open')
    await disclosure.locator('summary').click()
    await expect(page.getByRole('button', { name: 'Copy full report' })).toBeVisible()
    if (clipboard === 'fallback') expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
    await page.getByLabel('Also explain:').selectOption('critical-rationalism')
    const requests: string[] = []
    page.on('request', req => requests.push(req.url()))
    await page.getByRole('button', { name: 'Copy full report' }).click()
    let text: string
    if (clipboard === 'manual') {
      await expect(disclosure.getByRole('status')).toContainText('Copy is unavailable')
      text = await page.getByRole('textbox', { name: 'Full diagnostic report' }).inputValue()
    } else {
      await expect(disclosure.getByRole('status')).toHaveText('Copied')
      text = await page.evaluate(() => (window as Window & { copiedReport?: string }).copiedReport!)
      await expect(page.getByRole('button', { name: 'Copy full report' })).toBeFocused()
    }
    const report = JSON.parse(text.slice(text.indexOf('\n') + 1)) as Report
    expect(report.focus).toEqual(['critical-rationalism'])
    expect(report.statements).toHaveLength(items.length + redLines.length)
    for (const frame of ['ideal', 'now', 'joint'] as const) {
      expect(report.rankings[frame]).toHaveLength(48)
      expect(report.rankings[frame].find(r => r.slug === 'critical-rationalism')?.breakdown).not.toBeNull()
    }
    expect(requests).toEqual([])
    await page.getByRole('button', { name: 'Share my result' }).click()
    const link = await page.getByLabel('Your result link').inputValue()
    await page.goto(link)
    await expect(page.getByRole('region', { name: 'Headline result' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Copy full report', includeHidden: true })).toHaveCount(0)
    await expect(page.getByText('For feedback and debugging')).toHaveCount(0)
    const encoded = link.slice(link.indexOf('#r=') + 3)
    await page.goto(`/#c=${encoded}~${encoded}`)
    await expect(page.getByText('Comparing two results. Each link contains scores only, never answers.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Copy full report', includeHidden: true })).toHaveCount(0)
    await expect(page.getByText('For feedback and debugging')).toHaveCount(0)
  })
}

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const css = readFileSync('src/styles/global.css', 'utf8')
const decls = (block: string) =>
  [...block.matchAll(/(--[\w-]+|color-scheme)\s*:\s*([^;]+);/g)].map(m => `${m[1]}: ${m[2]!.trim()}`).sort()
const after = (marker: string) => {
  const from = css.indexOf(marker)
  return css.slice(from, css.indexOf('}', from))
}

describe('theme tokens', () => {
  const picked = decls(after(":root[data-theme='light'] {"))
  const system = decls(after(":root:not([data-theme='dark']) {"))

  it('light theme is the same whether picked or followed from the system', () => {
    expect(picked.length).toBeGreaterThan(10)
    expect(system).toEqual(picked)
  })

  it('pre-paint script and picker agree with the CSS on key and background colours', () => {
    const js = readFileSync('public/theme.js', 'utf8')
    const ts = readFileSync('src/ui/theme.ts', 'utf8')
    const darkInk = decls(after(':root {')).find(d => d.startsWith('--ink:'))!.split(': ')[1]!
    const lightInk = picked.find(d => d.startsWith('--ink:'))!.split(': ')[1]!
    for (const src of [js, ts]) {
      expect(src).toContain("'12xx2.theme'")
      expect(src).toContain(`'${darkInk}'`)
      expect(src).toContain(`'${lightInk}'`)
    }
    const html = readFileSync('index.html', 'utf8')
    expect(html).toContain(`content="${darkInk}" media="(prefers-color-scheme: dark)"`)
    expect(html).toContain(`content="${lightInk}" media="(prefers-color-scheme: light)"`)
  })
})

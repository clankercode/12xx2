import { describe, expect, it } from 'vitest'
import { PALETTE_IDS, PALETTES, contrast, signed } from '../src/lab/palettes'

describe('lab palettes', () => {
  for (const id of PALETTE_IDS) {
    const p = PALETTES[id]
    it(`${id}: ink clears 4.5:1 on every fill`, () => {
      for (let v = -3; v <= 3; v++) expect(contrast(p.fill(v), p.ink(v))).toBeGreaterThanOrEqual(4.5)
    })
    it(`${id}: seven distinct steps, neutral in the middle`, () => {
      const fills = [-3, -2, -1, 0, 1, 2, 3].map(v => p.fill(v))
      expect(new Set(fills).size).toBe(7)
      expect(p.fill(0)).toBe(p.neutral)
      expect(p.fill(9)).toBe(p.fill(3))
      expect(p.fill(-9)).toBe(p.fill(-3))
    })
  }
  it('signed() uses a real minus sign', () => {
    expect([signed(-2), signed(0), signed(3)]).toEqual(['−2', '0', '+3'])
  })
})

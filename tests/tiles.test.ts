import { describe, expect, it } from 'vitest'
import { PALETTE_IDS, PALETTES } from '../src/ui/tiles/palettes'
import { DEFAULT_PALETTE, PALETTE_CHOICES, parsePalette } from '../src/ui/tiles/paletteChoice'
import { cellLabel, headline, inSpotlight, regionOf, sentence } from '../src/ui/tiles/regions'

describe('grid colour choice', () => {
  it('offers every palette once, default first', () => {
    expect(PALETTE_CHOICES.map(c => c.id).sort()).toEqual([...PALETTE_IDS].sort())
    expect(PALETTE_CHOICES[0]!.id).toBe(DEFAULT_PALETTE)
  })
  it('falls back to the default for missing or unknown stored values', () => {
    expect(parsePalette(null)).toBe(DEFAULT_PALETTE)
    expect(parsePalette('purple')).toBe(DEFAULT_PALETTE)
    expect(parsePalette('bo')).toBe('bo')
    expect(parsePalette('mono')).toBe('mono')
  })
  it('the greyscale choice draws numbers on every tile', () => {
    expect(PALETTES.mono.needsGlyphs).toBe(true)
    expect(PALETTE_IDS.filter(id => PALETTES[id].needsGlyphs)).toEqual(['mono'])
  })
})

describe('split-tile regions', () => {
  it('names the four corners and the centre (columns = ideal, rows = here and now)', () => {
    expect(regionOf(3, 3)).toBe('tr')
    expect(regionOf(-3, 3)).toBe('tl')
    expect(regionOf(-1, -2)).toBe('bl')
    expect(regionOf(2, -1)).toBe('br')
    expect(regionOf(0, 0)).toBe('c')
    expect(regionOf(0, 2)).toBeNull()
    expect(regionOf(1, 0)).toBeNull()
  })
  it('headlines the torn half on the 0 row and column', () => {
    expect(headline(0, 2).title).toBe('Good now, torn about the ideal')
    expect(headline(-2, 0).title).toBe('Bad ideally, torn about now')
    expect(headline(-3, 3).title).toBe('Needed now, never ideal')
  })
  it('reads any pick back as one sentence: "and … too" when the halves agree, "but" when they part', () => {
    expect(sentence(3, 3)).toBe('Ideally it’s very good, and here and now you’d strongly back it too.')
    expect(sentence(-1, 2)).toBe('Ideally it’s slightly bad, but here and now you’d back it.')
    expect(sentence(0, -1)).toBe('You’re torn about the ideal, but here and now you’d lean against it.')
    for (let i = -3; i <= 3; i++) for (let n = -3; n <= 3; n++) expect(sentence(i as 0, n as 0)).toMatch(/^[A-Z].*\.$/)
  })
  it('the centre spotlight lights the whole 0 row and column', () => {
    expect(inSpotlight('c', 0, 3)).toBe(true)
    expect(inSpotlight('c', -2, 0)).toBe(true)
    expect(inSpotlight('c', 1, 1)).toBe(false)
    expect(inSpotlight('tr', 1, 1)).toBe(true)
  })
  it('labels a cell with both halves', () => {
    expect(cellLabel(1, -2)).toBe('Here and now: Disagree (−2). Ideal system: Slightly agree (+1).')
  })
})

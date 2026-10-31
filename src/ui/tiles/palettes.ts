/**
 * Diverging colour scales for the answer grid prototypes (#/lab).
 *
 * Each scale maps an answer value −3..+3 to a fill colour. 0 is always a mid
 * grey (visibly "neutral", never a hue), and saturation/darkness grows with |v|
 * so the scale still reads as an ordered ramp without hue. Negative = disagree
 * / bad, positive = agree / good.
 *
 * `ink(v)` is the text colour for glyphs drawn ON a fill: whichever of INK_DARK
 * / INK_LIGHT has the higher WCAG contrast. The fills are chosen so that the
 * winner always clears 4.5:1 (tests/lab-palettes.test.ts enforces it).
 *
 * Contrast checks (WCAG 2.x relative luminance; recomputed by
 * `pnpm tsx scripts/lab-palette-report.ts`):
 *
 *   ink on fill, minimum over v = −3..+3 (must be ≥ 4.5):
 *     gr   green / red    5.38  (+3: white on #1b7a3e)
 *     bo   blue / orange  5.13  (−3: white on #b4500b)
 *     rt   red / teal     5.81  ( 0: dark on #8b90a0)
 *     mono greyscale      5.33  (−1: white on #6b6b6b)
 *   (Fills with luminance ≈ 0.17–0.20, i.e. mid grey #777-ish, fail BOTH inks;
 *   every ramp step deliberately skips that band.)
 *
 *   fill vs page background (non-text; prototypes must still OUTLINE cells,
 *   because the pale ±1 steps sit close to the light page and the dark ±3
 *   steps close to the dark page):
 *     dark  page #141726: ±1/±2 and 0 ≥ 5:1; ±3 2.6–3.5:1 (mono −3 1.6:1)
 *     light page #f4f2ec: ±3 ≥ 4.6:1; ±2 2.2–3.1:1; ±1 1.4–1.8:1 (mono +3 1.03:1)
 *     neutral #8b90a0: 5.6:1 dark page, 2.8:1 light page.
 *
 * Colour-vision checks (Machado 2009 full-severity simulation in linear RGB,
 * ΔE76 between the −v and +v fills, v = 1,2,3):
 *     gr   normal 46/89/99  protan 11/18/16  deutan  5/13/25  tritan 53/102/107
 *     bo   normal 56/105/104 protan 49/94/92 deutan 56/105/105 tritan 48/92/88
 *     rt   normal 43/80/85  protan 17/29/34 deutan 25/45/50 tritan 56/96/97
 *     mono 30/49/70 for everyone (lightness only — use the +/− glyphs)
 * So gr collapses for red–green colour blindness (hence not the CVD option);
 * bo is the strongest all-rounder; rt is the best for tritanopia and still
 * usable for red–green types.
 */

export type PaletteId = 'gr' | 'bo' | 'rt' | 'mono'

export interface Palette {
  id: PaletteId
  name: string
  /** Which colour-vision types the scale suits, in plain words. */
  description: string
  /** Fill for an answer value −3..+3 (rounded and clamped). */
  fill: (v: number) => string
  /** Text/glyph colour with ≥ 4.5:1 contrast on `fill(v)`. */
  ink: (v: number) => string
  /** The 0 / neutral fill (same as fill(0)). */
  neutral: string
  /** True when colour alone carries no sign: always draw +/− glyphs. */
  needsGlyphs: boolean
}

export const INK_DARK = '#10131f'
export const INK_LIGHT = '#ffffff'

/** Index 0 = −3 … index 6 = +3. */
type Ramp = readonly [string, string, string, string, string, string, string]

const NEUTRAL = '#8b90a0'

const RAMPS: Record<PaletteId, Ramp> = {
  // Red (bad) → green (good). Max's default; NOT safe for protan/deutan.
  gr: ['#b42318', '#e0695c', '#f2b2a8', NEUTRAL, '#a9dbb4', '#4caf6e', '#1b7a3e'],
  // Orange (bad) → blue (good). ColorBrewer PuOr/RdBu family.
  bo: ['#b4500b', '#f08c36', '#fbc58f', NEUTRAL, '#a6cbe8', '#4a8fd0', '#1f5aa6'],
  // Brick red (bad) → teal (good). The red–cyan axis survives tritanopia; the
  // brick red turns olive-brown for deutans, so it stays apart from teal.
  rt: ['#a8361b', '#de7a55', '#f3bda5', NEUTRAL, '#9fdcd3', '#36a596', '#0f6e66'],
  // Greyscale, dark (bad) → light (good). Relies on +/− glyphs.
  mono: ['#3a3a3a', '#555555', '#6b6b6b', '#9a9a9a', '#b8b8b8', '#d4d4d4', '#efefef'],
}

export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(c => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!
}

export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p) as [number, number]
  return (x + 0.05) / (y + 0.05)
}

const step = (v: number) => Math.max(-3, Math.min(3, Math.round(v))) + 3

function make(id: PaletteId, name: string, description: string, needsGlyphs = false): Palette {
  const ramp = RAMPS[id]
  const inks = ramp.map(f => (contrast(f, INK_DARK) >= contrast(f, INK_LIGHT) ? INK_DARK : INK_LIGHT))
  return {
    id,
    name,
    description,
    fill: v => ramp[step(v)]!,
    ink: v => inks[step(v)]!,
    neutral: ramp[3],
    needsGlyphs,
  }
}

export const PALETTES: Record<PaletteId, Palette> = {
  gr: make('gr', 'Green / red', 'Default. Fine for typical colour vision; not for red–green colour blindness (protanopia, deuteranopia).'),
  bo: make('bo', 'Blue / orange', 'Colour-blind safe for red–green types (protanopia, deuteranopia) and most others.'),
  rt: make('rt', 'Red / teal', 'Best for blue–yellow colour blindness (tritanopia); still usable for red–green types (protanopia, deuteranopia).'),
  mono: make('mono', 'Mono', 'Greyscale for black-and-white print or no colour vision (achromatopsia). Sign shown by +/− glyphs.', true),
}

export const PALETTE_IDS = Object.keys(PALETTES) as PaletteId[]

export const isPaletteId = (x: unknown): x is PaletteId => typeof x === 'string' && x in PALETTES

/** "+3", "−2", "0" — with a real minus sign. */
export function signed(v: number): string {
  return v > 0 ? `+${v}` : v < 0 ? `−${-v}` : '0'
}

export { RAMPS as _RAMPS }

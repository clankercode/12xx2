import { useSyncExternalStore } from 'react'
import { PALETTES, isPaletteId, type Palette, type PaletteId } from './palettes'

/**
 * The answer grid's colour scale, chosen in the footer next to the theme. Stored in
 * localStorage like the theme (nothing stored = the default); every grid on the page
 * re-renders when it changes. Colours are drawn by React, so there is no pre-paint step.
 */
const KEY = '12xx2.palette'
export const DEFAULT_PALETTE: PaletteId = 'gr'

/** User-facing names: what each scale is for, in colour-vision terms. Order = picker order. */
export const PALETTE_CHOICES: { id: PaletteId; name: string; hint: string }[] = [
  { id: 'gr', name: 'Green–red', hint: 'Default' },
  { id: 'bo', name: 'Blue–orange', hint: 'Colour-blind safe (red–green)' },
  { id: 'rt', name: 'Teal–red', hint: 'Colour-blind safe (blue–yellow)' },
  { id: 'mono', name: 'Greyscale', hint: 'No colour; numbers on every square' },
]

/** A stored value, or the default when it is missing or unknown. */
export const parsePalette = (raw: unknown): PaletteId => (isPaletteId(raw) ? raw : DEFAULT_PALETTE)

function load(): PaletteId {
  try {
    return parsePalette(localStorage.getItem(KEY))
  } catch {
    return DEFAULT_PALETTE
  }
}

let current: PaletteId | null = null
const listeners = new Set<() => void>()

export function readPalette(): PaletteId {
  return (current ??= load())
}

export function applyPalette(id: PaletteId) {
  current = id
  try {
    if (id === DEFAULT_PALETTE) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, id)
  } catch {
    /* storage blocked: the choice lasts for this page only */
  }
  for (const l of listeners) l()
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** The chosen palette; re-renders when the footer picker changes it. */
export function usePalette(): Palette {
  return PALETTES[useSyncExternalStore(subscribe, readPalette, () => DEFAULT_PALETTE)]
}

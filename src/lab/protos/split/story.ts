import type { V } from '../../kit'
import { FRAMES, PERSONAS, type Frame, type Half } from '../story/story'

/**
 * The "Story tour" variant of the hero, borrowed from prototype D: two people answer the
 * landing statement with the same ideal column but different here-and-now rows. The frames
 * (copy, timing, pins, bands) are D's; this file only maps a frame onto C's split tiles.
 */

export { FRAMES as STORY, PERSONAS, type Frame, type Half }

const at = (i: V, n: V) => `${i}:${n}`

/** Squares whose pins are live (not ghosted) in a frame: they print numerals and stay lit. */
export function activeCells(f: Frame): Set<string> {
  const s = new Set<string>()
  if (f.a && !f.a.ghost) s.add(at(f.a.i, f.a.n))
  if (f.b && !f.b.ghost) s.add(at(f.b.i, f.b.n))
  return s
}

/**
 * How a tile looks in a frame. `dim` = outside the lit band; `veil` = the half that is not
 * being answered yet (column phase veils "now", row phase veils "ideal"), so the viewer
 * learns which triangle belongs to which question.
 */
export function storyCell(f: Frame, i: V, n: V): { dim: boolean; veil: Half | null } {
  const band = f.band
  if (!band) return { dim: false, veil: null }
  const live = activeCells(f).has(at(i, n))
  if (band.kind === 'col') {
    if (i !== band.i) return { dim: !live, veil: null }
    return { dim: false, veil: band.half === 'ideal' ? 'now' : null }
  }
  if (n !== band.n) return { dim: !live, veil: null }
  return { dim: false, veil: live ? null : 'ideal' }
}

/** The vertical span the "gap" frame brackets: persona A's and B's rows in their shared column. */
export function gapSpan(): { i: V; top: V; bottom: V; rows: number } {
  const { a, b } = PERSONAS
  return { i: a.i, top: Math.max(a.n, b.n) as V, bottom: Math.min(a.n, b.n) as V, rows: Math.abs(a.n - b.n) }
}

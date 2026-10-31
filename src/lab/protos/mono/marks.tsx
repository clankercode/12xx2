import { signed, type Palette } from '../../palettes'
import type { V } from '../../kit'
import css from './mono.module.css'

/**
 * Ink-first cell drawing. Every triangle carries its value as MARKS: one to
 * three "+" (agree) or "−" (disagree) pips, or a small ring for neutral. The
 * count is the strength, so the cell reads on a black-and-white printout with
 * no colour at all; the palette fill is an enhancement layered underneath.
 *
 * Geometry (viewBox 0..100): the top-left triangle is HERE AND NOW, the
 * bottom-right triangle is IDEAL SYSTEM. Pips line up parallel to the
 * diagonal so a cell reads as two short "rows of ink".
 */

export type Show = 'marks' | 'numerals' | 'none'

/** Pip centres for the top-left (now) triangle; the ideal triangle mirrors them. */
const PIPS: Record<0 | 1 | 2 | 3, readonly (readonly [number, number])[]> = {
  0: [[29, 29]],
  1: [[29, 29]],
  2: [
    [22, 36],
    [36, 22],
  ],
  3: [
    [15, 43],
    [29, 29],
    [43, 15],
  ],
}

const ARM = 7

function pipPath(v: V, half: 'now' | 'ideal'): string {
  const pts = PIPS[Math.abs(v) as 0 | 1 | 2 | 3]
  return pts
    .map(([px, py]) => {
      const [x, y] = half === 'now' ? [px, py] : [100 - px, 100 - py]
      const bar = `M${x - ARM} ${y}H${x + ARM}`
      return v > 0 ? `${bar}M${x} ${y - ARM}V${y + ARM}` : bar
    })
    .join('')
}

function Marks({ v, half, palette }: { v: V; half: 'now' | 'ideal'; palette: Palette }) {
  const ink = palette.ink(v)
  if (v === 0) {
    const [x, y] = half === 'now' ? [29, 29] : [71, 71]
    return <circle cx={x} cy={y} r={5.5} fill="none" stroke={ink} strokeWidth={3.2} />
  }
  return <path d={pipPath(v, half)} stroke={ink} strokeWidth={4.6} strokeLinecap="butt" fill="none" />
}

function Numeral({ v, half, palette }: { v: V; half: 'now' | 'ideal'; palette: Palette }) {
  const [x, y] = half === 'now' ? [31, 33] : [69, 71]
  return (
    <text x={x} y={y} fill={palette.ink(v)} className={css.numeral}>
      {signed(v)}
    </text>
  )
}

export function SplitCell({
  now,
  ideal,
  palette,
  show,
  className,
  box,
}: {
  now: V
  ideal: V
  palette: Palette
  show: Show
  className?: string
  /** Position inside a parent SVG (x, y, size in the parent's units). */
  box?: readonly [number, number, number]
}) {
  const place = box ? { x: box[0], y: box[1], width: box[2], height: box[2] } : {}
  return (
    <svg viewBox="0 0 100 100" className={className ?? css.svg} aria-hidden focusable="false" {...place}>
      {/* Ideal fills the square and "now" is drawn over it: abutting triangles
          leave an anti-aliased seam on same-colour cells. */}
      <rect width="100" height="100" fill={palette.fill(ideal)} />
      <polygon points="0,0 100,0 0,100" fill={palette.fill(now)} />
      {/* The diagonal itself, so two equal fills still read as two answers. */}
      <path d="M100 0L0 100" className={css.seam} />
      {show === 'marks' && (
        <g className={css.marks}>
          <Marks v={now} half="now" palette={palette} />
          <Marks v={ideal} half="ideal" palette={palette} />
        </g>
      )}
      {show === 'numerals' && (
        <>
          <Numeral v={now} half="now" palette={palette} />
          <Numeral v={ideal} half="ideal" palette={palette} />
        </>
      )}
    </svg>
  )
}

/** One flat (unsplit) swatch with marks, for the scale key. */
export function ScaleChip({ v, palette }: { v: V; palette: Palette }) {
  const pts = PIPS[Math.abs(v) as 0 | 1 | 2 | 3]
  // Lay the pips out horizontally, centred.
  const xs = pts.length === 1 ? [50] : pts.length === 2 ? [38, 62] : [26, 50, 74]
  const ink = palette.ink(v)
  return (
    <svg viewBox="0 0 100 100" className={css.chipSvg} aria-hidden focusable="false">
      <rect width="100" height="100" fill={palette.fill(v)} />
      {v === 0 ? (
        <circle cx={50} cy={50} r={9} fill="none" stroke={ink} strokeWidth={5} />
      ) : (
        <path
          d={xs.map(x => `M${x - 10} 50H${x + 10}${v > 0 ? `M${x} 40V60` : ''}`).join('')}
          stroke={ink}
          strokeWidth={6.5}
          fill="none"
        />
      )}
    </svg>
  )
}

/** Tiny split square for the corner tabs: one big + or − per half. */
export function MiniSplit({ now, ideal, palette }: { now: V; ideal: V; palette: Palette }) {
  // Neutral (0) is a ring, as in the cells — never a bare bar, which reads as "−".
  const mark = (v: V, x: number, y: number) =>
    v > 0
      ? `M${x - 11} ${y}H${x + 11}M${x} ${y - 11}V${y + 11}`
      : v < 0
        ? `M${x - 11} ${y}H${x + 11}`
        : `M${x - 8} ${y}a8 8 0 1 0 16 0a8 8 0 1 0 -16 0`
  return (
    <svg viewBox="0 0 100 100" className={css.mini} aria-hidden focusable="false">
      <rect width="100" height="100" fill={palette.fill(ideal)} />
      <polygon points="0,0 100,0 0,100" fill={palette.fill(now)} />
      <path d="M100 0L0 100" className={css.seam} />
      <path d={mark(now, 30, 30)} stroke={palette.ink(now)} strokeWidth={9} fill="none" />
      <path d={mark(ideal, 70, 70)} stroke={palette.ink(ideal)} strokeWidth={9} fill="none" />
    </svg>
  )
}

import { useEffect, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react'
import { LABEL, VALUES, type V } from '../answer'
import { signed, type Palette } from './palettes'
import { REGIONS, type RegionId } from './regions'
import { PERSONAS, type Half } from './storyFrames'
import css from './tiles.module.css'

/**
 * Pieces of the "split tiles" answer grid (prototype C v2 in the lab), shared by the quiz
 * grid (Grid.tsx) and the landing hero (HeroDemo.tsx). Geometry: columns = ideal system
 * −3 (left) → +3 (right); rows = here and now +3 (top) → −3 (bottom). Each tile is split on
 * its diagonal: top-left triangle = here and now, bottom-right triangle = ideal system.
 */

export { css as tileCss }

/** Ideal (columns, left → right) and here and now (rows, top → bottom). */
export const COLS: readonly V[] = VALUES
export const ROWS: readonly V[] = [...VALUES].reverse() as V[]
export const cellKey = (i: V, n: V) => `${i}:${n}`
export const clampV = (v: number) => Math.max(-3, Math.min(3, v)) as V
export const HALF_NAME: Record<Half, string> = { now: 'Here and now', ideal: 'Ideal system' }

const NOW_PTS = '0,0 100,0 0,100'
const IDEAL_PTS = '100,0 100,100 0,100'

/** Live prefers-reduced-motion (the OS setting can change while the page is open). */
export function useReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)'
  const [reduced, setReduced] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(query).matches)
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return
    const m = matchMedia(query)
    const on = () => setReduced(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return reduced
}

/** One split tile. `glyphs` prints the signed value in each half (hover, focus, pick, mono). */
export function Tile({ now, ideal, palette, glyphs, veil }: { now: V; ideal: V; palette: Palette; glyphs: boolean; veil?: Half | null }) {
  return (
    <svg viewBox="0 0 100 100" className={css.tileSvg} aria-hidden>
      <g className={css.fills}>
        {/* Ideal fills the square, "now" is drawn over it: no anti-aliased seam on same-colour tiles. */}
        <rect width="100" height="100" fill={palette.fill(ideal)} />
        <polygon points={NOW_PTS} fill={palette.fill(now)} />
        {veil && <polygon points={veil === 'now' ? NOW_PTS : IDEAL_PTS} className={css.veil} />}
      </g>
      <line x1="100" y1="0" x2="0" y2="100" className={css.seam} />
      {glyphs && (
        <g className={css.glyphs}>
          {veil !== 'now' && (
            <text x="31" y="35" fill={palette.ink(now)}>
              {signed(now)}
            </text>
          )}
          {veil !== 'ideal' && (
            <text x="69" y="73" fill={palette.ink(ideal)}>
              {signed(ideal)}
            </text>
          )}
        </g>
      )}
    </svg>
  )
}

/** Inline triangle swatch (SVG, so it can carry a hairline edge). */
export function Tri({ half, fill }: { half: Half; fill: string }) {
  return (
    <svg viewBox="0 0 100 100" className={css.tri} data-half={half} aria-hidden>
      <polygon points={half === 'now' ? NOW_PTS : IDEAL_PTS} fill={fill} />
    </svg>
  )
}

/** "◤ now +2  ◢ ideal +1": the two halves of a tile as a kicker line. */
export function Values({ i, n, palette, children }: { i: V; n: V; palette: Palette; children?: ReactNode }) {
  return (
    <p className={css.kicker}>
      <Tri half="now" fill={palette.fill(n)} />
      now {signed(n)}
      <span className="visually-hidden">, </span>
      <Tri half="ideal" fill={palette.fill(i)} />
      ideal {signed(i)}
      {children && <span className="visually-hidden">. </span>}
      {children}
    </p>
  )
}

/** A teaching tile: one half in colour, the other half as a dashed ghost. */
function HalfGlyph({ half, palette }: { half: Half; palette: Palette }) {
  const now = 'M0,0 L100,0 L0,100 Z'
  const ideal = 'M100,0 L100,100 L0,100 Z'
  return (
    <svg viewBox="-4 -4 108 108" className={css.halfGlyph} aria-hidden>
      <path d={half === 'now' ? ideal : now} className={css.ghost} />
      <path d={half === 'now' ? now : ideal} fill={palette.fill(2)} className={css.halfFill} />
    </svg>
  )
}

function Ramp({ half, palette, value }: { half: Half; palette: Palette; value: V | null }) {
  return (
    <div className={css.ramp}>
      {VALUES.map(v => (
        <span key={v} className={css.rampStep} data-on={v === value || undefined}>
          <svg viewBox="0 0 100 100" className={css.rampSvg} aria-hidden>
            <polygon points={half === 'now' ? NOW_PTS : IDEAL_PTS} fill={palette.fill(v)} />
          </svg>
          <span className={css.rampNum}>{signed(v)}</span>
        </span>
      ))}
    </div>
  )
}

/** Two-row legend: one row per half, each a −3…+3 ramp; markers track the current cell. */
export function Legend({ palette, cell }: { palette: Palette; cell: Partial<Record<Half, V>> | null }) {
  return (
    <div className={css.legend} aria-hidden>
      {(['now', 'ideal'] as const).map(half => (
        <div key={half} className={css.legendRow}>
          <HalfGlyph half={half} palette={palette} />
          <div className={css.legendText}>
            <span className={css.legendWhere}>{half === 'now' ? 'Top-left half' : 'Bottom-right half'}</span>
            <strong className={css.legendName}>{HALF_NAME[half]}</strong>
          </div>
          <Ramp half={half} palette={palette} value={cell?.[half] ?? null} />
        </div>
      ))}
      <p className={css.legendScale}>
        <span>−3 {LABEL[-3].toLowerCase()}</span>
        <span>+3 {LABEL[3].toLowerCase()}</span>
      </p>
    </div>
  )
}

/** One-line key for tight spots (the quiz): which half is which. */
export function Key({ palette }: { palette: Palette }) {
  return (
    <p className={css.key}>
      <span>
        <HalfGlyph half="now" palette={palette} /> Top-left: <strong>here and now</strong>
      </span>
      <span>
        <HalfGlyph half="ideal" palette={palette} /> Bottom-right: <strong>your ideal system</strong>
      </span>
    </p>
  )
}

/** Corner meanings for one side of the board, each over a bracket spanning its quadrant. */
function EdgeLabels({ side, active }: { side: 'top' | 'bottom'; active: RegionId | null }) {
  const ids = side === 'top' ? (['tl', 'tr'] as const) : (['bl', 'br'] as const)
  return (
    <div className={css.edge} data-side={side} aria-hidden>
      {ids.map(id => {
        const r = REGIONS[id]
        return (
          <span key={id} className={css.edgeLabel} data-region={id} data-active={active === id || undefined}>
            <span className={css.edgeText}>
              {/* Wraps only between the two authored lines ("🩹 Needed now," / "never ideal"). */}
              <span className={css.edgeLine}>
                <span className={css.emoji}>{r.emoji}</span> {r.lines[0]}
              </span>
              {r.lines[1] && (
                <>
                  {' '}
                  <span className={css.edgeLine}>{r.lines[1]}</span>
                </>
              )}
            </span>
            <span className={css.bracket} />
          </span>
        )
      })}
    </div>
  )
}

/** Ring that glides to a tile. `who` adds a persona pin (story tour). */
export function Ring({ at, circle, ghost, who }: { at: { i: V; n: V } | null; circle: boolean; ghost?: boolean; who?: 'a' | 'b' }) {
  const p = at ?? { i: 0 as V, n: 0 as V }
  const style = { '--col': COLS.indexOf(p.i), '--row': ROWS.indexOf(p.n) } as CSSProperties
  return (
    <span
      className={css.ring}
      style={style}
      data-shown={!!at || undefined}
      data-circle={(circle && p.i === 0 && p.n === 0) || undefined}
      data-ghost={ghost || undefined}
      data-who={who}
      aria-hidden
    >
      {who && <span className={css.pin}>{PERSONAS[who].pin}</span>}
    </span>
  )
}

/**
 * The board: a tinted well with the corner meanings bracketed on its top and bottom edges,
 * the 7×7 rows, a small "Torn" tag under the centre tile, and any overlays (rings, gap mark).
 */
export function Board({
  rows,
  overlay,
  active,
  centreLit,
  hideTorn,
  cells,
}: {
  rows: ReactNode
  overlay?: ReactNode
  active: RegionId | null
  centreLit: boolean
  hideTorn?: boolean
  cells: HTMLAttributes<HTMLDivElement>
}) {
  return (
    <div className={css.board}>
      <EdgeLabels side="top" active={active} />
      <div className={css.field}>
        <div className={css.cells} {...cells}>
          {rows}
        </div>
        <span className={css.torn} data-active={centreLit || undefined} hidden={hideTorn} aria-hidden>
          <span className={css.emoji}>🤷</span>
          <span className={css.tornWord}>Torn</span>
        </span>
        {overlay}
      </div>
      <EdgeLabels side="bottom" active={active} />
    </div>
  )
}

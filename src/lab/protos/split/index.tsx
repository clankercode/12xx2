import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { COLS, LABEL, ROWS, VALUES, prefersReducedMotion, type V } from '../../kit'
import { signed, type Palette } from '../../palettes'
import type { ProtoMeta, ProtoProps } from '../../types'
import { REGIONS, TOUR, cellLabel, describe, inSpotlight, regionOf, type RegionId } from './regions'
import css from './split.module.css'

/**
 * "Split tiles": a faithful, polished take on Max's brief.
 * 7×7 tiles, each split on its anti-diagonal — top-left half = here and now,
 * bottom-right half = ideal system. The meaning of each corner is set inside
 * the grid on frosted captions; a two-row legend teaches the split and tracks
 * the current cell on each half's scale.
 */

export const meta: ProtoMeta = {
  name: 'Split tiles',
  tagline: 'Split-triangle tiles with the corner meanings written inside the grid, and a legend that teaches the halves.',
  ideas: [
    {
      id: 'split-tiles',
      title: 'Split tiles with a hairline seam',
      detail: 'Top-left half = here and now, bottom-right half = ideal; a faint diagonal keeps the split readable even when both halves match.',
    },
    {
      id: 'quadrant-captions',
      title: 'Corner captions inside the grid',
      detail: 'Each 3×3 corner carries its plain-language meaning on a frosted plate (plus “Torn” at the centre); in answer mode they fade while you hover or focus the grid.',
    },
    {
      id: 'tracking-legend',
      title: 'Two-row legend that tracks the cell',
      detail: 'One row per half, each a −3…+3 ramp drawn in that half’s triangle shape; markers show the current cell’s value on both scales.',
    },
    {
      id: 'numerals-on-focus',
      title: 'Signed numerals on hover, focus and selection',
      detail: 'The active tile prints −3…+3 in each triangle in contrast-safe ink; the mono palette shows them on every tile so it works in black and white.',
    },
    {
      id: 'spotlight-tour',
      title: 'Spotlight tour in the hero',
      detail: 'A ring glides corner to corner, dimming tiles outside the region while the caption explains it; pauses on hover, has step dots, and stays still under reduced motion.',
    },
    {
      id: 'region-emoji',
      title: 'Five region emoji, not 49',
      detail: '👍 🩹 🔭 👎 🤷 tag only the four corners and the centre — “🩹 needed now, never ideal” and “🔭 ideal, but not for us now” carry the mixed cases.',
    },
    {
      id: 'readback-sentence',
      title: 'Plain-language read-back',
      detail: 'Answer mode turns any pick into one sentence, including the half-torn edges (“Good ideally; torn about here and now”).',
    },
    {
      id: 'arrow-keys',
      title: 'Arrow-key radio grid',
      detail: 'The grid is one radio group: Tab lands on the pick (or the centre), arrows move in 2D and select, numerals follow focus.',
    },
  ],
}

const TOUR_MS = 2800
const key = (i: V, n: V) => `${i}:${n}`
const clamp = (v: number) => Math.max(-3, Math.min(3, v)) as V

/* ── Pieces ─────────────────────────────────────────────────────────────── */

function Tile({ now, ideal, palette, glyphs }: { now: V; ideal: V; palette: Palette; glyphs: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className={css.tileSvg} aria-hidden>
      {/* Ideal fills the square, "now" is drawn over it: no anti-aliased seam on same-colour tiles. */}
      <rect width="100" height="100" fill={palette.fill(ideal)} />
      <polygon points="0,0 100,0 0,100" fill={palette.fill(now)} />
      <line x1="100" y1="0" x2="0" y2="100" className={css.seam} />
      {glyphs && (
        <g className={css.glyphs}>
          <text x="31" y="35" fill={palette.ink(now)}>
            {signed(now)}
          </text>
          <text x="69" y="73" fill={palette.ink(ideal)}>
            {signed(ideal)}
          </text>
        </g>
      )}
    </svg>
  )
}

/** A teaching tile: one half in colour, the other half as a dashed ghost. */
function HalfGlyph({ half, palette }: { half: 'now' | 'ideal'; palette: Palette }) {
  const now = 'M0,0 L100,0 L0,100 Z'
  const ideal = 'M100,0 L100,100 L0,100 Z'
  return (
    <svg viewBox="-4 -4 108 108" className={css.halfGlyph} aria-hidden>
      <path d={half === 'now' ? ideal : now} className={css.ghost} />
      <path d={half === 'now' ? now : ideal} fill={palette.fill(2)} className={css.halfFill} />
    </svg>
  )
}

/** Inline triangle swatch for the read-out (SVG, so it can carry a hairline edge). */
function Tri({ half, fill }: { half: 'now' | 'ideal'; fill: string }) {
  return (
    <svg viewBox="0 0 100 100" className={css.tri} data-half={half} aria-hidden>
      <polygon points={half === 'now' ? '0,0 100,0 0,100' : '100,0 100,100 0,100'} fill={fill} />
    </svg>
  )
}

function Ramp({ half, palette, value }: { half: 'now' | 'ideal'; palette: Palette; value: V | null }) {
  const points = half === 'now' ? '0,0 100,0 0,100' : '100,0 100,100 0,100'
  return (
    <div className={css.ramp}>
      {VALUES.map(v => (
        <span key={v} className={css.rampStep} data-on={v === value || undefined}>
          <svg viewBox="0 0 100 100" className={css.rampSvg} aria-hidden>
            <polygon points={points} fill={palette.fill(v)} />
          </svg>
          <span className={css.rampNum}>{signed(v)}</span>
        </span>
      ))}
    </div>
  )
}

function Legend({ palette, cell }: { palette: Palette; cell: { i: V; n: V } | null }) {
  return (
    <div className={css.legend}>
      <div className={css.legendRow}>
        <HalfGlyph half="now" palette={palette} />
        <div className={css.legendText}>
          <span className={css.legendWhere}>Top-left half</span>
          <strong className={css.legendName} data-half="now">
            Here and now
          </strong>
        </div>
        <Ramp half="now" palette={palette} value={cell?.n ?? null} />
      </div>
      <div className={css.legendRow}>
        <HalfGlyph half="ideal" palette={palette} />
        <div className={css.legendText}>
          <span className={css.legendWhere}>Bottom-right half</span>
          <strong className={css.legendName} data-half="ideal">
            Ideal system
          </strong>
        </div>
        <Ramp half="ideal" palette={palette} value={cell?.i ?? null} />
      </div>
      <p className={css.legendScale}>
        <span>−3 strongly disagree</span>
        <span>+3 strongly agree</span>
      </p>
    </div>
  )
}

function Captions({ active }: { active: RegionId | null }) {
  return (
    <div className={css.captions} aria-hidden>
      {(['tl', 'tr', 'bl', 'br', 'c'] as const).map(id => {
        const r = REGIONS[id]
        return (
          <span key={id} className={css.caption} data-region={id} data-active={active === id || undefined}>
            <span className={css.capEmoji}>{r.emoji}</span>
            <span className={css.capText}>
              {r.lines.map((l, k) => (
                <span key={k} className={css.capLine}>
                  {l}
                </span>
              ))}
            </span>
          </span>
        )
      })}
    </div>
  )
}

/* ── Prototype ──────────────────────────────────────────────────────────── */

export default function SplitTiles({ mode, palette, statement, size = 'full' }: ProtoProps) {
  const hero = mode === 'hero'
  const [stop, setStop] = useState(0)
  const [paused, setPaused] = useState(false)
  // Keyboard users pause the tour by tabbing into it (WCAG 2.2.2), not only by hovering.
  const [focusIn, setFocusIn] = useState(false)
  const [still] = useState(prefersReducedMotion)
  const [pick, setPick] = useState<{ i: V; n: V } | null>(null)
  const [hover, setHover] = useState<{ i: V; n: V } | null>(null)
  const [focus, setFocus] = useState<{ i: V; n: V } | null>(null)
  const refs = useRef(new Map<string, HTMLButtonElement>())

  const touring = hero && !paused && !still && !focusIn
  useEffect(() => {
    if (!touring) return
    const t = setInterval(() => setStop(k => (k + 1) % TOUR.length), TOUR_MS)
    return () => clearInterval(t)
  }, [touring])

  const region = REGIONS[TOUR[stop]!]
  const lit = hero ? { i: region.i, n: region.n } : (hover ?? focus ?? pick)
  const ring = hero ? lit : pick
  const tabStop = pick ?? { i: 0 as V, n: 0 as V }

  const move = useCallback((e: KeyboardEvent, i: V, n: V) => {
    const d: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, 1],
      ArrowDown: [0, -1],
    }
    let next: { i: V; n: V } | null = null
    if (d[e.key]) next = { i: clamp(i + d[e.key]![0]), n: clamp(n + d[e.key]![1]) }
    else if (e.key === 'Home') next = { i: -3, n }
    else if (e.key === 'End') next = { i: 3, n }
    if (!next) return
    e.preventDefault()
    setPick(next)
    refs.current.get(key(next.i, next.n))?.focus()
  }, [])

  const ringStyle = ring
    ? ({ '--col': COLS.indexOf(ring.i), '--row': ROWS.indexOf(ring.n) } as CSSProperties)
    : undefined

  const activeRegion = hero ? region.id : lit ? regionOf(lit.i, lit.n) : null

  return (
    <div
      className={`${css.root} ${size === 'small' ? css.small : ''}`}
      data-mode={mode}
      data-still={still || undefined}
      onPointerEnter={hero ? () => setPaused(true) : undefined}
      onPointerLeave={hero ? () => setPaused(false) : undefined}
      onFocus={hero ? () => setFocusIn(true) : undefined}
      onBlur={
        hero
          ? e => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusIn(false)
            }
          : undefined
      }
    >
      {!hero && (
        <p className={css.statement}>
          <span className={css.statementKicker}>Statement</span>
          <span>“{statement}”</span>
        </p>
      )}

      <div className={css.boardWrap}>
        <div className={css.board} data-picked={pick ? '' : undefined}>
          <div
            className={css.cells}
            role={hero ? 'img' : 'radiogroup'}
            aria-label={
              hero
                ? 'Answer grid. Each tile is split: top-left half for here and now, bottom-right half for your ideal system.'
                : 'Your answer: pick the tile for here and now (rows) and your ideal system (columns).'
            }
          >
            {ROWS.map(n =>
              COLS.map(i => {
                const on = !!lit && lit.i === i && lit.n === n
                const glyphs = palette.needsGlyphs || on
                const dim = hero && !inSpotlight(region.id, i, n)
                const tile = <Tile now={n} ideal={i} palette={palette} glyphs={glyphs} />
                if (hero)
                  return (
                    <div key={key(i, n)} className={css.cell} data-on={on || undefined} data-dim={dim || undefined}>
                      {tile}
                    </div>
                  )
                const picked = !!pick && pick.i === i && pick.n === n
                const isTab = tabStop.i === i && tabStop.n === n
                return (
                  <button
                    key={key(i, n)}
                    ref={el => {
                      if (el) refs.current.set(key(i, n), el)
                      else refs.current.delete(key(i, n))
                    }}
                    type="button"
                    role="radio"
                    aria-checked={picked}
                    aria-label={cellLabel(i, n)}
                    tabIndex={isTab ? 0 : -1}
                    className={css.cell}
                    data-on={on || undefined}
                    data-picked={picked || undefined}
                    onClick={() => setPick({ i, n })}
                    onKeyDown={e => move(e, i, n)}
                    onPointerEnter={() => setHover({ i, n })}
                    onPointerLeave={() => setHover(null)}
                    onFocus={() => setFocus({ i, n })}
                    onBlur={() => setFocus(null)}
                  >
                    {tile}
                  </button>
                )
              }),
            )}
          </div>
          <Captions active={activeRegion} />
          <span className={css.ring} style={ringStyle} data-shown={ring ? '' : undefined} aria-hidden />
        </div>
      </div>

      <div className={css.aside}>
        {hero ? (
          <div className={css.readout} aria-live={touring ? 'off' : 'polite'}>
            <p className={css.kicker}>
              <Tri half="now" fill={palette.fill(region.n)} />
              now {signed(region.n)}
              <Tri half="ideal" fill={palette.fill(region.i)} />
              ideal {signed(region.i)}
            </p>
            <h3 className={css.readTitle}>
              <span aria-hidden>{region.emoji}</span> {region.title}
            </h3>
            <p className={css.readBody}>{region.body}</p>
          </div>
        ) : (
          <div className={css.readout} aria-live="polite">
            {lit ? (
              <>
                <p className={css.kicker}>
                  <Tri half="now" fill={palette.fill(lit.n)} />
                  now {signed(lit.n)}
                  <Tri half="ideal" fill={palette.fill(lit.i)} />
                  ideal {signed(lit.i)}
                  {pick && lit.i === pick.i && lit.n === pick.n && <span className={css.pickedTag}>your pick</span>}
                </p>
                <h3 className={css.readTitle}>{describe(lit.i, lit.n)}</h3>
                <p className={css.readBody}>
                  Here and now: <strong>{LABEL[lit.n]}</strong>. Ideal system: <strong>{LABEL[lit.i]}</strong>.
                </p>
              </>
            ) : (
              <>
                <p className={css.kicker}>Two answers, one tap</p>
                <h3 className={css.readTitle}>Pick the tile that fits both</h3>
                <p className={css.readBody}>Higher up = more for it here and now. Further right = more for it in your ideal system.</p>
              </>
            )}
          </div>
        )}

        <Legend palette={palette} cell={lit} />

        {hero && (
          <div className={css.tour} role="group" aria-label="Tour of the grid">
            {TOUR.map((id, k) => (
              <button
                key={id}
                type="button"
                className={css.dot}
                aria-label={REGIONS[id].title}
                aria-pressed={k === stop}
                title={REGIONS[id].title}
                onClick={() => {
                  setStop(k)
                  setPaused(true)
                }}
              >
                <span aria-hidden>{REGIONS[id].emoji}</span>
              </button>
            ))}
            <span className={css.tourNote}>{still ? 'Step through' : touring ? 'Touring' : 'Paused'}</span>
          </div>
        )}
      </div>
    </div>
  )
}

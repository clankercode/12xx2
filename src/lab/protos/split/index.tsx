import { useCallback, useEffect, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent, type ReactNode } from 'react'
import { COLS, LABEL, ROWS, VALUES, type V } from '../../kit'
import { signed, type Palette } from '../../palettes'
import type { ProtoMeta, ProtoOption, ProtoProps } from '../../types'
import { REGIONS, TOUR, cellLabel, headline, inSpotlight, regionOf, sentence, type RegionId } from './regions'
import { PERSONAS, STORY, activeCells, gapSpan, storyCell, type Frame, type Half } from './story'
import css from './split.module.css'

/**
 * "Split tiles": a faithful, polished take on Max's brief.
 * 7×7 tiles, each split on its anti-diagonal — top-left half = here and now,
 * bottom-right half = ideal system. The meaning of each corner is written on the
 * board's edge (or, toggled, on plates inside the grid); a two-row legend teaches
 * the split and tracks the current cell on each half's scale.
 */

export const options: ProtoOption[] = [
  {
    id: 'centreCircle',
    label: 'Centre circle',
    default: true,
    title: 'Draw the neutral/torn (0, 0) square as a circle, still split into its two halves, so the middle is easy to find.',
  },
  {
    id: 'edgeLabels',
    label: 'Labels on the edge',
    default: true,
    title: 'Corner meanings sit on the board’s top and bottom edges, bracketing their quadrant. Off: frosted plates inside the grid.',
  },
  {
    id: 'storyTour',
    label: 'Story tour',
    default: false,
    title: 'Hero: two people with the same ideal but different here and now (from prototype D). Off: the spotlight tour of the corners.',
  },
]

export const meta: ProtoMeta = {
  name: 'Split tiles',
  tagline: 'Split-triangle tiles, corner meanings bracketed on the board’s edge, a legend that teaches the halves, and one plain sentence for any pick.',
  ideas: [
    {
      id: 'split-tiles',
      title: 'Split tiles with a hairline seam',
      detail: 'Top-left half = here and now, bottom-right half = ideal; a faint diagonal keeps the split readable even when both halves match.',
    },
    {
      id: 'centre-circle',
      title: 'Centre square as a circle',
      detail: 'Toggle “Centre circle” (on; &o=-centreCircle turns it off). Max’s idea: the (0, 0) tile is a split circle, so the eye finds the middle — and so the four corners — at a glance; the ring turns round when it lands there.',
    },
    {
      id: 'edge-labels',
      title: 'Corner meanings bracketed on the board’s edge',
      detail: 'Toggle “Labels on the edge” (on; &o=-edgeLabels for in-grid plates). Each meaning sits above or below its quadrant with a bracket spanning its three columns, so no tile is covered; the one for the active region lights up.',
    },
    {
      id: 'quadrant-captions',
      title: 'Or: corner captions inside the grid',
      detail: 'Shown when “Labels on the edge” is off. The earlier layout: frosted plates on the second row of each quadrant. More “in the grid”, but they cover tiles, so in answer mode they fade on hover, focus and pick.',
    },
    {
      id: 'torn-tag',
      title: 'Small “Torn” tag at the centre',
      detail: 'Sits in the gap under the centre tile, clear of both rows’ numerals; on phones it shrinks to 🤷 and spells “Torn” only while the centre is lit.',
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
      id: 'legible-dimming',
      title: 'Dimming that keeps numerals legible',
      detail: 'Tours dim only the colour of tiles outside the spotlight; numerals stay at full strength on a halo of the page colour, so mono stays readable (text vs halo ≥ 13:1).',
    },
    {
      id: 'grid-well',
      title: 'Tinted grid well and firmer tile edges in light theme',
      detail: 'The board is a slightly deeper well and each tile has a darker hairline and a 1px shadow, so pale fills (mono +3 #efefef) hold their edge on the light page.',
    },
    {
      id: 'spotlight-tour',
      title: 'Spotlight tour in the hero',
      detail: 'The default hero (“Story tour” off). A ring glides corner to corner, dimming tiles outside the region while the read-out explains it; pauses on hover or focus, has step dots, and stays still under reduced motion.',
    },
    {
      id: 'story-tour',
      title: 'Story tour in the hero',
      detail: 'Toggle “Story tour” (off; &o=storyTour turns it on). From prototype D: persona A and B pick the same ideal column, then rows four apart; the unanswered half is veiled each step, ending on a bracketed “gap 4”.',
    },
    {
      id: 'region-emoji',
      title: 'Five region emoji, not 49',
      detail: '👍 🩹 🔭 👎 🤷 tag only the four corners and the centre — “🩹 needed now, never ideal” and “🔭 ideal, but not for us now” carry the mixed cases.',
    },
    {
      id: 'sentence-readout',
      title: 'One plain-language sentence for any pick',
      detail: 'C’s region read-back merged with B’s sentence: a headline (“🩹 Needed now, never ideal”) plus “Ideally it’s slightly bad, but here and now you’d back it.”',
    },
    {
      id: 'fitted-readout',
      title: 'Read-out sized to its content',
      detail: 'Tour read-outs are stacked in one cell, so the box is exactly as tall as the longest stop (no empty gap on phones and no jumping legend).',
    },
    {
      id: 'arrow-keys',
      title: 'Arrow-key radio grid',
      detail: 'The grid is one radio group: Tab lands on the pick (or the centre), arrows move in 2D and select, Home/End jump along the row, numerals follow focus.',
    },
    {
      id: 'reduced-motion',
      title: 'Reduced motion respected throughout',
      detail: 'Follows the OS setting live: no auto-advance (the story opens on its final frame), no gliding ring, no tile scaling or fades.',
    },
  ],
}

const TOUR_MS = 2800
const key = (i: V, n: V) => `${i}:${n}`
const clamp = (v: number) => Math.max(-3, Math.min(3, v)) as V
const NOW_PTS = '0,0 100,0 0,100'
const IDEAL_PTS = '100,0 100,100 0,100'
const HALF_NAME: Record<Half, string> = { now: 'Here and now', ideal: 'Ideal system' }

/** Live prefers-reduced-motion (the OS setting can change while the page is open). */
function useReducedMotion(): boolean {
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

/* ── Pieces ─────────────────────────────────────────────────────────────── */

function Tile({ now, ideal, palette, glyphs, veil }: { now: V; ideal: V; palette: Palette; glyphs: boolean; veil?: Half | null }) {
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

/** Inline triangle swatch for the read-out (SVG, so it can carry a hairline edge). */
function Tri({ half, fill }: { half: Half; fill: string }) {
  return (
    <svg viewBox="0 0 100 100" className={css.tri} data-half={half} aria-hidden>
      <polygon points={half === 'now' ? NOW_PTS : IDEAL_PTS} fill={fill} />
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

/** `cell` marks each half's ramp; a half left out (story tour, not answered yet) stays unmarked. */
function Legend({ palette, cell }: { palette: Palette; cell: Partial<Record<Half, V>> | null }) {
  return (
    <div className={css.legend}>
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
        <span>−3 strongly disagree</span>
        <span>+3 strongly agree</span>
      </p>
    </div>
  )
}

/** In-grid layout (edgeLabels off): frosted plates on each quadrant's second row. */
function Captions({ active }: { active: RegionId | null }) {
  return (
    <div className={css.captions} aria-hidden>
      {(['tl', 'tr', 'bl', 'br'] as const).map(id => {
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

/** Edge layout: the two corner meanings for one side of the board, each over a bracket spanning its quadrant. */
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
                <span className={css.capEmoji}>{r.emoji}</span> {r.lines[0]}
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
function Ring({
  at,
  circle,
  shown = true,
  ghost,
  who,
}: {
  at: { i: V; n: V } | null
  circle: boolean
  shown?: boolean
  ghost?: boolean
  who?: 'a' | 'b'
}) {
  const p = at ?? { i: 0 as V, n: 0 as V }
  const style = { '--col': COLS.indexOf(p.i), '--row': ROWS.indexOf(p.n) } as CSSProperties
  return (
    <span
      className={css.ring}
      style={style}
      data-shown={(shown && !!at) || undefined}
      data-circle={(circle && p.i === 0 && p.n === 0) || undefined}
      data-ghost={ghost || undefined}
      data-who={who}
      aria-hidden
    >
      {who && <span className={css.pin}>{PERSONAS[who].pin}</span>}
    </span>
  )
}

function Reading({ half, v, palette }: { half: Half; v: V; palette: Palette }) {
  return (
    <span className={css.reading}>
      <Tri half={half} fill={palette.fill(v)} />
      <span className={css.readingHalf}>{HALF_NAME[half]}</span>
      <span className={css.chip} style={{ background: palette.fill(v), color: palette.ink(v) }}>
        {signed(v)}
      </span>
      <span className={css.readingWord}>{LABEL[v]}</span>
    </span>
  )
}

function StoryCopy({ f, palette }: { f: Frame; palette: Palette }) {
  return (
    <>
      <p className={css.kicker}>
        {f.persona && (
          <span className={css.pinInline} data-who={f.persona.id}>
            {f.persona.pin}
          </span>
        )}
        <span className={css.kickerText}>{f.persona ? f.persona.who : f.kicker}</span>
      </p>
      <h3 className={css.readTitle}>{f.title}</h3>
      <p className={css.readBody}>{f.body}</p>
      {f.reading && (
        <div className={css.readings}>
          {f.reading.map(r => (
            <Reading key={r.half} half={r.half} v={r.v} palette={palette} />
          ))}
        </div>
      )}
      {f.gap && (
        <div className={css.readings}>
          {[PERSONAS.a, PERSONAS.b].map(p => (
            <span key={p.id} className={css.reading}>
              <span className={css.pinInline} data-who={p.id}>
                {p.pin}
              </span>
              <Tri half="ideal" fill={palette.fill(p.i)} />
              <span className={css.chip} style={{ background: palette.fill(p.i), color: palette.ink(p.i) }}>
                {signed(p.i)}
              </span>
              <Tri half="now" fill={palette.fill(p.n)} />
              <span className={css.chip} style={{ background: palette.fill(p.n), color: palette.ink(p.n) }}>
                {signed(p.n)}
              </span>
              <span className={css.readingWord}>{p.id === 'a' ? 'Rich bought the courts' : 'Well-run democracy'}</span>
            </span>
          ))}
        </div>
      )}
    </>
  )
}

/** Hero read-outs stacked in one grid cell: the box is as tall as the longest stop, and never jumps. */
function Stack({ active, live, children }: { active: number; live: boolean; children: ReactNode[] }) {
  return (
    <div className={`${css.readout} ${css.stack}`} aria-live={live ? 'polite' : 'off'}>
      {children.map((c, k) => (
        <div key={k} className={css.stackItem} data-active={k === active || undefined} aria-hidden={k !== active}>
          {c}
        </div>
      ))}
    </div>
  )
}

/* ── Prototype ──────────────────────────────────────────────────────────── */

export default function SplitTiles({ mode, palette, statement, size = 'full', options: opts = {} }: ProtoProps) {
  const circle = opts.centreCircle ?? true
  const edgeLabels = opts.edgeLabels ?? true
  const story = mode === 'hero' && (opts.storyTour ?? false)
  // Switching tour variant restarts its state.
  return (
    <SplitBoard
      key={story ? 'story' : 'tiles'}
      mode={mode}
      palette={palette}
      statement={statement}
      size={size}
      circle={circle}
      edgeLabels={edgeLabels}
      story={story}
    />
  )
}

function SplitBoard({
  mode,
  palette,
  statement,
  size,
  circle,
  edgeLabels,
  story,
}: {
  mode: ProtoProps['mode']
  palette: Palette
  statement: string
  size: 'full' | 'small'
  circle: boolean
  edgeLabels: boolean
  story: boolean
}) {
  const hero = mode === 'hero'
  const still = useReducedMotion()
  const stops = story ? STORY.length : TOUR.length
  // Reduced motion opens the story on its fully annotated last frame.
  const [stop, setStop] = useState(() => (story && still ? stops - 1 : 0))
  const [paused, setPaused] = useState(false)
  // Keyboard users pause the tour by tabbing into it (WCAG 2.2.2), not only by hovering.
  const [focusIn, setFocusIn] = useState(false)
  const [pick, setPick] = useState<{ i: V; n: V } | null>(null)
  const [hover, setHover] = useState<{ i: V; n: V } | null>(null)
  const [focus, setFocus] = useState<{ i: V; n: V } | null>(null)
  const refs = useRef(new Map<string, HTMLButtonElement>())

  const touring = hero && !paused && !still && !focusIn
  // Spotlight: fixed beat. Story: each frame's own length, driven by the progress bar's animationend.
  useEffect(() => {
    if (!touring || story) return
    const t = setInterval(() => setStop(k => (k + 1) % TOUR.length), TOUR_MS)
    return () => clearInterval(t)
  }, [touring, story])

  const region = REGIONS[TOUR[stop % TOUR.length]!]
  const frame = STORY[stop % STORY.length]!
  const live = story ? activeCells(frame) : null

  const lit = hero ? (story ? null : { i: region.i, n: region.n }) : (hover ?? focus ?? pick)
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

  let activeRegion: RegionId | null
  if (story) {
    const live = [frame.a?.ghost ? null : frame.a, frame.b?.ghost ? null : frame.b].filter(Boolean) as { i: V; n: V }[]
    activeRegion = live.length ? regionOf(live[live.length - 1]!.i, live[live.length - 1]!.n) : null
  } else activeRegion = hero ? region.id : lit ? regionOf(lit.i, lit.n) : null
  const centreLit = activeRegion === 'c' || (!!lit && (lit.i === 0 || lit.n === 0))

  const gap = gapSpan()
  const gapStyle = {
    '--col': COLS.indexOf(gap.i),
    '--row': ROWS.indexOf(gap.top),
    '--rows': gap.rows,
  } as CSSProperties

  const pauseHandlers = hero
    ? {
        onPointerEnter: () => setPaused(true),
        onPointerLeave: () => setPaused(false),
        onFocus: () => setFocusIn(true),
        onBlur: (e: FocusEvent<HTMLDivElement>) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusIn(false)
        },
      }
    : {}

  return (
    <div
      className={`${css.root} ${size === 'small' ? css.small : ''}`}
      data-mode={mode}
      data-still={still || undefined}
      data-edge={edgeLabels || undefined}
      data-story={story || undefined}
      {...pauseHandlers}
    >
      {!hero && (
        <p className={css.statement}>
          <span className={css.statementKicker}>Statement</span>
          <span>“{statement}”</span>
        </p>
      )}

      <div className={css.boardWrap}>
        <div className={css.board} data-picked={pick ? '' : undefined}>
          {edgeLabels && <EdgeLabels side="top" active={activeRegion} />}
          <div className={css.field}>
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
                  const round = circle && i === 0 && n === 0
                  if (hero) {
                    const s = story ? storyCell(frame, i, n) : { dim: !inSpotlight(region.id, i, n), veil: null }
                    const on = story ? live!.has(key(i, n)) : !!lit && lit.i === i && lit.n === n
                    return (
                      <div
                        key={key(i, n)}
                        className={css.cell}
                        data-on={on || undefined}
                        data-dim={s.dim || undefined}
                        data-round={round || undefined}
                      >
                        <Tile now={n} ideal={i} palette={palette} glyphs={palette.needsGlyphs || on} veil={s.veil} />
                      </div>
                    )
                  }
                  const on = !!lit && lit.i === i && lit.n === n
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
                      data-round={round || undefined}
                      onClick={() => setPick({ i, n })}
                      onKeyDown={e => move(e, i, n)}
                      onPointerEnter={() => setHover({ i, n })}
                      onPointerLeave={() => setHover(null)}
                      onFocus={() => setFocus({ i, n })}
                      onBlur={() => setFocus(null)}
                    >
                      <Tile now={n} ideal={i} palette={palette} glyphs={palette.needsGlyphs || on} />
                    </button>
                  )
                }),
              )}
            </div>
            {!edgeLabels && <Captions active={activeRegion} />}
            <span className={css.torn} data-active={centreLit || undefined} hidden={story} aria-hidden>
              <span className={css.capEmoji}>🤷</span>
              <span className={css.tornWord}>Torn</span>
            </span>
            {story ? (
              <>
                <span className={css.gapMark} style={gapStyle} data-shown={frame.gap || undefined} aria-hidden>
                  <span className={css.gapLabel}>
                    gap <b>{gap.rows}</b>
                  </span>
                </span>
                <Ring at={frame.a ?? null} circle={circle} ghost={frame.a?.ghost} who="a" />
                <Ring at={frame.b ?? null} circle={circle} ghost={frame.b?.ghost} who="b" />
              </>
            ) : (
              <Ring at={hero ? lit : pick} circle={circle} />
            )}
          </div>
          {edgeLabels && <EdgeLabels side="bottom" active={activeRegion} />}
        </div>
      </div>

      <div className={css.aside}>
        {hero && story ? (
          <Stack active={stop} live={!touring}>
            {STORY.map(f => (
              <StoryCopy key={f.id} f={f} palette={palette} />
            ))}
          </Stack>
        ) : hero ? (
          <Stack active={stop} live={!touring}>
            {TOUR.map(id => {
              const r = REGIONS[id]
              return (
                <div key={id} className={css.readInner}>
                  <p className={css.kicker}>
                    <Tri half="now" fill={palette.fill(r.n)} />
                    now {signed(r.n)}
                    <Tri half="ideal" fill={palette.fill(r.i)} />
                    ideal {signed(r.i)}
                  </p>
                  <h3 className={css.readTitle}>
                    <span aria-hidden>{r.emoji}</span> {r.title}
                  </h3>
                  <p className={css.readBody}>{r.body}</p>
                </div>
              )
            })}
          </Stack>
        ) : (
          <div className={`${css.readout} ${css.answerReadout}`} aria-live="polite">
            {lit ? (
              <>
                <p className={css.kicker}>
                  <Tri half="now" fill={palette.fill(lit.n)} />
                  now {signed(lit.n)}
                  <Tri half="ideal" fill={palette.fill(lit.i)} />
                  ideal {signed(lit.i)}
                  {pick && lit.i === pick.i && lit.n === pick.n && <span className={css.pickedTag}>your pick</span>}
                </p>
                <h3 className={css.readTitle}>
                  <span aria-hidden>{headline(lit.i, lit.n).emoji}</span> {headline(lit.i, lit.n).title}
                </h3>
                <p className={css.readBody}>{sentence(lit.i, lit.n)}</p>
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

        <Legend
          palette={palette}
          cell={
            story
              ? frame.reading
                ? Object.fromEntries(frame.reading.map(r => [r.half, r.v]))
                : null
              : lit && { now: lit.n, ideal: lit.i }
          }
        />

        {hero && story && (
          <div className={css.tour} role="group" aria-label="Story steps">
            <ol className={css.segs}>
              {STORY.map((f, k) => (
                <li key={f.id}>
                  <button
                    type="button"
                    className={css.seg}
                    aria-label={`Step ${k + 1} of ${STORY.length}: ${f.title}`}
                    aria-current={k === stop ? 'step' : undefined}
                    data-done={k < stop || undefined}
                    onClick={() => {
                      setStop(k)
                      setPaused(true)
                    }}
                  >
                    {k === stop && (
                      <span
                        key={`${k}:${still}`}
                        className={css.segFill}
                        data-run={touring || undefined}
                        style={{ animationDuration: `${f.ms}ms` }}
                        onAnimationEnd={() => setStop(s => (s + 1) % STORY.length)}
                      />
                    )}
                  </button>
                </li>
              ))}
            </ol>
            <span className={css.tourNote}>{still ? 'Step through' : touring ? 'Playing' : 'Paused'}</span>
          </div>
        )}

        {hero && !story && (
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

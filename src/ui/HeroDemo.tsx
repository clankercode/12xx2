import { useEffect, useState, type CSSProperties, type FocusEvent, type ReactNode } from 'react'
import type { Answer } from '../engine/types'
import type { V } from './answer'
import { Grid } from './Grid'
import { signed, type Palette } from './tiles/palettes'
import { usePalette } from './tiles/paletteChoice'
import { REGIONS, TOUR, inSpotlight, regionOf, type RegionId } from './tiles/regions'
import { PERSONAS, STORY, activeCells, gapSpan, storyCell, type Frame, type Half } from './tiles/story'
import { Board, COLS, HALF_NAME, Legend, ROWS, Ring, Tile, Tri, Values, cellKey, tileCss as t, useReducedMotion } from './tiles/Tiles'
import css from './HeroDemo.module.css'

/**
 * Landing-page demo of the split-tile grid. Three views:
 *  - "tour" (default): a ring glides corner to corner, dimming the rest, while the read-out
 *    explains each corner; pauses on hover or focus; still under reduced motion.
 *  - "story": two people with the same ideal but different here and now (the lab's
 *    prototype D story, drawn on split tiles). Off by default.
 *  - "try": the real answer grid on the same statement.
 */
type View = 'tour' | 'story' | 'try'
const VIEWS: [View, string][] = [
  ['tour', 'Corners'],
  ['story', 'Two people'],
  ['try', 'Try it'],
]
const TOUR_MS = 2800

export function HeroDemo({ statement }: { statement: string }) {
  const [view, setView] = useState<View>('tour')
  const [mine, setMine] = useState<{ i: Answer; n: Answer } | null>(null)
  return (
    <div className={css.demo}>
      <p className={css.statement}>{statement}</p>
      {view === 'try' ? (
        <Grid value={mine} onPick={(i, n) => setMine({ i, n })} idPrefix="demo" legend="full" />
      ) : (
        <Tour key={view} story={view === 'story'} />
      )}
      <fieldset className={css.views}>
        <legend className="visually-hidden">Show</legend>
        <div className={css.seg}>
          {VIEWS.map(([k, l]) => (
            <label key={k} className={view === k ? css.segOn : ''}>
              <input type="radio" name="hero-view" value={k} checked={view === k} onChange={() => setView(k)} className="visually-hidden" />
              {l}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  )
}

function Reading({ half, v, palette }: { half: Half; v: V; palette: Palette }) {
  return (
    <span className={css.reading}>
      <Tri half={half} fill={palette.fill(v)} />
      <span className={css.readingHalf}>{HALF_NAME[half]}</span>
      <span className={t.chip} style={{ background: palette.fill(v), color: palette.ink(v) }}>
        {signed(v)}
      </span>
    </span>
  )
}

function StoryCopy({ f, palette }: { f: Frame; palette: Palette }) {
  return (
    <>
      <p className={t.kicker}>
        {f.persona && (
          <span className={t.pinInline} data-who={f.persona.id}>
            {f.persona.pin}
          </span>
        )}
        <span className={css.kickerText}>{f.persona ? f.persona.who : f.kicker}</span>
      </p>
      <h3 className={t.readTitle}>{f.title}</h3>
      <p className={t.readBody}>{f.body}</p>
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
              <span className={t.pinInline} data-who={p.id}>
                {p.pin}
              </span>
              <Tri half="ideal" fill={palette.fill(p.i)} />
              <span className={t.chip} style={{ background: palette.fill(p.i), color: palette.ink(p.i) }}>
                {signed(p.i)}
              </span>
              <Tri half="now" fill={palette.fill(p.n)} />
              <span className={t.chip} style={{ background: palette.fill(p.n), color: palette.ink(p.n) }}>
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

/** Read-outs stacked in one grid cell: the box is as tall as the longest stop, and never jumps. */
function Stack({ active, live, children }: { active: number; live: boolean; children: ReactNode[] }) {
  return (
    <div className={`${t.readout} ${css.stack}`} aria-live={live ? 'polite' : 'off'}>
      {children.map((c, k) => (
        <div key={k} className={css.stackItem} data-active={k === active || undefined} aria-hidden={k !== active}>
          {c}
        </div>
      ))}
    </div>
  )
}

function Tour({ story }: { story: boolean }) {
  const palette = usePalette()
  const still = useReducedMotion()
  const stops = story ? STORY.length : TOUR.length
  // Reduced motion opens the story on its fully annotated last frame.
  const [stop, setStop] = useState(() => (story && still ? stops - 1 : 0))
  const [paused, setPaused] = useState(false)
  // Keyboard users pause the tour by tabbing into it (WCAG 2.2.2), not only by hovering.
  const [focusIn, setFocusIn] = useState(false)

  const touring = !paused && !still && !focusIn
  // Spotlight: fixed beat. Story: each frame's own length, driven by the progress bar's animationend.
  useEffect(() => {
    if (!touring || story) return
    const id = setInterval(() => setStop(k => (k + 1) % TOUR.length), TOUR_MS)
    return () => clearInterval(id)
  }, [touring, story])

  const region = REGIONS[TOUR[stop % TOUR.length]!]
  const frame = STORY[stop % STORY.length]!
  const live = activeCells(frame)

  let active: RegionId | null
  if (story) {
    const pins = [frame.a?.ghost ? null : frame.a, frame.b?.ghost ? null : frame.b].filter(Boolean) as { i: V; n: V }[]
    const last = pins[pins.length - 1]
    active = last ? regionOf(last.i, last.n) : null
  } else active = region.id

  const gap = gapSpan()
  const gapStyle = { '--col': COLS.indexOf(gap.i), '--row': ROWS.indexOf(gap.top), '--rows': gap.rows } as CSSProperties

  return (
    <div
      className={`${t.tiles} ${css.tour}`}
      data-still={still || undefined}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setFocusIn(true)}
      onBlur={(e: FocusEvent<HTMLDivElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusIn(false)
      }}
    >
      <Board
        active={active}
        centreLit={active === 'c'}
        hideTorn={story}
        cells={{
          role: 'img',
          'aria-label': 'Answer grid. Each square is split: top-left half for here and now, bottom-right half for your ideal system.',
        }}
        rows={ROWS.map(n => (
          <div key={n} className={t.row}>
            {COLS.map(i => {
              const s = story ? storyCell(frame, i, n) : { dim: !inSpotlight(region.id, i, n), veil: null }
              const on = story ? live.has(cellKey(i, n)) : region.i === i && region.n === n
              return (
                <div key={i} className={t.cell} data-on={on || undefined} data-dim={s.dim || undefined} data-round={(i === 0 && n === 0) || undefined}>
                  <Tile now={n} ideal={i} palette={palette} glyphs={palette.needsGlyphs || on} veil={s.veil} />
                </div>
              )
            })}
          </div>
        ))}
        overlay={
          story ? (
            <>
              <span className={css.gapMark} style={gapStyle} data-shown={frame.gap || undefined} aria-hidden>
                <span className={css.gapLabel}>
                  gap <b>{gap.rows}</b>
                </span>
              </span>
              <Ring at={frame.a ?? null} circle ghost={frame.a?.ghost} who="a" />
              <Ring at={frame.b ?? null} circle ghost={frame.b?.ghost} who="b" />
            </>
          ) : (
            <Ring at={{ i: region.i, n: region.n }} circle />
          )
        }
      />

      <div className={css.aside}>
        {story ? (
          <Stack active={stop} live={!touring}>
            {STORY.map(f => (
              <StoryCopy key={f.id} f={f} palette={palette} />
            ))}
          </Stack>
        ) : (
          <Stack active={stop} live={!touring}>
            {TOUR.map(id => {
              const r = REGIONS[id]
              return (
                <div key={id} className={t.readout}>
                  <Values i={r.i} n={r.n} palette={palette} />
                  <h3 className={t.readTitle}>
                    <span aria-hidden>{r.emoji}</span> {r.title}
                  </h3>
                  <p className={t.readBody}>{r.body}</p>
                </div>
              )
            })}
          </Stack>
        )}

        <Legend
          palette={palette}
          cell={
            story
              ? frame.reading
                ? Object.fromEntries(frame.reading.map(r => [r.half, r.v]))
                : null
              : { now: region.n, ideal: region.i }
          }
        />

        {story ? (
          <div className={css.steps} role="group" aria-label="Story steps">
            <ol className={css.segs}>
              {STORY.map((f, k) => (
                <li key={f.id}>
                  <button
                    type="button"
                    className={css.segBtn}
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
            <span className={css.note}>{still ? 'Step through' : touring ? 'Playing' : 'Paused'}</span>
          </div>
        ) : (
          <div className={css.steps} role="group" aria-label="Tour of the grid">
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
            <span className={css.note}>{still ? 'Step through' : touring ? 'Touring' : 'Paused'}</span>
          </div>
        )}
      </div>
    </div>
  )
}

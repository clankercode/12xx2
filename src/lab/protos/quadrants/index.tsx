import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { COLS, LABEL, ROWS, prefersReducedMotion, type V } from '../../kit'
import { signed, type Palette } from '../../palettes'
import type { ProtoMeta, ProtoProps } from '../../types'
import { REGIONS, TOUR, headline, sentence, zoneOf, type Lit, type Quadrant } from './regions'
import css from './quadrants.module.css'

/**
 * "Quadrant map": the 7×7 answer grid drawn as a map of named territories.
 * Four 3×3 quadrants (each framed in a split two-tone border that matches its
 * cells), a neutral cross between them and a "same both ways" diagonal. Cells
 * stay split-triangle coloured but subdued, so the map reads first and the
 * colours come up where you look (hovered region, hero tour stop, your pick).
 *
 * Geometry as kit.ts: columns = ideal −3 → +3, rows = now +3 (top) → −3.
 * Split cell: top-left triangle = here and now, bottom-right = ideal system.
 */

export const meta: ProtoMeta = {
  name: 'Quadrant map',
  tagline: 'The grid as a map: four named territories, a neutral cross and a “same both ways” line.',
  ideas: [
    {
      id: 'corner-territories',
      title: 'Named corner territories inside the grid',
      detail: 'Each 3×3 corner carries an emoji + plain-language name (“Necessary for now”, “Bad every time”…) in its outer corner, replacing side axis labels.',
    },
    {
      id: 'split-frames',
      title: 'Two-tone region frames',
      detail: 'Each quadrant is outlined by a frame split on the same diagonal as its cells (top-left = now colour, bottom-right = ideal colour), so the region boundary teaches the split.',
    },
    {
      id: 'subdued-until-looked-at',
      title: 'Subdued cells, region lights up on hover',
      detail: 'Cells sit at low intensity so labels stay legible; hovering a cell brings its whole region (and the cell) to full colour.',
    },
    {
      id: 'sentence-readout',
      title: 'Plain-language sentence readout',
      detail: 'Answer mode reads the pick back as a sentence: “Good in an ideal system, but here and now you’d oppose it.” plus region emoji and signed values.',
    },
    {
      id: 'numerals-on-focus',
      title: 'Signed numerals on hover/pick; signs always in mono',
      detail: 'The hovered/picked cell shows −3…+3 in each triangle; the mono palette also shows a small +/− on every triangle and greys the emoji.',
    },
    {
      id: 'diagonal-line',
      title: '“Same both ways” diagonal',
      detail: 'A faint dashed line where ideal = now; distance from it is the gap the quiz is about.',
    },
    {
      id: 'hero-tour-stepper',
      title: 'Hero tour with emoji stepper',
      detail: 'Regions light up in turn with an example pick pinned in each; an emoji stepper doubles as a legend and pauses the tour (reduced motion starts paused).',
    },
  ],
}

const QUADS: Quadrant[] = ['tl', 'tr', 'bl', 'br']
/** Now / ideal sign of each quadrant (for its two-tone frame). */
const QUAD_SIGN: Record<Quadrant, { n: 1 | -1; i: 1 | -1 }> = {
  tr: { n: 1, i: 1 },
  tl: { n: 1, i: -1 },
  br: { n: -1, i: 1 },
  bl: { n: -1, i: -1 },
}

type Pos = { i: V; n: V }
const key = (p: Pos) => `${p.i}:${p.n}`
const clampV = (v: number) => Math.max(-3, Math.min(3, v)) as V
/** CSS grid line for an answer: ideal −3 → column 1; now +3 → row 1. */
const gridArea = (p: Pos) => ({ gridColumn: p.i + 4, gridRow: 4 - p.n })

function SplitCell({ now, ideal, palette, glyphs }: { now: V; ideal: V; palette: Palette; glyphs: 'num' | 'sign' | 'none' }) {
  return (
    <svg viewBox="0 0 100 100" className={css.art} aria-hidden>
      {/* Ideal fills the square, "now" is drawn over it: no seam on same-colour cells. */}
      <rect width="100" height="100" fill={palette.fill(ideal)} />
      <polygon points="0,0 100,0 0,100" fill={palette.fill(now)} />
      {glyphs === 'num' && (
        <g className={css.num}>
          <text x="31" y="35" fill={palette.ink(now)}>
            {signed(now)}
          </text>
          <text x="69" y="69" fill={palette.ink(ideal)}>
            {signed(ideal)}
          </text>
        </g>
      )}
      {glyphs === 'sign' && (
        <g className={css.sign}>
          {now !== 0 && (
            <text x="27" y="31" fill={palette.ink(now)}>
              {now > 0 ? '+' : '−'}
            </text>
          )}
          {ideal !== 0 && (
            <text x="73" y="73" fill={palette.ink(ideal)}>
              {ideal > 0 ? '+' : '−'}
            </text>
          )}
        </g>
      )}
    </svg>
  )
}

/** Tiny split square used in the key and readout. */
function Swatch({ now, ideal, palette }: { now: V; ideal: V; palette: Palette }) {
  return (
    <svg viewBox="0 0 100 100" className={css.swatch} aria-hidden>
      <rect width="100" height="100" fill={palette.fill(ideal)} />
      <polygon points="0,0 100,0 0,100" fill={palette.fill(now)} />
    </svg>
  )
}

export default function QuadrantMap({ mode, palette, statement, size = 'full' }: ProtoProps) {
  const reduced = prefersReducedMotion()
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(!reduced)
  const [pick, setPick] = useState<Pos | null>(null)
  const [hover, setHover] = useState<Pos | null>(null)
  const [focus, setFocus] = useState<Pos>({ i: 0, n: 0 })
  const refs = useRef(new Map<string, HTMLButtonElement>())

  useEffect(() => {
    if (mode !== 'hero' || !playing) return
    const t = setInterval(() => setStep(k => (k + 1) % TOUR.length), 2600)
    return () => clearInterval(t)
  }, [mode, playing])

  const hero = mode === 'hero'
  const tourRegion = REGIONS[TOUR[step]!]
  const shown = hover ?? pick
  const lit: Lit | undefined = hero ? tourRegion.id : shown ? zoneOf(shown.i, shown.n) : undefined
  const mono = palette.needsGlyphs

  const moveTo = (p: Pos) => {
    setFocus(p)
    setPick(p)
    refs.current.get(key(p))?.focus()
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const d: Record<string, [number, number]> = {
      ArrowRight: [1, 0],
      ArrowLeft: [-1, 0],
      ArrowUp: [0, 1],
      ArrowDown: [0, -1],
    }
    const m = d[e.key]
    if (!m) return
    e.preventDefault()
    moveTo({ i: clampV(focus.i + m[0]), n: clampV(focus.n + m[1]) })
  }

  const plate = (q: Quadrant): CSSProperties =>
    ({
      '--now-c': palette.fill(2 * QUAD_SIGN[q].n),
      '--ideal-c': palette.fill(2 * QUAD_SIGN[q].i),
    }) as CSSProperties

  const showcase = hero ? tourRegion.example : null

  return (
    <div
      className={`${css.root} ${size === 'small' ? css.small : ''}`}
      data-mode={mode}
      data-lit={lit}
      data-mono={mono || undefined}
    >
      {!hero && <p className={css.statement}>“{statement}”</p>}

      <div className={css.sheet}>
        <div
          className={css.grid}
          role={hero ? 'img' : 'radiogroup'}
          aria-label={
            hero
              ? 'Answer map. Top right: good both ways. Top left: necessary for now, not ideally. Bottom right: ideal, but not for now. Bottom left: bad every time. Centre: torn.'
              : 'Your answer: here and now (rows, top = agree) by ideal system (columns, right = agree)'
          }
          onKeyDown={hero ? undefined : onKeyDown}
          onMouseLeave={() => setHover(null)}
        >
          {QUADS.map(q => (
            <div key={q} className={css.plate} data-q={q} style={plate(q)} aria-hidden />
          ))}

          <svg className={css.diag} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <line x1="0" y1="100" x2="100" y2="0" />
          </svg>

          {ROWS.map(n =>
            COLS.map(i => {
              const p = { i, n }
              const picked = pick?.i === i && pick.n === n
              const hovered = hover?.i === i && hover.n === n
              const shownHere = showcase?.i === i && showcase.n === n
              const glyphs = picked || hovered || shownHere ? 'num' : mono ? 'sign' : 'none'
              const common = {
                className: css.cell,
                style: gridArea(p),
                'data-q': zoneOf(i, n),
                'data-diag': i === n || undefined,
                'data-on': picked || shownHere || undefined,
                'data-hot': hovered || undefined,
              }
              const art = <SplitCell now={n} ideal={i} palette={palette} glyphs={glyphs} />
              if (hero)
                return (
                  <div key={key(p)} {...common} aria-hidden>
                    {art}
                  </div>
                )
              const h = headline(i, n)
              return (
                <button
                  key={key(p)}
                  ref={el => {
                    if (el) refs.current.set(key(p), el)
                    else refs.current.delete(key(p))
                  }}
                  type="button"
                  role="radio"
                  aria-checked={picked}
                  aria-label={`Here and now: ${LABEL[n]} (${signed(n)}). Ideal system: ${LABEL[i]} (${signed(i)}). ${h.name}.`}
                  tabIndex={focus.i === i && focus.n === n ? 0 : -1}
                  onClick={() => {
                    setFocus(p)
                    setPick(p)
                  }}
                  onMouseEnter={() => setHover(p)}
                  onFocus={() => setFocus(p)}
                  {...common}
                >
                  {art}
                </button>
              )
            }),
          )}

          {QUADS.map(q => (
            <div key={q} className={css.label} data-q={q} aria-hidden>
              <span className={css.emoji}>{REGIONS[q].emoji}</span>
              <span className={css.labelText}>
                <span className={css.name}>
                  <span className={css.long}>{REGIONS[q].name}</span>
                  <span className={css.short}>{REGIONS[q].short}</span>
                </span>
                <span className={css.sub}>{REGIONS[q].sub}</span>
              </span>
            </div>
          ))}

          <div className={css.torn} data-q="x" aria-hidden>
            <span className={css.emoji}>⚖️</span>
            <span className={css.tornText}>Torn</span>
          </div>

          {hero && <div className={css.diagTag} aria-hidden>same both ways</div>}

          {showcase && <div key={step} className={css.pin} style={gridArea(showcase)} aria-hidden />}
        </div>
      </div>

      <p className={css.key}>
        <span className={css.keyItem}>
          <span className={css.keyTri} data-half="now" />
          <span>
            top-left half: <strong className={css.keyNow}>here and now</strong>
          </span>
        </span>
        <span className={css.keyItem}>
          <span className={css.keyTri} data-half="ideal" />
          <span>
            bottom-right half: <strong className={css.keyIdeal}>ideal system</strong>
          </span>
        </span>
      </p>

      {hero ? (
        <>
          <div className={css.readout} aria-live={playing ? 'off' : 'polite'}>
            <p className={css.readHead}>
              <span className={css.readEmoji} aria-hidden>
                {tourRegion.emoji}
              </span>
              {tourRegion.name}
            </p>
            <p className={css.readBody}>{tourRegion.long}</p>
            <p className={css.readMeta}>
              <Swatch now={tourRegion.example.n} ideal={tourRegion.example.i} palette={palette} /> e.g. here and now{' '}
              <strong>{signed(tourRegion.example.n)}</strong> · ideal <strong>{signed(tourRegion.example.i)}</strong>
            </p>
          </div>
          <div className={css.stepper} role="group" aria-label="Tour of the map">
            {TOUR.map((id, k) => (
              <button
                key={id}
                type="button"
                className={css.stepBtn}
                aria-pressed={k === step}
                aria-label={REGIONS[id].name}
                title={REGIONS[id].name}
                onClick={() => {
                  setStep(k)
                  setPlaying(false)
                }}
              >
                <span aria-hidden>{REGIONS[id].emoji}</span>
              </button>
            ))}
            <button
              type="button"
              className={css.playBtn}
              aria-label={playing ? 'Pause tour' : 'Play tour'}
              onClick={() => setPlaying(x => !x)}
            >
              {playing ? '❚❚' : '▶'}
            </button>
          </div>
        </>
      ) : (
        <div className={css.readout} aria-live="polite">
          {shown ? (
            <>
              <p className={css.readHead}>
                <span className={css.readEmoji} aria-hidden>
                  {headline(shown.i, shown.n).emoji}
                </span>
                {headline(shown.i, shown.n).name}
                <span className={css.state}>{hover && !(pick && key(pick) === key(hover)) ? 'preview' : 'your answer'}</span>
              </p>
              <p className={css.readBody}>{sentence(shown.i, shown.n)}</p>
              <p className={css.readMeta}>
                <Swatch now={shown.n} ideal={shown.i} palette={palette} /> here and now <strong>{signed(shown.n)}</strong> · ideal{' '}
                <strong>{signed(shown.i)}</strong>
              </p>
            </>
          ) : (
            <>
              <p className={css.readHead}>Where does this land for you?</p>
              <p className={css.readBody}>Pick the square that matches both answers: how good it is in an ideal system, and whether you’d back it here and now.</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

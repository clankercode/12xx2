import { useId, useRef, useState, type HTMLAttributes, type KeyboardEvent, type ReactNode } from 'react'
import { COLS, CORNERS, LABEL, ROWS, VALUES, type V } from '../../kit'
import { signed, type Palette } from '../../palettes'
import type { ProtoMeta, ProtoProps } from '../../types'
import { MiniSplit, ScaleChip, SplitCell, type Show } from './marks'
import css from './mono.module.css'

export const meta: ProtoMeta = {
  name: 'Ink first',
  tagline: 'Reads in pure black and white: every half-square carries its answer as + / − marks; colour is a bonus.',
  ideas: [
    {
      id: 'pip-marks',
      title: 'Sign marks in every triangle',
      detail: 'Each half shows 1–3 “+” or “−” pips (or a ring for neutral); the count is the strength, so it reads in greyscale and on paper.',
    },
    {
      id: 'numerals-on-focus',
      title: 'Numerals on hover, focus and selection',
      detail: 'The active square swaps its pips for signed numerals (−3…+3) in each half, so the exact value is never a guess.',
    },
    {
      id: 'corner-tabs',
      title: 'Corner tabs with crop-mark brackets',
      detail: 'Plain-language meanings hang off the four frame corners like index tabs, each with a tiny +/− split icon; no side axis titles.',
    },
    {
      id: 'frame-rulers',
      title: 'Direction words set into the frame',
      detail: '“Now ↑” and “Ideal →” sit in notches on the frame line itself, so the axes are named without spending a row or column.',
    },
    {
      id: 'specimen',
      title: 'Specimen square with leader lines',
      detail: 'Hero mode enlarges one ringed example square and labels its two halves, plus a 7-step mark key from −3 to +3.',
    },
    {
      id: 'radio-keyboard',
      title: '2-D radio group with roving focus',
      detail: 'One tab stop; arrows move and pick, Home/End and PageUp/PageDown jump to edges; each square is announced in words.',
    },
    {
      id: 'verdict-line',
      title: 'Plain-language verdict + lit tab',
      detail: 'The readout names the pick (“Ideal, but not for us now”, “Good now; torn ideally”…) and inverts the matching corner tab.',
    },
    {
      id: 'double-ring',
      title: 'Colour-free focus and selection rings',
      detail: 'Selection is a thick ink+paper double ring, focus a separate amber offset ring: both visible on any fill, theme or palette.',
    },
  ],
}

type Corner = 'tl' | 'tr' | 'bl' | 'br'
const CORNER_OF: Record<Corner, (typeof CORNERS)[keyof typeof CORNERS]> = {
  tl: CORNERS.topLeft,
  tr: CORNERS.topRight,
  bl: CORNERS.bottomLeft,
  br: CORNERS.bottomRight,
}

/** Plain-language reading of any square, by the sign of each half. */
function verdict(n: V, i: V): { text: string; corner: Corner | null } {
  const sn = Math.sign(n)
  const si = Math.sign(i)
  if (sn > 0 && si > 0) return { text: CORNERS.topRight.short, corner: 'tr' }
  if (sn > 0 && si < 0) return { text: CORNERS.topLeft.short, corner: 'tl' }
  if (sn < 0 && si > 0) return { text: CORNERS.bottomRight.short, corner: 'br' }
  if (sn < 0 && si < 0) return { text: CORNERS.bottomLeft.short, corner: 'bl' }
  if (sn === 0 && si === 0) return { text: CORNERS.centre.short, corner: null }
  if (sn === 0) return { text: si > 0 ? 'Good ideally; torn about now' : 'Bad ideally; torn about now', corner: null }
  return { text: sn > 0 ? 'Good now; torn about the ideal' : 'Bad now; torn about the ideal', corner: null }
}

const lower = (v: V) => LABEL[v].toLowerCase()
const spoken = (n: V, i: V) =>
  `Ideal system: ${lower(i)}. Here and now: ${lower(n)}.` + (n === 0 && i === 0 ? '' : ` ${verdict(n, i).text}.`)

const clamp = (v: number): V => Math.max(-3, Math.min(3, v)) as V

interface Pos {
  i: V
  n: V
}
const same = (a: Pos | null, b: Pos | null) => !!a && !!b && a.i === b.i && a.n === b.n

/** Hero example: "ideal, but not for us now" — a non-trivial, readable pick. */
const EXAMPLE: Pos = { i: 2, n: -1 }

function Tab({ corner, palette, lit }: { corner: Corner; palette: Palette; lit: boolean }) {
  const c = CORNER_OF[corner]
  return (
    <span className={`${css.tab} ${css[corner]} ${lit ? css.tabLit : ''}`} data-corner={corner}>
      <MiniSplit now={c.n} ideal={c.i} palette={palette} />
      <span className={css.tabText}>{c.short}</span>
    </span>
  )
}

function Board({
  mode,
  palette,
  litCorner,
  children,
  gridProps,
}: {
  mode: 'hero' | 'answer'
  palette: Palette
  litCorner: Corner | null
  children?: ReactNode
  gridProps: HTMLAttributes<HTMLDivElement>
}) {
  return (
    <div className={css.board}>
      <div className={css.tabs}>
        <Tab corner="tl" palette={palette} lit={litCorner === 'tl'} />
        <Tab corner="tr" palette={palette} lit={litCorner === 'tr'} />
      </div>
      <div className={css.gridWrap}>
        <span className={css.ring} aria-hidden />
        <span className={`${css.crop} ${css.cTL}`} aria-hidden />
        <span className={`${css.crop} ${css.cTR}`} aria-hidden />
        <span className={`${css.crop} ${css.cBL}`} aria-hidden />
        <span className={`${css.crop} ${css.cBR}`} aria-hidden />
        <span className={`${css.edge} ${css.edgeNow}`} aria-hidden>
          Now&nbsp;→
        </span>
        <span className={`${css.edge} ${css.edgeIdeal}`} aria-hidden>
          Ideal&nbsp;→
        </span>
        <div className={css.grid} {...gridProps}>
          {children}
        </div>
        {mode === 'hero' && (
          <span className={css.centreTag} aria-hidden>
            {CORNERS.centre.short.split(' / ').map((w, k, all) => (
              <span key={w}>{k < all.length - 1 ? `${w} /` : w}</span>
            ))}
          </span>
        )}
      </div>
      <div className={css.tabs}>
        <Tab corner="bl" palette={palette} lit={litCorner === 'bl'} />
        <Tab corner="br" palette={palette} lit={litCorner === 'br'} />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ hero */

function Specimen({ palette }: { palette: Palette }) {
  const { i, n } = EXAMPLE
  return (
    <svg viewBox="0 0 300 196" className={css.specimen} role="img" aria-label={`Example square. ${spoken(n, i)}`}>
      {/* Leader: here and now (top-left half). */}
      <text x="0" y="16" className={`${css.leadTitle} ${css.nowText}`}>
        Here and now
      </text>
      <text x="0" y="34" className={css.leadSub}>
        {lower(n)} ({signed(n)})
      </text>
      <path d="M2 44V110H123" className={css.leader} />
      <circle cx="123" cy="110" r="3.5" className={css.leaderDot} />

      {/* The square itself. */}
      <SplitCell now={n} ideal={i} palette={palette} show="numerals" className={css.specimenCell} box={[104, 38, 120]} />
      <rect x="104" y="38" width="120" height="120" className={css.specimenRing} />

      {/* Leader: ideal system (bottom-right half). */}
      <path d="M204 146H298V156" className={css.leader} />
      <circle cx="204" cy="146" r="3.5" className={css.leaderDot} />
      <text x="300" y="172" textAnchor="end" className={`${css.leadTitle} ${css.idealText}`}>
        Ideal system
      </text>
      <text x="300" y="190" textAnchor="end" className={css.leadSub}>
        {lower(i)} ({signed(i)})
      </text>
    </svg>
  )
}

function ScaleKey({ palette }: { palette: Palette }) {
  return (
    <figure className={css.scale}>
      <ol className={css.scaleRow} aria-label="Mark key">
        {VALUES.map(v => (
          <li key={v} className={css.scaleItem}>
            <ScaleChip v={v} palette={palette} />
            <span className={css.scaleNum}>{signed(v)}</span>
            <span className="visually-hidden">{LABEL[v]}</span>
          </li>
        ))}
      </ol>
      <figcaption className={css.scaleCap}>
        <span>disagree</span>
        <span>more marks = stronger</span>
        <span>agree</span>
      </figcaption>
    </figure>
  )
}

function Hero({ palette, small }: { palette: Palette; small: boolean }) {
  const v = verdict(EXAMPLE.n, EXAMPLE.i)
  return (
    <figure className={css.hero}>
      <Board
        mode="hero"
        palette={palette}
        litCorner={v.corner}
        gridProps={{
          role: 'img',
          'aria-label':
            'Answer grid, 7 by 7. Each square is split on the diagonal: the top-left half is your answer for here and now, the bottom-right half for an ideal system. Up means agree more here and now; right means agree more in an ideal system.',
        }}
      >
        {ROWS.map(n =>
          COLS.map(i => {
            const ex = same({ i, n }, EXAMPLE)
            return (
              <div key={`${i}:${n}`} className={`${css.cell} ${ex ? css.picked : ''}`}>
                <SplitCell now={n} ideal={i} palette={palette} show={ex ? 'numerals' : 'marks'} />
              </div>
            )
          }),
        )}
      </Board>

      {!small && (
        <figcaption className={css.explain}>
          <h3 className={css.explainHead}>One square, two answers</h3>
          <p className={css.explainLede}>
            Every statement asks twice. Pick the square where both answers meet: <strong>higher</strong> = agree more{' '}
            <span className={css.nowText}>here and now</span>, <strong>further right</strong> = agree more in an{' '}
            <span className={css.idealText}>ideal system</span>.
          </p>
          <Specimen palette={palette} />
          <p className={css.exampleNote}>
            The ringed square reads: <strong>{v.text}.</strong>
          </p>
          <ScaleKey palette={palette} />
        </figcaption>
      )}
    </figure>
  )
}

/* ---------------------------------------------------------------- answer */

function Answer({ palette, statement }: { palette: Palette; statement: string }) {
  const [pick, setPick] = useState<Pos | null>(null)
  const [hover, setHover] = useState<Pos | null>(null)
  const [focus, setFocus] = useState<Pos | null>(null)
  const [marksAlways, setMarksAlways] = useState(true)
  // Roving tab stop: the pick, else the last focused square, else the centre.
  const [stop, setStop] = useState<Pos>({ i: 0, n: 0 })
  const refs = useRef(new Map<string, HTMLButtonElement>())
  const statementId = useId()
  const hintId = useId()

  const key = (p: Pos) => `${p.i}:${p.n}`

  const moveTo = (p: Pos) => {
    setStop(p)
    setPick(p)
    refs.current.get(key(p))?.focus()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, p: Pos) => {
    const map: Record<string, () => Pos> = {
      ArrowUp: () => ({ i: p.i, n: clamp(p.n + 1) }),
      ArrowDown: () => ({ i: p.i, n: clamp(p.n - 1) }),
      ArrowLeft: () => ({ i: clamp(p.i - 1), n: p.n }),
      ArrowRight: () => ({ i: clamp(p.i + 1), n: p.n }),
      Home: () => ({ i: -3, n: p.n }),
      End: () => ({ i: 3, n: p.n }),
      PageUp: () => ({ i: p.i, n: 3 }),
      PageDown: () => ({ i: p.i, n: -3 }),
    }
    const f = map[e.key]
    if (f) {
      e.preventDefault()
      moveTo(f())
    }
  }

  const shown = hover ?? focus ?? pick
  const preview = !!shown && !same(shown, pick)
  const v = shown ? verdict(shown.n, shown.i) : null
  const glyphsFor = (p: Pos): Show => {
    if (same(p, pick) || same(p, hover) || same(p, focus)) return 'numerals'
    return marksAlways || palette.needsGlyphs ? 'marks' : 'none'
  }

  return (
    <div className={css.answer}>
      <p className={css.statement} id={statementId}>
        “{statement}”
      </p>

      <Board
        mode="answer"
        palette={palette}
        litCorner={v?.corner ?? null}
        gridProps={{
          role: 'radiogroup',
          'aria-labelledby': statementId,
          'aria-describedby': hintId,
          onPointerLeave: () => setHover(null),
        }}
      >
        {ROWS.map(n =>
          COLS.map(i => {
            const p = { i, n }
            const on = same(p, pick)
            return (
              <button
                key={key(p)}
                ref={el => {
                  if (el) refs.current.set(key(p), el)
                  else refs.current.delete(key(p))
                }}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={spoken(n, i)}
                tabIndex={same(p, stop) ? 0 : -1}
                className={`${css.cell} ${css.btn} ${on ? css.picked : ''}`}
                onClick={() => {
                  setStop(p)
                  setPick(p)
                }}
                onKeyDown={e => {
                  setHover(null)
                  onKeyDown(e, p)
                }}
                onPointerEnter={e => e.pointerType === 'mouse' && setHover(p)}
                onFocus={() => {
                  setFocus(p)
                  setStop(p)
                }}
                onBlur={() => setFocus(null)}
              >
                <SplitCell now={n} ideal={i} palette={palette} show={glyphsFor(p)} />
              </button>
            )
          }),
        )}
      </Board>

      <div className={css.readout} aria-live="polite">
        <div className={css.ledger}>
          <Line label="Here and now" tone="now" v={shown?.n ?? null} />
          <Line label="Ideal system" tone="ideal" v={shown?.i ?? null} />
        </div>
        <p className={css.verdict}>
          {v ? (
            <>
              {preview && <span className={css.previewTag}>{pick ? 'instead?' : 'preview'}</span>}
              <strong>{v.text}.</strong>
            </>
          ) : (
            <span className={css.dim}>Pick the square where both answers meet.</span>
          )}
        </p>
      </div>

      <div className={css.foot}>
        <p className={css.hint} id={hintId}>
          <kbd>↑</kbd>
          <kbd>↓</kbd> here and now · <kbd>←</kbd>
          <kbd>→</kbd> ideal system · <kbd>Home</kbd> <kbd>End</kbd> <kbd>PgUp</kbd> <kbd>PgDn</kbd> edges
        </p>
        {!palette.needsGlyphs && (
          <label className={css.toggle}>
            <input type="checkbox" checked={marksAlways} onChange={e => setMarksAlways(e.target.checked)} />
            Marks on every square
          </label>
        )}
      </div>
    </div>
  )
}

function Line({ label, tone, v }: { label: string; tone: 'now' | 'ideal'; v: V | null }) {
  return (
    <div className={css.line}>
      <span className={`${css.lineLabel} ${tone === 'now' ? css.nowText : css.idealText}`}>
        <span className={tone === 'now' ? css.halfNow : css.halfIdeal} aria-hidden />
        {label}
      </span>
      <span className={css.lineWord}>{v === null ? '—' : LABEL[v]}</span>
      <span className={css.lineNum}>{v === null ? '' : signed(v)}</span>
    </div>
  )
}

export default function InkFirst({ mode, palette, statement, size = 'full' }: ProtoProps) {
  return (
    <div className={`${css.root} ${size === 'small' ? css.small : ''} ${palette.needsGlyphs ? css.mono : ''}`}>
      {mode === 'hero' ? <Hero palette={palette} small={size === 'small'} /> : <Answer palette={palette} statement={statement} />}
    </div>
  )
}

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { COLS, LABEL, ROWS, prefersReducedMotion, type V } from '../../kit'
import { signed, type Palette } from '../../palettes'
import type { ProtoMeta, ProtoProps } from '../../types'
import { FRAMES, HALF_NAME, PERSONAS, TAGS, colOf, quadrant, rowOf, verdict, type Frame, type Half, type Persona, type TagId } from './story'
import css from './story.module.css'

/**
 * "Story demo": the hero tells a two-person story on the answer grid.
 * Person A (the rich bought the courts) and person B (a well-run democracy)
 * pick the SAME ideal column but very different here-and-now rows; a ring
 * travels column-first, then row, so the viewer learns which half of a square
 * means what. Answer mode is the same board, clean and keyboard-operable.
 */

export const meta: ProtoMeta = {
  name: 'Story demo',
  tagline: 'Two people, one statement: same ideal, different here and now. Watch the story, then try it.',
  ideas: [
    {
      id: 'two-persona-story',
      title: 'Two-persona story in the hero',
      detail: 'Persona A (rich bought the courts) and B (well-run democracy) answer the landing statement: same ideal column, rows four apart, ending on a "the gap" frame.',
    },
    {
      id: 'column-then-row',
      title: 'Column first, then row',
      detail: 'The ring slides across to the ideal column while only that column’s ideal halves are lit, then up or down to the row with only the now halves lit, teaching which triangle means what.',
    },
    {
      id: 'corner-crop-tags',
      title: 'Corner meanings as crop-mark tags',
      detail: 'The four plain-language corner meanings sit at the grid corners like crop marks (no side axis labels); the tag for the quadrant you are in lights up.',
    },
    {
      id: 'region-emoji',
      title: 'Five region emoji',
      detail: '👍 good both ways, 🩹 needed now but not ideally, ⏳ ideal but not for us now, 👎 bad every time, ⚖️ torn. Used on the corner tags and the verdict line only, never in cells.',
    },
    {
      id: 'numerals-on-active',
      title: 'Signed numerals on the active square',
      detail: 'Each triangle of the active, hovered or focused square shows its value (−3…+3) in contrasting ink; on the mono palette every square shows them.',
    },
    {
      id: 'palette-value-chips',
      title: 'Readout chips in the grid’s own colours',
      detail: 'The caption and readout show “Here and now +3 · Strongly agree” with the value chip filled exactly like that triangle, so the legend is the grid itself.',
    },
    {
      id: 'verdict-line',
      title: 'Plain-language verdict for any square',
      detail: 'Picking a square states what it means in words built from the two signs (“Good in an ideal system, but bad for us here and now”).',
    },
    {
      id: 'story-bar',
      title: 'Story progress bar with pause, and a hand-off',
      detail: 'Stories-style segments you can click or pause; reduced motion opens on a static annotated final frame; “Try it yourself” turns the hero into the answer pad.',
    },
  ],
}

/* ------------------------------------------------------------------ cell */

function SplitCell({ now, ideal, palette, glyphs, fade }: { now: V; ideal: V; palette: Palette; glyphs: boolean; fade?: Half | null }) {
  return (
    <svg viewBox="0 0 100 100" className={css.svg} aria-hidden data-fade={fade ?? undefined}>
      {/* Ideal fills the square, "now" is drawn over it: no anti-aliased seam on same-colour cells. */}
      <rect className={css.idealTri} width="100" height="100" fill={palette.fill(ideal)} />
      <polygon className={css.nowTri} points="0,0 100,0 0,100" fill={palette.fill(now)} />
      {glyphs && (
        <>
          <text x="30" y="33" fill={palette.ink(now)} className={`${css.glyph} ${css.nowGlyph}`}>
            {signed(now)}
          </text>
          <text x="70" y="69" fill={palette.ink(ideal)} className={`${css.glyph} ${css.idealGlyph}`}>
            {signed(ideal)}
          </text>
        </>
      )}
    </svg>
  )
}

function HalfIcon({ half, v, palette }: { half: Half; v: V; palette: Palette }) {
  return (
    <svg viewBox="0 0 20 20" className={css.halfIcon} aria-hidden>
      <rect x="1" y="1" width="18" height="18" rx="2" className={css.halfIconBox} />
      <polygon points={half === 'now' ? '1,1 19,1 1,19' : '19,1 19,19 1,19'} fill={palette.fill(v)} className={css.halfIconTri} />
    </svg>
  )
}

function Reading({ half, v, palette }: { half: Half; v: V; palette: Palette }) {
  return (
    <span className={css.reading}>
      <HalfIcon half={half} v={v} palette={palette} />
      <span className={css.readingHalf}>{HALF_NAME[half]}</span>
      <span className={css.chip} style={{ background: palette.fill(v), color: palette.ink(v) }}>
        {signed(v)}
      </span>
      <span className={css.readingWord}>{LABEL[v]}</span>
    </span>
  )
}

/* ----------------------------------------------------------------- board */

function Board({
  litTags,
  role,
  label,
  children,
  overlay,
  onKeyDown,
}: {
  litTags: Set<TagId>
  role: 'img' | 'radiogroup'
  label: string
  children: ReactNode
  overlay?: ReactNode
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void
}) {
  const tag = (id: TagId) => {
    const t = TAGS.find(x => x.id === id)!
    return (
      <span key={id} className={`${css.tag} ${css[`tag_${id}`]}`} data-lit={litTags.has(id) || undefined}>
        <span className={css.tagMark} aria-hidden />
        <span className={css.tagEmoji} aria-hidden>
          {t.emoji}
        </span>
        <span className={css.tagText}>{t.text}</span>
      </span>
    )
  }
  return (
    <div className={css.board}>
      {tag('tl')}
      {tag('tr')}
      <div className={css.gridWrap}>
        <div className={css.grid} role={role} aria-label={label} onKeyDown={onKeyDown}>
          {children}
        </div>
        {overlay && (
          <div className={css.overlay} aria-hidden>
            {overlay}
          </div>
        )}
      </div>
      {tag('bl')}
      {tag('br')}
    </div>
  )
}

const pos = (i: V, n: V) => ({ '--x': colOf(i), '--y': rowOf(n) }) as CSSProperties

function Ring({ persona, at, ghost }: { persona: Persona; at: { i: V; n: V } | undefined; ghost?: boolean }) {
  const shown = !!at
  const p = at ?? { i: 0 as V, n: 0 as V }
  return (
    <span className={`${css.ring} ${css[`ring_${persona.id}`]}`} style={pos(p.i, p.n)} data-shown={shown || undefined} data-ghost={ghost || undefined}>
      <span className={css.pin}>{persona.pin}</span>
    </span>
  )
}

/* ------------------------------------------------------------- story bar */

function StoryBar({
  step,
  playing,
  onStep,
  onToggle,
  onTry,
}: {
  step: number
  playing: boolean
  onStep: (k: number) => void
  onToggle: () => void
  onTry: () => void
}) {
  const [elapsed, setElapsed] = useState(0)
  const ms = FRAMES[step]!.ms
  useEffect(() => setElapsed(0), [step])
  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => setElapsed(e => e + 50), 50)
    return () => clearInterval(t)
  }, [playing, step])
  useEffect(() => {
    if (playing && elapsed >= ms) onStep((step + 1) % FRAMES.length)
  }, [elapsed, ms, playing, step, onStep])

  return (
    <div className={css.bar}>
      <button type="button" className={css.barBtn} onClick={onToggle} aria-label={playing ? 'Pause the story' : 'Play the story'}>
        {playing ? (
          <svg viewBox="0 0 16 16" aria-hidden>
            <rect x="3" y="2.5" width="3.5" height="11" rx="1" />
            <rect x="9.5" y="2.5" width="3.5" height="11" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" aria-hidden>
            <path d="M4 2.5v11l9.5-5.5z" />
          </svg>
        )}
      </button>
      <ol className={css.segs}>
        {FRAMES.map((f, k) => (
          <li key={f.id}>
            <button
              type="button"
              className={css.seg}
              aria-label={`Step ${k + 1} of ${FRAMES.length}: ${f.title}`}
              aria-current={k === step ? 'step' : undefined}
              onClick={() => onStep(k)}
            >
              <span className={css.segFill} style={{ width: `${k < step ? 100 : k === step ? Math.min(100, (elapsed / ms) * 100) : 0}%` }} />
            </button>
          </li>
        ))}
      </ol>
      <button type="button" className={css.tryBtn} onClick={onTry} data-try>
        Try it yourself
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ hero */

function Caption({ f, palette, active }: { f: Frame; palette: Palette; active: boolean }) {
  return (
    <div className={css.caption} data-active={active || undefined} aria-hidden={!active}>
      <p className={css.kicker}>
        {f.persona && (
          <span className={`${css.pinInline} ${f.persona.id === 'b' ? css.pinSquare : ''}`} aria-hidden>
            {f.persona.pin}
          </span>
        )}
        {f.persona ? f.persona.who : f.kicker}
      </p>
      <p className={css.capTitle}>{f.title}</p>
      <p className={css.capBody}>{f.body}</p>
      {f.reading && (
        <div className={css.readings}>
          {f.reading.map(r => (
            <Reading key={r.half} half={r.half} v={r.v} palette={palette} />
          ))}
        </div>
      )}
      {f.gap && (
        <div className={css.compare}>
          {[PERSONAS.a, PERSONAS.b].map(p => (
            <div key={p.id} className={css.compareRow}>
              <span className={`${css.pinInline} ${p.id === 'b' ? css.pinSquare : ''}`} aria-hidden>
                {p.pin}
              </span>
              <span className={css.compareWho}>{p.id === 'a' ? 'Rich bought the courts' : 'Well-run democracy'}</span>
              <span className={css.chipPair}>
                <HalfIcon half="ideal" v={p.i} palette={palette} />
                <span className={css.chip} style={{ background: palette.fill(p.i), color: palette.ink(p.i) }}>
                  {signed(p.i)}
                </span>
                <HalfIcon half="now" v={p.n} palette={palette} />
                <span className={css.chip} style={{ background: palette.fill(p.n), color: palette.ink(p.n) }}>
                  {signed(p.n)}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Hero({ palette, statement, onTry, focusTry }: { palette: Palette; statement: string; onTry: () => void; focusTry?: boolean }) {
  const reduced = useRef(prefersReducedMotion()).current
  const heroRef = useRef<HTMLDivElement>(null)
  // Coming back from "Replay the story": put focus back on the hand-off button instead of losing it to <body>.
  useEffect(() => {
    if (focusTry) heroRef.current?.querySelector<HTMLButtonElement>('[data-try]')?.focus()
  }, [focusTry])
  // Reduced motion: open on the static, fully annotated final frame and never auto-advance.
  const [step, setStep] = useState(reduced ? FRAMES.length - 1 : 0)
  const [playing, setPlaying] = useState(!reduced)
  const f = FRAMES[step]!
  const band = f.band

  const active = new Set<string>()
  if (f.a && !f.a.ghost) active.add(`${f.a.i}:${f.a.n}`)
  if (f.b) active.add(`${f.b.i}:${f.b.n}`)

  const lit = new Set<TagId>()
  for (const p of [f.a?.ghost ? undefined : f.a, f.b]) {
    const q = p && quadrant(p.i, p.n)
    if (q) lit.add(q)
  }

  const cellState = (i: V, n: V): { dim: boolean; fade: Half | null } => {
    if (!band) return { dim: false, fade: null }
    if (band.kind === 'col') {
      if (i !== band.i) return { dim: true, fade: null }
      // Ideal phase: only ideal halves are lit, the pinned square included. Its "now" half is
      // not answered yet; showing it (a neutral "0") read as "here and now: neutral".
      return { dim: false, fade: band.half === 'ideal' ? 'now' : null }
    }
    if (n !== band.n) return { dim: !active.has(`${i}:${n}`), fade: null }
    return { dim: false, fade: active.has(`${i}:${n}`) ? null : 'ideal' }
  }

  const gapTop = Math.min(rowOf(PERSONAS.a.n), rowOf(PERSONAS.b.n))
  const gapRows = Math.abs(rowOf(PERSONAS.a.n) - rowOf(PERSONAS.b.n))

  return (
    <div className={css.hero} data-step={f.id} ref={heroRef}>
      <p className={css.statement}>
        <span className={css.statementTag}>Statement</span>“{statement}”
      </p>
      <div className={css.heroBody}>
        <Board
          role="img"
          label={`Answer grid demo. ${f.title} ${f.body}`}
          litTags={lit}
          overlay={
            <>
              <span className={css.axisH} data-shown={f.axes || undefined}>
                <span className={css.axisLabel}>Ideal system →</span>
              </span>
              <span className={css.axisV} data-shown={f.axes || undefined}>
                <span className={css.axisLabel}>↑ Here and now</span>
              </span>
              <span className={css.torn} data-shown={f.axes || undefined}>
                ⚖️ torn
              </span>
              <span
                className={css.gap}
                data-shown={f.gap || undefined}
                style={{ '--x': colOf(PERSONAS.a.i), '--y': gapTop, '--h': gapRows } as CSSProperties}
              >
                <span className={css.gapLabel}>
                  gap <b>{gapRows}</b>
                </span>
              </span>
              <Ring persona={PERSONAS.a} at={f.a} ghost={f.a?.ghost} />
              <Ring persona={PERSONAS.b} at={f.b} ghost={f.b?.ghost} />
            </>
          }
        >
          {ROWS.map(n =>
            COLS.map(i => {
              const { dim, fade } = cellState(i, n)
              const on = active.has(`${i}:${n}`)
              return (
                <div key={`${i}:${n}`} className={css.cell} data-dim={dim || undefined} data-on={on || undefined} data-origin={(i === 0 && n === 0) || undefined}>
                  <SplitCell now={n} ideal={i} palette={palette} glyphs={on || palette.needsGlyphs} fade={fade} />
                </div>
              )
            }),
          )}
        </Board>

        <div className={css.side}>
          <StoryBar
            step={step}
            playing={playing}
            onStep={setStep}
            onToggle={() => {
              if (!playing && step === FRAMES.length - 1) setStep(0)
              setPlaying(p => !p)
            }}
            onTry={onTry}
          />
          {/* Announce captions only when the viewer drives the story; an auto-advancing live region talks over everything. */}
          <div className={css.captions} aria-live={playing ? 'off' : 'polite'}>
            {FRAMES.map((fr, k) => (
              <Caption key={fr.id} f={fr} palette={palette} active={k === step} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- answer */

function AnswerPad({ palette, statement, onBack, autoFocus }: { palette: Palette; statement: string; onBack?: () => void; autoFocus?: boolean }) {
  const [pick, setPick] = useState<{ i: V; n: V } | null>(null)
  const [hover, setHover] = useState<{ i: V; n: V } | null>(null)
  const [focus, setFocus] = useState<{ i: V; n: V }>({ i: 0, n: 0 })
  const refs = useRef(new Map<string, HTMLButtonElement>())
  // Entered via "Try it yourself": that button just unmounted, so land keyboard users on the grid's centre square.
  useEffect(() => {
    if (autoFocus) refs.current.get('0:0')?.focus()
  }, [autoFocus])
  const shown = hover ?? pick

  const move = (e: KeyboardEvent<HTMLDivElement>) => {
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key]
    let next: { i: V; n: V } | null = null
    if (d) next = { i: Math.max(-3, Math.min(3, focus.i + d[0]!)) as V, n: Math.max(-3, Math.min(3, focus.n + d[1]!)) as V }
    else if (e.key === 'Home') next = { i: focus.i, n: 0 }
    else if (e.key === '0') next = { i: 0, n: 0 }
    if (!next) return
    e.preventDefault()
    setFocus(next)
    setPick(next)
    refs.current.get(`${next.i}:${next.n}`)?.focus()
  }

  const v = shown ? verdict(shown.i, shown.n) : null
  const lit = new Set<TagId>()
  const q = shown && quadrant(shown.i, shown.n)
  if (q) lit.add(q)

  return (
    <div className={css.answer}>
      <p className={css.statementBig}>“{statement}”</p>
      <p className={css.howto}>
        Pick the square that fits both answers.
        <span className={css.howtoKey}>
          <HalfIcon half="now" v={2} palette={palette} /> top-left: here and now
        </span>
        <span className={css.howtoKey}>
          <HalfIcon half="ideal" v={2} palette={palette} /> bottom-right: ideal system
        </span>
      </p>
      <Board
        role="radiogroup"
        label="Your answer: rows are here and now (top agree), columns are your ideal system (right agree)"
        litTags={lit}
        onKeyDown={move}
        overlay={pick && <span className={`${css.ring} ${css.ring_you}`} style={pos(pick.i, pick.n)} data-shown />}
      >
        {ROWS.map(n =>
          COLS.map(i => {
            const key = `${i}:${n}`
            const picked = pick?.i === i && pick.n === n
            const hot = hover?.i === i && hover.n === n
            const focusable = focus.i === i && focus.n === n
            return (
              <button
                key={key}
                ref={el => {
                  if (el) refs.current.set(key, el)
                  else refs.current.delete(key)
                }}
                type="button"
                role="radio"
                aria-checked={picked}
                tabIndex={focusable ? 0 : -1}
                className={css.cell}
                data-on={picked || undefined}
                data-hot={hot || undefined}
                data-origin={(i === 0 && n === 0) || undefined}
                aria-label={`Here and now: ${LABEL[n]} (${signed(n)}). Ideal system: ${LABEL[i]} (${signed(i)}).`}
                onClick={() => {
                  setPick({ i, n })
                  setFocus({ i, n })
                }}
                onFocus={() => setFocus({ i, n })}
                onMouseEnter={() => setHover({ i, n })}
                onMouseLeave={() => setHover(null)}
              >
                <SplitCell now={n} ideal={i} palette={palette} glyphs={picked || hot || palette.needsGlyphs} />
              </button>
            )
          }),
        )}
      </Board>

      <div className={css.readout} aria-live="polite" data-preview={(hover && !(pick && hover.i === pick.i && hover.n === pick.n)) || undefined}>
        {shown && v ? (
          <>
            <p className={css.verdict}>
              <span className={css.verdictEmoji} aria-hidden>
                {v.emoji}
              </span>
              {v.text}
            </p>
            <div className={css.readings}>
              <Reading half="now" v={shown.n} palette={palette} />
              <Reading half="ideal" v={shown.i} palette={palette} />
            </div>
          </>
        ) : (
          <p className={css.placeholder}>Hover or use the arrow keys to see what each square means.</p>
        )}
      </div>
      {onBack && (
        <button type="button" className={css.tryBtn} onClick={onBack}>
          ← Replay the story
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ root */

export default function StoryProto({ mode, palette, statement, size = 'full' }: ProtoProps) {
  const [trying, setTrying] = useState(false)
  // Set once the viewer has switched hero ↔ pad, so focus follows the swap (not on first render).
  const [swapped, setSwapped] = useState(false)
  const swap = (t: boolean) => {
    setSwapped(true)
    setTrying(t)
  }
  return (
    <div className={css.root} data-size={size} data-mono={palette.needsGlyphs || undefined}>
      {mode === 'answer' || trying ? (
        <AnswerPad palette={palette} statement={statement} autoFocus={swapped && trying} onBack={mode === 'hero' ? () => swap(false) : undefined} />
      ) : (
        <Hero palette={palette} statement={statement} focusTry={swapped} onTry={() => swap(true)} />
      )}
    </div>
  )
}

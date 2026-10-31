import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { Answer } from '../engine/types'
import { LABEL, VALUES, label } from './answer'
import css from './Grid.module.css'

type V = (typeof VALUES)[number]

export interface GridProps {
  value: { i: Answer; n: Answer } | null
  onPick: (i: V, n: V) => void
  /** When false, cells are not interactive (landing demo playback). */
  interactive?: boolean
  compact?: boolean
  idPrefix?: string
}

/**
 * The 7×7 answer grid: columns = Ideal system (disagree → agree), rows = Here
 * and now (agree at the top). The diagonal means "same answer in both".
 * Implemented as a roving-tabindex grid so it is fully keyboard operable.
 */
export function Grid({ value, onPick, interactive = true, compact = false, idPrefix = 'g' }: GridProps) {
  const [cursor, setCursor] = useState<{ i: V; n: V }>(() => ({ i: (value?.i ?? 0) as V, n: (value?.n ?? 0) as V }))
  const [hover, setHover] = useState<{ i: V; n: V } | null>(null)
  const refs = useRef(new Map<string, HTMLButtonElement>())

  useEffect(() => {
    setCursor({ i: (value?.i ?? 0) as V, n: (value?.n ?? 0) as V })
  }, [value?.i, value?.n])

  const focusCell = (i: V, n: V) => {
    setCursor({ i, n })
    refs.current.get(`${i}:${n}`)?.focus()
  }

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const clamp = (x: number) => Math.max(-3, Math.min(3, x)) as V
    const { i, n } = cursor
    if (e.key === 'ArrowRight') focusCell(clamp(i + 1), n)
    else if (e.key === 'ArrowLeft') focusCell(clamp(i - 1), n)
    else if (e.key === 'ArrowUp') focusCell(i, clamp(n + 1))
    else if (e.key === 'ArrowDown') focusCell(i, clamp(n - 1))
    else if (e.key === 's' || e.key === 'S') focusCell(i, i)
    else return
    e.preventDefault()
  }

  const shown = hover ?? (value && value.i !== null && value.n !== null ? { i: value.i as V, n: value.n as V } : null)
  const rows = [...VALUES].reverse()

  return (
    <div className={`${css.wrap} ${compact ? css.compact : ''}`}>
      <div className={css.xTitle} id={`${idPrefix}-x`}>
        <span className="glyph-ideal" aria-hidden /> In your ideal system
      </div>
      <div className={css.yTitle} id={`${idPrefix}-y`}>
        <span className={css.yEndInline} aria-hidden>
          disagree
        </span>
        <span>
          <span className="glyph-now" aria-hidden /> Here and now
        </span>
        <span className={css.yEndInline} aria-hidden>
          agree
        </span>
      </div>
      <div className={css.yEnds} aria-hidden>
        <span>agree</span>
        <span>disagree</span>
      </div>
      <div
        className={css.grid}
        role="grid"
        aria-labelledby={`${idPrefix}-x ${idPrefix}-y`}
        aria-describedby={`${idPrefix}-help`}
        onKeyDown={interactive ? onKey : undefined}
        onMouseLeave={() => setHover(null)}
      >
        {rows.map(n => (
          <div role="row" className={css.row} key={n}>
            {VALUES.map(i => {
              const selected = value?.i === i && value?.n === n
              const focusable = cursor.i === i && cursor.n === n
              const diag = i === n
              return (
                <button
                  key={i}
                  ref={el => {
                    if (el) refs.current.set(`${i}:${n}`, el)
                  }}
                  type="button"
                  role="gridcell"
                  tabIndex={interactive && focusable ? 0 : -1}
                  disabled={!interactive}
                  aria-selected={selected}
                  aria-label={`Ideal: ${LABEL[i]}. Here and now: ${LABEL[n]}.`}
                  className={`${css.cell} ${diag ? css.diag : ''} ${selected ? css.selected : ''}`}
                  style={{ ['--ix' as string]: (i + 3) / 6, ['--nx' as string]: (n + 3) / 6 }}
                  onMouseEnter={() => setHover({ i, n })}
                  onFocus={() => {
                    setCursor({ i, n })
                    setHover({ i, n })
                  }}
                  onBlur={() => setHover(null)}
                  onClick={() => interactive && onPick(i, n)}
                >
                  {selected && <span className={css.mark} aria-hidden />}
                </button>
              )
            })}
          </div>
        ))}
      </div>
      <div className={css.xEnds} aria-hidden>
        <span>disagree</span>
        <span>agree</span>
      </div>
      <p className={css.readout} id={`${idPrefix}-help`} aria-live="polite">
        {shown ? (
          <>
            <span className="ideal">{label(shown.i)}</span> in your ideal ·{' '}
            <span className="now">{label(shown.n)}</span> here and now
            {shown.i === shown.n && <span className="muted"> — same in both</span>}
          </>
        ) : (
          <span className="muted">Tap the square where your two answers meet. Outlined squares on the diagonal mean the same answer in both.</span>
        )}
      </p>
    </div>
  )
}

/** Single-frame strip, used when one frame is passed and in two-row mode. */
export function Strip({
  value,
  onPick,
  frame,
  name,
}: {
  value: Answer
  onPick: (v: V) => void
  frame: 'I' | 'N'
  name: string
}) {
  return (
    <fieldset className={css.strip}>
      <legend className={css.stripLegend}>
        <span className={frame === 'I' ? 'glyph-ideal' : 'glyph-now'} aria-hidden />{' '}
        {frame === 'I' ? 'In your ideal system' : 'Here and now'}
      </legend>
      <div className={css.pills}>
        {VALUES.map(v => (
          <label key={v} className={`${css.pill} ${frame === 'I' ? css.pillI : css.pillN} ${value === v ? css.pillOn : ''}`}>
            <input type="radio" name={name} value={v} checked={value === v} onChange={() => onPick(v)} className="visually-hidden" />
            <span className={css.pillDot} style={{ ['--s' as string]: Math.abs(v) / 3 }} aria-hidden />
            <span className={css.pillText}>{LABEL[v]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { Answer } from '../engine/types'
import { LABEL, VALUES, type V } from './answer'
import { PALETTE_CHOICES, applyPalette, usePalette } from './tiles/paletteChoice'
import { isPaletteId } from './tiles/palettes'
import { headline, regionOf, sentence } from './tiles/regions'
import { Board, COLS, Key, Legend, ROWS, Ring, Tile, Values, cellKey, clampV, tileCss as t } from './tiles/Tiles'
import css from './Grid.module.css'

export interface GridProps {
  value: { i: Answer; n: Answer } | null
  onPick: (i: V, n: V) => void
  idPrefix?: string
  /** "full": the two-row legend (how-to practice, landing "Try it"); "key": a one-line key (quiz). */
  legend?: 'full' | 'key'
}

/**
 * The 7×7 answer grid as split tiles: columns = ideal system (−3 left → +3 right), rows =
 * here and now (+3 top → −3 bottom). Each tile's top-left triangle is here and now and its
 * bottom-right triangle the ideal, in the chosen palette; corner meanings bracket the board.
 * A roving-tabindex grid: arrows move, Home/End jump along the row, S jumps to the same
 * answer in both, Enter or Space answers. Moving never answers (an answer moves the quiz on).
 */
export function Grid({ value, onPick, idPrefix = 'g', legend = 'key' }: GridProps) {
  const palette = usePalette()
  const [cursor, setCursor] = useState<{ i: V; n: V }>(() => ({ i: (value?.i ?? 0) as V, n: (value?.n ?? 0) as V }))
  const [hover, setHover] = useState<{ i: V; n: V } | null>(null)
  const [focus, setFocus] = useState<{ i: V; n: V } | null>(null)
  const refs = useRef(new Map<string, HTMLButtonElement>())

  useEffect(() => {
    setCursor({ i: (value?.i ?? 0) as V, n: (value?.n ?? 0) as V })
  }, [value?.i, value?.n])

  const focusCell = (i: V, n: V) => {
    setCursor({ i, n })
    refs.current.get(cellKey(i, n))?.focus()
  }

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const { i, n } = cursor
    if (e.key === 'ArrowRight') focusCell(clampV(i + 1), n)
    else if (e.key === 'ArrowLeft') focusCell(clampV(i - 1), n)
    else if (e.key === 'ArrowUp') focusCell(i, clampV(n + 1))
    else if (e.key === 'ArrowDown') focusCell(i, clampV(n - 1))
    else if (e.key === 'Home') focusCell(-3, e.ctrlKey ? 3 : n)
    else if (e.key === 'End') focusCell(3, e.ctrlKey ? -3 : n)
    else if (e.key === 's' || e.key === 'S') focusCell(i, i)
    else return
    e.preventDefault()
  }

  const picked = value && value.i !== null && value.n !== null ? { i: value.i as V, n: value.n as V } : null
  const lit = hover ?? focus ?? picked
  const active = lit ? regionOf(lit.i, lit.n) : null
  const isPick = !!lit && !!picked && lit.i === picked.i && lit.n === picked.n

  return (
    <div className={css.host}>
      <div className={`${t.tiles} ${css.wrap}`} data-legend={legend}>
        <Board
          active={active}
          centreLit={!!lit && (lit.i === 0 || lit.n === 0)}
          cells={{
            role: 'grid',
            'aria-label': 'Your answer: rows are here and now, columns are your ideal system',
            'aria-describedby': `${idPrefix}-help`,
            onKeyDown: onKey,
            onMouseLeave: () => setHover(null),
          }}
          rows={ROWS.map(n => (
            <div role="row" className={t.row} key={n}>
              {COLS.map(i => {
                const selected = !!picked && picked.i === i && picked.n === n
                const on = !!lit && lit.i === i && lit.n === n
                return (
                  <button
                    key={i}
                    ref={el => {
                      if (el) refs.current.set(cellKey(i, n), el)
                      else refs.current.delete(cellKey(i, n))
                    }}
                    type="button"
                    role="gridcell"
                    tabIndex={cursor.i === i && cursor.n === n ? 0 : -1}
                    aria-selected={selected}
                    aria-label={`Ideal: ${LABEL[i]}. Here and now: ${LABEL[n]}.`}
                    className={t.cell}
                    data-on={(on && !selected) || undefined}
                    data-round={(i === 0 && n === 0) || undefined}
                    onMouseEnter={() => setHover({ i, n })}
                    onFocus={e => {
                      setCursor({ i, n })
                      // Only keyboard focus lights the read-out. A click or tap focuses the button too,
                      // and the quiz then moves focus to the next statement's centre cell: lighting
                      // that would open every statement on an unrequested "Neutral or torn".
                      if (focusVisible(e.currentTarget)) setFocus({ i, n })
                    }}
                    onBlur={() => setFocus(null)}
                    onClick={() => onPick(i, n)}
                  >
                    <Tile now={n} ideal={i} palette={palette} glyphs={palette.needsGlyphs || on || selected} />
                  </button>
                )
              })}
            </div>
          ))}
          overlay={<Ring at={picked} circle />}
        />
        <div className={css.aside}>
          <div className={`${t.readout} ${css.readout}`} id={`${idPrefix}-help`} aria-live="polite">
            {lit ? (
              <>
                <Values i={lit.i} n={lit.n} palette={palette}>
                  {isPick && <span className={t.pickedTag}>your answer</span>}
                </Values>
                <h3 className={t.readTitle}>
                  <span aria-hidden>{headline(lit.i, lit.n).emoji}</span> {headline(lit.i, lit.n).title}
                </h3>
                <p className={t.readBody}>{sentence(lit.i, lit.n)}</p>
              </>
            ) : (
              <>
                <p className={t.kicker}>Two answers, one tap</p>
                <h3 className={t.readTitle}>Pick the square that fits both</h3>
                <p className={t.readBody}>Higher up = more for it here and now. Further right = more for it in your ideal system.</p>
              </>
            )}
          </div>
          {legend === 'full' ? (
            <Legend palette={palette} cell={lit && { now: lit.n, ideal: lit.i }} />
          ) : (
            <>
              <Key palette={palette} />
              {/* The footer's picker is hidden while answering, so colour-blind users can switch here. */}
              <label className={css.colours}>
                Grid colours{' '}
                <select value={palette.id} onChange={e => isPaletteId(e.target.value) && applyPalette(e.target.value)}>
                  {PALETTE_CHOICES.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.id === 'bo' || c.id === 'rt' ? ' (colour-blind safe)' : ''}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function focusVisible(el: Element): boolean {
  try {
    return el.matches(':focus-visible')
  } catch {
    return true
  }
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

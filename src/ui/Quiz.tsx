import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CHIPS, type Answer, type ChipId } from '../engine/types'
import { orderedItems } from '../data/items'
import { CHIP_LABELS } from '../data/chips'
import { IDEAL_FRAME, NOW_FRAME, PRACTICE_ITEM, SHARED_RULE } from '../data/frames'
import { useStore } from './App'
import { Grid, Strip } from './Grid'
import { go } from './router'
import css from './Quiz.module.css'

const ADVANCE_MS = 260
/** Splits of at least this size pause for an optional reason (spec §3.1). */
const CHIP_THRESHOLD = 3

export function Quiz() {
  const { s, dispatch } = useStore()
  const order = useMemo(() => orderedItems(s.mode!), [s.mode])
  const [intro, setIntro] = useState(() => Object.keys(s.answers).length === 0)
  const item = order[s.index]
  const existing = item ? s.answers[item.id] : undefined
  const [passI, setPassI] = useState(false)
  const [passN, setPassN] = useState(false)
  const [pendingChip, setPendingChip] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    setPassI(existing ? existing.i === null && existing.n !== null : false)
    setPassN(existing ? existing.n === null && existing.i !== null : false)
    const big = existing && existing.i !== null && existing.n !== null && Math.abs(existing.n - existing.i) >= CHIP_THRESHOLD
    setPendingChip(!!big)
    // Only reset when the item changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id])

  useEffect(() => {
    if (s.index >= order.length) {
      dispatch({ type: 'stage', stage: 'context' })
      go('#/context')
    }
  }, [s.index, order.length, dispatch])

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  const advanceSoon = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = window.setTimeout(() => dispatch({ type: 'goto', index: s.index + 1 }), ADVANCE_MS)
  }, [dispatch, s.index])

  const record = useCallback(
    (i: Answer, n: Answer, input: 'grid' | 'rows') => {
      if (!item) return
      const big = i !== null && n !== null && Math.abs(n - i) >= CHIP_THRESHOLD
      dispatch({ type: 'answer', id: item.id, answer: { i, n, input, chip: big ? existing?.chip : undefined }, advance: false })
      setPendingChip(big)
      if (!big) advanceSoon()
    },
    [item, dispatch, existing?.chip, advanceSoon],
  )

  const passBoth = useCallback(() => {
    if (!item) return
    dispatch({ type: 'answer', id: item.id, answer: { i: null, n: null, input: s.input }, advance: true })
  }, [item, dispatch, s.input])

  const back = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    if (s.index === 0) {
      setIntro(true)
      return
    }
    dispatch({ type: 'goto', index: s.index - 1 })
  }, [dispatch, s.index])

  // Keyboard shortcuts outside the grid: P = pass both, I/N = unsure about one frame, Backspace = back.
  useEffect(() => {
    if (intro) return
    const on = (e: globalThis.KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'p' || e.key === 'P') passBoth()
      else if (e.key === 'i' || e.key === 'I') setPassI(v => !v)
      else if (e.key === 'n' || e.key === 'N') setPassN(v => !v)
      else if (e.key === 'Backspace') back()
      else if (e.key === 'Enter' && pendingChip) dispatch({ type: 'goto', index: s.index + 1 })
      else return
      e.preventDefault()
    }
    addEventListener('keydown', on)
    return () => removeEventListener('keydown', on)
  }, [intro, passBoth, back, pendingChip, dispatch, s.index])

  if (intro) return <Intro onStart={() => setIntro(false)} />
  if (!item) return null

  const progress = s.index / order.length
  const value = existing ? { i: existing.i, n: existing.n } : null
  const rowsMode = s.input === 'rows'

  return (
    <div className={`narrow ${css.quiz}`}>
      <div className={css.progress}>
        <div className={css.bar} aria-hidden>
          <div className={css.fill} style={{ width: `${progress * 100}%` }} />
        </div>
        <span className="small muted">
          {s.index + 1} of {order.length}
        </span>
      </div>

      <section className={css.card} aria-live="polite">
        <p className={css.statement}>{item.text}</p>
        {item.note && <p className={`small muted ${css.note}`}>{item.note}</p>}
      </section>

      <div className={css.answer}>
        {passI && passN ? null : passI || passN ? (
          <Strip
            key={`${item.id}-${passI ? 'N' : 'I'}`}
            frame={passI ? 'N' : 'I'}
            name={`${item.id}-single`}
            value={passI ? (value?.n ?? null) : (value?.i ?? null)}
            onPick={v => (passI ? record(null, v, s.input) : record(v, null, s.input))}
          />
        ) : rowsMode ? (
          <TwoRows key={item.id} value={value} onDone={(i, n) => record(i, n, 'rows')} />
        ) : (
          <Grid value={value} onPick={(i, n) => record(i, n, 'grid')} idPrefix={item.id} />
        )}
      </div>

      {pendingChip && existing && existing.i !== null && existing.n !== null && (
        <ChipRow
          chip={existing.chip}
          onChip={c => {
            dispatch({ type: 'chip', id: item.id, chip: c })
            if (c) advanceSoon()
          }}
          onNext={() => dispatch({ type: 'goto', index: s.index + 1 })}
        />
      )}

      <div className={css.controls}>
        <button type="button" className="btn btn-ghost" onClick={back}>
          Back
        </button>
        <div className={css.unsure} role="group" aria-label="Unsure about one frame">
          <label className={css.toggle}>
            <input type="checkbox" checked={passI} onChange={e => setPassI(e.target.checked)} /> Unsure about ideal
          </label>
          <label className={css.toggle}>
            <input type="checkbox" checked={passN} onChange={e => setPassN(e.target.checked)} /> Unsure about here and now
          </label>
        </div>
        <button type="button" className="btn" onClick={passBoth}>
          Pass
        </button>
      </div>
      <p className={`small muted ${css.hint}`}>
        Pass if you don’t understand a statement, don’t know, or would rather not say. Passed answers are left out of your
        results — they never count as neutral.
      </p>
      <div className={css.modeSwitch}>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => dispatch({ type: 'input', input: rowsMode ? 'grid' : 'rows' })}
        >
          {rowsMode ? 'Use the grid' : 'Use two rows instead of the grid'}
        </button>
      </div>
    </div>
  )
}

function TwoRows({ value, onDone }: { value: { i: Answer; n: Answer } | null; onDone: (i: Answer, n: Answer) => void }) {
  const [i, setI] = useState<Answer>(value?.i ?? null)
  const [n, setN] = useState<Answer>(value?.n ?? null)
  const pick = (ni: Answer, nn: Answer) => {
    setI(ni)
    setN(nn)
    if (ni !== null && nn !== null) onDone(ni, nn)
  }
  return (
    <div>
      <Strip frame="I" name="row-i" value={i} onPick={v => pick(v, n)} />
      <Strip frame="N" name="row-n" value={n} onPick={v => pick(i, v)} />
      {i !== null && (
        <button type="button" className="btn" onClick={() => pick(i, i)}>
          Same as ideal
        </button>
      )}
    </div>
  )
}

function ChipRow({ chip, onChip, onNext }: { chip?: ChipId; onChip: (c: ChipId | undefined) => void; onNext: () => void }) {
  const next = useRef<HTMLButtonElement>(null)
  useEffect(() => next.current?.focus(), [])
  return (
    <section className={css.chips} aria-label="Why the difference? (optional)">
      <p className={css.chipsTitle}>
        Your answers differ a lot here. <span className="muted">Why? Optional — pick one or skip.</span>
      </p>
      <div className={css.chipList}>
        {CHIPS.map(c => (
          <button
            key={c}
            type="button"
            className={`${css.chip} ${chip === c ? css.chipOn : ''}`}
            aria-pressed={chip === c}
            onClick={() => onChip(chip === c ? undefined : c)}
          >
            {CHIP_LABELS[c]}
          </button>
        ))}
      </div>
      <button ref={next} type="button" className="btn btn-primary" onClick={onNext}>
        Next statement
      </button>
    </section>
  )
}

function Intro({ onStart }: { onStart: () => void }) {
  const { s, dispatch } = useStore()
  const [practice, setPractice] = useState<{ i: Answer; n: Answer } | null>(null)
  return (
    <div className={`narrow ${css.intro}`}>
      <h2>Two answers, one tap</h2>
      <p>Every statement gets two answers. You give both with a single tap on the grid.</p>
      <div className={css.frames}>
        <div>
          <h3 className="ideal">
            <span className="glyph-ideal" aria-hidden /> In your ideal system
          </h3>
          <p className="small">{IDEAL_FRAME}</p>
        </div>
        <div>
          <h3 className="now">
            <span className="glyph-now" aria-hidden /> Here and now
          </h3>
          <p className="small">{NOW_FRAME}</p>
        </div>
      </div>
      <p className="small muted">{SHARED_RULE}</p>
      <section className={css.practice}>
        <p className="small muted">Practice — this one isn’t scored.</p>
        <p className={css.statement}>{PRACTICE_ITEM}</p>
        <Grid value={practice} onPick={(i, n) => setPractice({ i, n })} idPrefix="practice" />
      </section>
      <label className={css.toggle}>
        <input type="checkbox" checked={s.save} onChange={e => dispatch({ type: 'save', save: e.target.checked })} /> Save my
        progress on this device (you can clear it any time)
      </label>
      <div className={css.startRow}>
        <button type="button" className="btn btn-primary" onClick={onStart}>
          {Object.keys(s.answers).length ? 'Continue' : 'Start the questions'}
        </button>
      </div>
    </div>
  )
}

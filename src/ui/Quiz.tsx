import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { CHIPS, isRedLine, type Answer, type ChipId } from '../engine/types'
import { sessionStatements } from '../state/session'
import { CHIP_LABELS } from '../data/chips'
import { IDEAL_FRAME, IDEAL_STEM, NOW_FRAME, NOW_STEM, PRACTICE_ITEM, SHARED_RULE } from '../data/frames'
import { useStore } from './App'
import { Grid, Strip } from './Grid'
import { go, goReplace } from './router'
import { newRunId } from '../state/history'
import { reportStatementUrl } from './copy'
import css from './Quiz.module.css'

const ADVANCE_MS = 260
/** Splits of at least this size pause for an optional reason (spec §3.1). */
const CHIP_THRESHOLD = 3

export function Quiz() {
  const { s, dispatch } = useStore()
  // Fixed per run (extendRed is set when an extension starts), so answering never reorders it.
  const order = useMemo(() => sessionStatements(s), [s.mode, s.extendFrom, s.extendRed])
  /** Continuing a finished run: only the added statements are asked, then straight back to results. */
  const adding = s.extendFrom !== null
  const [intro, setIntro] = useState(() => !adding && Object.keys(s.answers).length === 0)
  /** Set when leaving for the results, so the changed state isn't mistaken for the end of the questions. */
  const [leaving, setLeaving] = useState(false)
  const item = order[s.index]
  const existing = item ? s.answers[item.id] : undefined
  /** Red lines come last, after a short card saying what they are. */
  const red = !!item && isRedLine(item)
  const redStart = order.findIndex(isRedLine)
  const redCount = redStart < 0 ? 0 : order.length - redStart
  const [redIntroSeen, setRedIntroSeen] = useState(false)
  const redIntro = !intro && red && s.index === redStart && !redIntroSeen && !existing
  const [passI, setPassI] = useState(false)
  const [passN, setPassN] = useState(false)
  const [pendingChip, setPendingChip] = useState(false)
  const timer = useRef<number | null>(null)
  const answerRef = useRef<HTMLDivElement>(null)
  const statementRef = useRef<HTMLElement>(null)
  /** Set when an answer is given from inside the answer area, so focus follows to the next item. */
  const refocus = useRef(false)

  // Reset per-item state during render (not in an effect) so the new item's first paint is already right.
  const [seenId, setSeenId] = useState(item?.id)
  if (seenId !== item?.id) {
    setSeenId(item?.id)
    setPassI(existing ? existing.i === null && existing.n !== null : false)
    setPassN(existing ? existing.n === null && existing.i !== null : false)
    setPendingChip(!red && !!(existing && existing.i !== null && existing.n !== null && Math.abs(existing.n - existing.i) >= CHIP_THRESHOLD))
  }

  // Keyboard users keep their place: after answering, focus the new item's grid cursor (or strip).
  useEffect(() => {
    if (!refocus.current) return
    refocus.current = false
    const area = answerRef.current
    const target =
      area?.querySelector<HTMLElement>('[role="gridcell"][tabindex="0"]') ??
      area?.querySelector<HTMLElement>('input[type="radio"]:checked') ??
      area?.querySelector<HTMLElement>('input[type="radio"], button')
    target?.focus({ preventScroll: true })
  }, [item?.id])

  // The how-to sets its own title, per step.
  useEffect(() => {
    if (intro) return
    document.title = redIntro ? 'Red lines — 12 Axes²' : `Statement ${s.index + 1} of ${order.length}${adding ? ' more' : ''} — 12 Axes²`
  }, [intro, redIntro, s.index, order.length, adding])

  /** Whether focus is in the answer area or chip row right now (i.e. a keyboard or tap answer, not Back). */
  const noteFocus = () => {
    const a = document.activeElement
    refocus.current = !!a?.closest('[data-answer-area]')
  }

  useEffect(() => {
    if (leaving || s.index < order.length) return
    if (adding) {
      // The context steps were answered when the run first finished.
      if (s.stage === 'quiz') dispatch({ type: 'finish', at: new Date().toISOString(), runId: newRunId() })
      goReplace('#/results')
    } else {
      dispatch({ type: 'stage', stage: 'context' })
      go('#/context')
    }
  }, [leaving, s.index, order.length, adding, s.stage, dispatch])

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
      noteFocus()
      // Reason chips explain axis splits; red lines skip them.
      const big = !red && i !== null && n !== null && Math.abs(n - i) >= CHIP_THRESHOLD
      dispatch({ type: 'answer', id: item.id, answer: { i, n, input, chip: big ? existing?.chip : undefined }, advance: false })
      setPendingChip(big)
      if (!big) advanceSoon()
    },
    [item, red, dispatch, existing?.chip, advanceSoon],
  )

  const passBoth = useCallback(() => {
    if (!item) return
    noteFocus()
    dispatch({ type: 'answer', id: item.id, answer: { i: null, n: null, input: s.input }, advance: true })
  }, [item, dispatch, s.input])

  const back = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    if (s.index === 0 && adding) {
      // Back from the first added statement returns to the results, unchanged.
      setLeaving(true)
      dispatch({ type: 'cancelExtend' })
      goReplace('#/results')
      return
    }
    if (s.index === 0) {
      setIntro(true)
      return
    }
    dispatch({ type: 'goto', index: s.index - 1 })
  }, [dispatch, s.index, adding])

  const nextItem = useCallback(() => {
    noteFocus()
    dispatch({ type: 'goto', index: s.index + 1 })
  }, [dispatch, s.index])

  // Keyboard shortcuts outside the grid: P = pass both, I/N = pass one frame, Backspace = back.
  useEffect(() => {
    if (intro || redIntro) return
    const on = (e: globalThis.KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      // Enter on a focused control keeps its own meaning (activate that button, link or cell).
      if (e.key === 'Enter' && t.closest?.('button, a, [role="gridcell"]')) return
      if (e.key === 'p' || e.key === 'P') passBoth()
      else if (e.key === 'i' || e.key === 'I') setPassI(v => !v)
      else if (e.key === 'n' || e.key === 'N') setPassN(v => !v)
      else if (e.key === 'Backspace') back()
      else if (e.key === 'Enter' && pendingChip) nextItem()
      else return
      e.preventDefault()
    }
    addEventListener('keydown', on)
    return () => removeEventListener('keydown', on)
  }, [intro, redIntro, passBoth, back, pendingChip, nextItem])

  // Leaving the intro unmounts the focused Start button: move focus to the first statement instead.
  const focusStatement = useRef(false)
  const startQuestions = () => {
    focusStatement.current = true
    setIntro(false)
  }
  const startRedLines = () => {
    focusStatement.current = true
    setRedIntroSeen(true)
  }
  useLayoutEffect(() => {
    if (intro || redIntro || !focusStatement.current) return
    focusStatement.current = false
    statementRef.current?.focus({ preventScroll: true })
  }, [intro, redIntro])

  if (intro) return <Intro onStart={startQuestions} />
  if (!item || leaving) return null
  if (redIntro)
    return (
      <RedIntro
        count={redCount}
        progress={s.index / order.length}
        position={`${s.index} of ${order.length}${adding ? ' more' : ''} answered`}
        onStart={startRedLines}
        onBack={back}
      />
    )

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
          {adding && ' more'}
        </span>
      </div>

      <section className={css.card} aria-live="polite" ref={statementRef} tabIndex={-1} data-route-focus>
        {red && (
          <p className={css.redTag}>
            Red line {s.index - redStart + 1} of {redCount} <span className="muted">· not scored on any axis</span>
          </p>
        )}
        <p className={css.statement}>{item.text}</p>
        {item.note && <p className={`small muted ${css.note}`}>{item.note}</p>}
      </section>

      <div className={css.answer} ref={answerRef} data-answer-area>
        {passI && passN ? (
          <div className={css.bothPassed} role="status">
            <p>You’ve passed both frames. Press Pass to skip this statement; it won’t count either way.</p>
            <button type="button" className="btn btn-primary" onClick={passBoth}>
              Pass this statement
            </button>
          </div>
        ) : passI || passN ? (
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
          <Grid key={item.id} value={value} onPick={(i, n) => record(i, n, 'grid')} idPrefix={item.id} />
        )}
      </div>

      {pendingChip && existing && existing.i !== null && existing.n !== null && (
        <ChipRow
          chip={existing.chip}
          onChip={c => {
            dispatch({ type: 'chip', id: item.id, chip: c })
            if (c) {
              noteFocus()
              advanceSoon()
            }
          }}
          onNext={nextItem}
        />
      )}

      <div className={css.controls}>
        <button type="button" className="btn btn-ghost" onClick={back}>
          {adding && s.index === 0 ? 'Back to my results' : 'Back'}
        </button>
        <div className={css.unsure} role="group" aria-label="Pass one frame only">
          <label className={css.toggle}>
            <input type="checkbox" checked={passI} onChange={e => setPassI(e.target.checked)} /> Pass ideal only
          </label>
          <label className={css.toggle}>
            <input type="checkbox" checked={passN} onChange={e => setPassN(e.target.checked)} /> Pass here-and-now only
          </label>
        </div>
        <button type="button" className="btn" onClick={passBoth}>
          Pass
        </button>
      </div>
      <p className={`small muted ${css.hint}`}>
        Pass if you don’t understand a statement, don’t know, or would rather not say. Passed answers are left out of your
        results — they never count as neutral.{' '}
        <a href={reportStatementUrl(item.id, item.text)} target="_blank" rel="noopener noreferrer">
          Report this statement
        </a>{' '}
        if it seems loaded or unclear.
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

function RedIntro({
  count,
  progress,
  position,
  onStart,
  onBack,
}: {
  count: number
  progress: number
  position: string
  onStart: () => void
  onBack: () => void
}) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => heading.current?.focus({ preventScroll: true }), [])
  return (
    <div className={`narrow ${css.quiz}`}>
      <div className={css.progress}>
        <div className={css.bar} aria-hidden>
          <div className={css.fill} style={{ width: `${progress * 100}%` }} />
        </div>
        <span className="small muted">{position}</span>
      </div>
      <section className={css.redIntro} aria-labelledby="red-intro">
        <p className={css.redTag}>Last part</p>
        <h2 id="red-intro" ref={heading} tabIndex={-1}>
          Red lines
        </h2>
        <p>
          {count} {count === 1 ? 'statement that tests' : 'statements that test'} red lines: positions some ideologies insist on
          and others reject outright.
        </p>
        <p>
          They don’t move your axis scores. They check which ideologies your answers rule out, the same way core commitments do.
          Answer them on the same grid, for your ideal system and for here and now; you can pass any of them.
        </p>
        <div className={css.startRow}>
          <button type="button" className="btn btn-primary" onClick={onStart}>
            Continue to the red lines
          </button>{' '}
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            Back
          </button>
        </div>
      </section>
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
    <section className={css.chips} aria-label="Why the difference? (optional)" data-answer-area>
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

/** The how-to before the first statement: short steps, each with a way straight into the quiz at top and bottom. */
const HOW_TO = [
  { title: 'Every statement gets two answers', next: 'Next: answering on the grid' },
  { title: 'One tap gives both answers', next: 'Next: passing and saving' },
  { title: 'Pass, and save your progress', next: null },
] as const

function Intro({ onStart }: { onStart: () => void }) {
  const { s, dispatch } = useStore()
  const [step, setStep] = useState(0)
  const [practice, setPractice] = useState<{ i: Answer; n: Answer } | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const moved = useRef(false)
  const resuming = Object.keys(s.answers).length > 0
  const startLabel = resuming ? 'Back to the statements' : 'Start the quiz'
  const skipLabel = resuming ? 'Back to the statements' : 'Skip to the first statement'
  const here = HOW_TO[step]!
  const last = step === HOW_TO.length - 1
  const at = `${step + 1} of ${HOW_TO.length}`

  const goStep = (k: number) => {
    moved.current = true
    setStep(k)
  }
  const next = () => (last ? onStart() : goStep(step + 1))

  // A new step starts at the top, and screen readers hear its heading.
  useLayoutEffect(() => {
    if (!moved.current) return
    moved.current = false
    scrollTo(0, 0)
    heading.current?.focus({ preventScroll: true })
  }, [step])

  useEffect(() => {
    document.title = `How to answer, ${at} — 12 Axes²`
  }, [at])

  // Enter goes to the next step, unless focus is on a control that has its own Enter.
  const onEnter = useRef(next)
  onEnter.current = next
  useEffect(() => {
    const on = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Enter' || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return
      const t = e.target as HTMLElement
      if (t.closest?.('button, a, input, select, textarea, [role="gridcell"]')) return
      e.preventDefault()
      onEnter.current()
    }
    addEventListener('keydown', on)
    return () => removeEventListener('keydown', on)
  }, [])

  return (
    <div className={`narrow ${css.intro}`}>
      <section className={css.howto} aria-labelledby="howto-title">
        <div className={css.howBar}>
          <p className={css.howWhere} aria-hidden>
            <span className={css.howName}>How to answer</span>
            <span className={css.howCount}>Step {at}</span>
            <span className={css.dots}>
              {HOW_TO.map((_, k) => (
                <i key={k} className={k === step ? css.dotOn : k < step ? css.dotDone : undefined} />
              ))}
            </span>
          </p>
          <button type="button" className={`btn btn-ghost ${css.howSkip}`} onClick={onStart}>
            {last ? startLabel : skipLabel}
          </button>
        </div>

        <div className={css.howBody}>
          <h2 id="howto-title" ref={heading} tabIndex={-1} data-route-focus>
            <span className="visually-hidden">How to answer, step {at}: </span>
            {here.title}
          </h2>

          {step === 0 && (
            <>
              <p>
                A short how-to before the statements: {HOW_TO.length} steps, about a minute. Each statement is answered twice,
                once for each of these:
              </p>
              <div className={css.frames}>
                <div>
                  <h3 className="ideal">
                    <span className="glyph-ideal" aria-hidden /> In your ideal system
                  </h3>
                  <p className="small">
                    {IDEAL_FRAME} {IDEAL_STEM}
                  </p>
                </div>
                <div>
                  <h3 className="now">
                    <span className="glyph-now" aria-hidden /> Here and now
                  </h3>
                  <p className="small">
                    {NOW_FRAME} {NOW_STEM}
                  </p>
                </div>
              </div>
              <p className="small muted">{SHARED_RULE}</p>
            </>
          )}

          {step === 1 && (
            <>
              <p>
                Across the grid is your <span className="ideal">ideal system</span>; up the grid is{' '}
                <span className="now">here and now</span>. One square holds both answers. Try it on this practice statement.
              </p>
              <section className={css.practice} aria-label="Practice statement">
                <p className="small muted">Practice. This one isn’t scored.</p>
                <p className={css.statement}>{PRACTICE_ITEM}</p>
                <Grid value={practice} onPick={(i, n) => setPractice({ i, n })} idPrefix="practice" legend="full" />
                <p className={`small ${css.practiceSaid}`} role="status">
                  {practice && 'That’s both answers. In the quiz, the same tap also takes you to the next statement.'}
                </p>
              </section>
              <p className="small muted">Prefer two separate rows? You can switch under every statement.</p>
            </>
          )}

          {step === 2 && (
            <>
              <dl className={css.tips}>
                <dt>Not sure? Pass.</dt>
                <dd>
                  Pass if you don’t understand a statement, don’t know, or would rather not say. Passed answers are left out of
                  your results; they never count as neutral.
                </dd>
                <dt>Sure about only one frame?</dt>
                <dd>Tick “Pass ideal only” or “Pass here-and-now only” and answer the other on a single row.</dd>
                <dt>Very different answers?</dt>
                <dd>You’ll be asked why, in one tap. It’s optional.</dd>
                <dt>Keyboard</dt>
                <dd>Arrow keys move on the grid, Enter answers, P passes and Backspace goes back.</dd>
              </dl>
              <label className={css.toggle}>
                <input type="checkbox" checked={s.save} onChange={e => dispatch({ type: 'save', save: e.target.checked })} /> Save
                my progress on this device (you can clear it any time)
              </label>
            </>
          )}

          <div className={css.howNav}>
            <button type="button" className="btn btn-primary" onClick={next}>
              {last ? startLabel : here.next}
            </button>
            {step > 0 && (
              <button type="button" className="btn btn-ghost" onClick={() => goStep(step - 1)}>
                Back
              </button>
            )}
            {!last && (
              <button type="button" className={`btn ${css.howSkipEnd}`} onClick={onStart}>
                {skipLabel}
              </button>
            )}
          </div>
          <p className={`small muted ${css.howKey}`}>{last ? 'Press Enter to start.' : 'Press Enter for the next step.'}</p>
        </div>
      </section>
    </div>
  )
}

import { useEffect, useMemo } from 'react'
import { isRedLine, type ItemAnswer, type Statement } from '../engine/types'
import { sameAnswer, sessionStatements } from '../state/session'
import { newRunId } from '../state/history'
import { CHIP_LABELS } from '../data/chips'
import { useStore } from './App'
import { label } from './answer'
import { go, goReplace } from './router'
import css from './Review.module.css'

/**
 * Reviewing a finished run: a list of every statement it asked (axis items, then red lines) with the
 * answers given, where any statement opens in the quiz to change. "Done" re-scores; a changed run is
 * saved as a new run linked to the original, which stays in the history unchanged.
 */

/** The list row to focus when coming back from a statement (its index in the quiz order). */
let returnFocus: number | null = null
/** Set when a statement was opened from the list in this page, so going back can pop that history entry. */
let openedFromList = false

/** Back from editing a statement to the list, with focus on that statement's row. */
export function backToList(index: number) {
  returnFocus = index
  if (openedFromList) {
    openedFromList = false
    history.back()
  } else goReplace('#/review')
}

/** "Review and change my answers" on the results page. */
export function ReviewButton() {
  const { dispatch } = useStore()
  return (
    <button
      type="button"
      className="btn"
      onClick={() => {
        returnFocus = null
        dispatch({ type: 'review' })
        go('#/review')
      }}
    >
      Review and change my answers
    </button>
  )
}

/** "Done, show my results": re-scores from the answers as they are now. */
export function useFinishReview() {
  const { dispatch } = useStore()
  return () => {
    dispatch({ type: 'finishReview', at: new Date().toISOString(), runId: newRunId() })
    goReplace('#/results')
  }
}

/** Shown above the results of a run whose answers were changed after its results. */
export function EditedNote() {
  const { s, runs } = useStore()
  if (!s.editedFrom) return null
  const original = runs.some(r => r.id === s.editedFrom)
  return (
    <div className={`wrap small ${css.edited}`} data-edited>
      <span className={css.editedTag}>Edited</span>
      <span>
        You changed answers after seeing your results, so these are worked out again from the new answers.
        {original && (
          <>
            {' '}
            <a href={`#/run/${s.editedFrom}`}>The run before your changes</a> is kept in your runs.
          </>
        )}
      </span>
    </div>
  )
}

export function ReviewPage() {
  const { s, dispatch } = useStore()
  const finish = useFinishReview()
  const order = useMemo(() => sessionStatements(s), [s.mode, s.stage])
  const base = s.review?.base ?? {}
  const changed = order.filter(st => !sameAnswer(base[st.id], s.answers[st.id])).length
  const redStart = order.findIndex(isRedLine)
  const axis = redStart < 0 ? order : order.slice(0, redStart)
  const red = redStart < 0 ? [] : order.slice(redStart)

  // Coming back from a statement: focus its row (after the route's own heading focus has run).
  useEffect(() => {
    openedFromList = false
    const k = returnFocus
    if (k === null) return
    const id = requestAnimationFrame(() => {
      returnFocus = null
      const el = document.querySelector<HTMLElement>(`[data-review-row="${k}"]`)
      el?.focus({ preventScroll: true })
      el?.scrollIntoView({ block: 'center' })
    })
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    document.title = 'Review your answers — 12 Axes²'
  }, [])

  const open = (k: number) => {
    dispatch({ type: 'goto', index: k })
    openedFromList = true
    go('#/quiz')
  }

  const row = (st: Statement, k: number) => (
    <li key={st.id}>
      <button type="button" className={css.row} data-review-row={k} onClick={() => open(k)}>
        <span className={css.num} aria-hidden>
          {k + 1}
        </span>
        <span className={css.body}>
          <span className={css.text}>{st.text}</span>
          <Answers a={s.answers[st.id]} />
          {!sameAnswer(base[st.id], s.answers[st.id]) && <span className={css.changed}>Changed</span>}
        </span>
      </button>
    </li>
  )

  const doneBar = (live: boolean) => (
    <div className={css.bar}>
      <p className="small" role={live ? 'status' : undefined}>
        {changed === 0 ? 'Nothing changed yet.' : `${changed} statement${changed === 1 ? '' : 's'} changed.`}
      </p>
      <button type="button" className="btn btn-primary" onClick={finish}>
        Done, show my results
      </button>
    </div>
  )

  return (
    <div className={`narrow ${css.review}`}>
      <section className={css.head}>
        <h1>Review your answers</h1>
        <p className="muted">
          Pick a statement to change its answers; Back and Next move through the rest. When you’re done, your results are
          worked out again from your answers as they are then. If anything changed, the run before is kept in your runs.
        </p>
        <p className={`small muted ${css.legend}`}>
          <span className="glyph-ideal" aria-hidden /> In your ideal system <span className="glyph-now" aria-hidden /> Here and now
        </p>
        {doneBar(true)}
      </section>

      <section aria-labelledby="review-axis">
        <h2 id="review-axis" className={css.group}>
          Statements <span className="muted">· {axis.length}</span>
        </h2>
        <ol className={css.list}>{axis.map((st, k) => row(st, k))}</ol>
      </section>

      {red.length > 0 && (
        <section aria-labelledby="review-red">
          <h2 id="review-red" className={css.group}>
            Red lines <span className="muted">· {red.length}, not scored on any axis</span>
          </h2>
          <ol className={css.list} start={redStart + 1}>
            {red.map((st, j) => row(st, redStart + j))}
          </ol>
        </section>
      )}

      {doneBar(false)}
    </div>
  )
}

/** Compact answers for one statement: ideal and here-and-now, a pass shown as passed, and the reason if any. */
function Answers({ a }: { a: ItemAnswer | undefined }) {
  if (!a) return <span className={`${css.answers} muted`}>Not answered</span>
  if (a.i === null && a.n === null) return <span className={`${css.answers} muted`}>Passed</span>
  return (
    <span className={css.answers}>
      <span className={css.frame}>
        <span className="glyph-ideal" aria-hidden /> <span className="visually-hidden">Ideal: </span>
        <span className={a.i === null ? 'muted' : 'ideal'}>{label(a.i)}</span>
      </span>
      <span className={css.frame}>
        <span className="glyph-now" aria-hidden /> <span className="visually-hidden">Here and now: </span>
        <span className={a.n === null ? 'muted' : 'now'}>{label(a.n)}</span>
      </span>
      {a.chip && <span className={css.chip}>{CHIP_LABELS[a.chip]}</span>}
    </span>
  )
}

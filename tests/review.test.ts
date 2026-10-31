import { describe, expect, it } from 'vitest'
import type { Answer, Answers } from '../src/engine/types'
import { itemsForMode, quizItems } from '../src/data/items'
import { RED_IDS } from '../src/data/redlines'
import { deriveOwn } from '../src/state/derive'
import { EMPTY, extendOptions, loadSession, reduce, sessionStatements, type Session } from '../src/state/session'
import { buildRun, cleanRun, recordRun, upsertRun, type Run } from '../src/state/history'

const FINISHED = '2026-10-31T10:00:00.000Z'
const EDITED = '2026-10-31T10:05:00.000Z'
const ORIGINAL = 'a1b2c3d4e5f60718'
const NEW_ID = 'ffeeddccbbaa9988'
const quick = itemsForMode('quick')
const first = quick[0]!.id

const done = (over: Partial<Session> = {}): Session => {
  const answers: Answers = {}
  quick.forEach((it, k) => (answers[it.id] = { i: ((k % 7) - 3) as Answer, n: ((k % 5) - 2) as Answer, input: 'grid' }))
  for (const id of RED_IDS) answers[id] = { i: 1, n: -1, input: 'grid' }
  return { ...EMPTY, mode: 'quick', stage: 'done', answers, sc: { 'sc-1': 2 }, country: 'AU', runId: ORIGINAL, finishedAt: FINISHED, ...over }
}

/** The history as the app keeps it: whatever recordRun returns, or the same list when it returns null. */
const record = (runs: Run[], s: Session, headline: string) => recordRun(runs, buildRun(s, headline)!) ?? runs

const edit = (s: Session, id: string, a: { i: Answer; n: Answer }) => reduce(s, { type: 'answer', id, answer: { ...a, input: 'grid' }, advance: false })
const finishReview = (s: Session) => reduce(s, { type: 'finishReview', at: EDITED, runId: NEW_ID })

describe('reviewing and changing answers after the results', () => {
  it('opens every statement the run asked, axis items then red lines, even for an extended run', () => {
    const s = reduce(done(), { type: 'review' })
    expect(s).toMatchObject({ stage: 'review', index: 0, review: { from: ORIGINAL } })
    expect(sessionStatements(s)).toEqual(quizItems('quick', null))
    expect(sessionStatements(s).slice(-RED_IDS.length).map(x => x.id)).toEqual(RED_IDS)
    // A run continued from Quick keeps extendFrom after finishing; reviewing still lists the whole run.
    const ext = reduce(done({ mode: 'standard', extendFrom: 'quick' }), { type: 'review' })
    expect(sessionStatements(ext)).toEqual(quizItems('standard', null))
    // Only a finished run can be reviewed.
    const quiz = { ...done(), stage: 'quiz' as const }
    expect(reduce(quiz, { type: 'review' })).toBe(quiz)
  })

  it('a change saves a new run linked to the original, which stays in the history unchanged', () => {
    const s0 = done()
    const runs0 = record([], s0, 'Original headline')
    const original = runs0[0]!
    let s = reduce(s0, { type: 'review' })
    s = edit(s, first, { i: 3, n: -3 })
    s = finishReview(s)
    expect(s).toMatchObject({ stage: 'done', runId: NEW_ID, editedFrom: ORIGINAL, finishedAt: EDITED, review: null })
    const runs = record(runs0, s, 'Edited headline')
    expect(runs).toHaveLength(2)
    // Newest first: the edited run is the current one, marked as edited.
    expect(runs[0]).toMatchObject({ id: NEW_ID, editedFrom: ORIGINAL, snapshot: { headline: 'Edited headline' } })
    expect(runs[0]!.answers[first]).toEqual({ i: 3, n: -3, input: 'grid' })
    // The original is byte-for-byte what it was, frozen headline included.
    expect(runs.find(r => r.id === ORIGINAL)).toEqual(original)
  })

  it('results are re-scored from the edited answers', () => {
    let s = reduce(done(), { type: 'review' })
    s = edit(s, first, { i: 3, n: -3 })
    s = finishReview(s)
    const own = deriveOwn(s)!
    expect(own.splits[0]).toMatchObject({ item: { id: first }, i: 3, n: -3 })
    expect(deriveOwn(done())!.payload).not.toEqual(own.payload)
  })

  it('no change (or a change put back) adds nothing and rewrites nothing', () => {
    const s0 = done()
    const runs0 = record([], s0, 'Original headline')
    // Changed, then changed back; a different input style doesn't count as a change either.
    let s = reduce(s0, { type: 'review' })
    s = edit(s, first, { i: 3, n: 3 })
    s = reduce(s, { type: 'answer', id: first, answer: { ...s0.answers[first]!, input: 'rows' }, advance: false })
    s = finishReview(s)
    expect(s).toMatchObject({ stage: 'done', runId: ORIGINAL, finishedAt: FINISHED, editedFrom: null })
    expect(s.answers).toBe(s0.answers)
    // Even scored under a later headline rule, the stored run is left as it is.
    expect(recordRun(runs0, buildRun(s, 'A different headline')!)).toBeNull()
    expect(record(runs0, s, 'A different headline')).toBe(runs0)
  })

  it('switching between the grid and two rows while reviewing, and changing nothing, rewrites nothing', () => {
    const s0 = done()
    const runs0 = record([], s0, 'Original headline')
    let s = reduce(s0, { type: 'review' })
    s = reduce(s, { type: 'input', input: 'rows' })
    s = finishReview(s)
    expect(s).toMatchObject({ runId: ORIGINAL, input: 'rows' })
    expect(record(runs0, s, 'A different headline')).toBe(runs0)
  })

  it('a changed reason alone counts as a change', () => {
    let s = reduce(done(), { type: 'review' })
    s = edit(s, first, { i: 3, n: -3 })
    s = finishReview(s)
    let t = reduce(s, { type: 'review' })
    t = reduce(t, { type: 'chip', id: first, chip: 'crisis' })
    t = reduce(t, { type: 'finishReview', at: '2026-10-31T10:09:00.000Z', runId: '0123456789abcdef' })
    // Editing an edited run links to the run it came from.
    expect(t).toMatchObject({ runId: '0123456789abcdef', editedFrom: NEW_ID })
  })

  it('an edited run can still be extended, and extending updates the edited run in place', () => {
    let s = reduce(done(), { type: 'review' })
    s = edit(s, first, { i: 3, n: -3 })
    s = finishReview(s)
    expect(extendOptions(s, Date.parse(EDITED)).map(o => o.mode)).toEqual(['standard', 'full'])
    s = reduce(s, { type: 'extend', mode: 'standard' })
    expect(s).toMatchObject({ stage: 'quiz', extendFrom: 'quick', runId: NEW_ID })
    for (const st of sessionStatements(s)) s = reduce(s, { type: 'answer', id: st.id, answer: { i: 1, n: 1 }, advance: true })
    s = reduce(s, { type: 'finish', at: '2026-10-31T10:20:00.000Z', runId: '1111111111111111' })
    expect(s).toMatchObject({ stage: 'done', mode: 'standard', runId: NEW_ID, editedFrom: ORIGINAL })
    expect(buildRun(s, 'x')!.editedFrom).toBe(ORIGINAL)
  })

  it('passing most statements leaves too few answers to match', () => {
    let s = reduce(done(), { type: 'review' })
    for (const it of quick.slice(0, 40)) s = edit(s, it.id, { i: null, n: null })
    s = finishReview(s)
    expect(deriveOwn(s)!.results.hero.kind).toBe('insufficient')
  })

  it('the edited marker survives export and import; a malformed one is dropped', () => {
    const r = { ...buildRun(done(), 'x')!, editedFrom: ORIGINAL }
    expect(cleanRun(JSON.parse(JSON.stringify(r)), FINISHED)!.editedFrom).toBe(ORIGINAL)
    expect(cleanRun({ ...r, editedFrom: 'not-an-id' }, FINISHED)!.editedFrom).toBeUndefined()
    expect(upsertRun([], r)[0]!.editedFrom).toBe(ORIGINAL)
  })

  it('recordRun updates a stored run when its answers really changed (extending, say)', () => {
    const runs0 = record([], done(), 'Original')
    const later = done({ finishedAt: '2026-10-31T11:00:00.000Z', answers: { ...done().answers, [first]: { i: 2, n: 2 } } })
    const runs = record(runs0, later, 'Later')
    expect(runs).toHaveLength(1)
    expect(runs[0]).toMatchObject({ id: ORIGINAL, finishedAt: '2026-10-31T11:00:00.000Z', snapshot: { headline: 'Later' } })
  })

  it('a stored review with nothing to compare against reopens as the results', () => {
    const store = new Map<string, string>()
    const ls = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) }
    const g = globalThis as unknown as { localStorage?: unknown; sessionStorage?: unknown }
    const prev = [g.localStorage, g.sessionStorage]
    g.localStorage = ls
    g.sessionStorage = ls
    try {
      store.set('12xx2.session.v1', JSON.stringify({ ...done(), stage: 'review', review: null }))
      expect(loadSession().stage).toBe('done')
      store.set('12xx2.session.v1', JSON.stringify(reduce(done(), { type: 'review' })))
      expect(loadSession()).toMatchObject({ stage: 'review', review: { from: ORIGINAL } })
    } finally {
      ;[g.localStorage, g.sessionStorage] = prev
    }
  })
})

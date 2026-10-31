import { describe, expect, it } from 'vitest'
import type { Answers, Item, Mode } from '../src/engine/types'
import { itemsForMode, longerModes, orderedItems, quizItems } from '../src/data/items'
import { RED_IDS } from '../src/data/redlines'
import { EMPTY, EXTEND_WINDOW_MS, extendOptions, reduce, sessionStatements, type Session } from '../src/state/session'
import { buildRun } from '../src/state/history'

const FINISHED = '2026-10-30T10:00:00.000Z'
const at = (ms: number) => Date.parse(FINISHED) + ms

/** A finished run in `mode` with every statement answered (red lines too, unless `red` is false: a run from before them). */
function finished(mode: Mode, red = true): Session {
  const answers: Answers = {}
  for (const it of itemsForMode(mode)) answers[it.id] = { i: 1, n: -1, input: 'grid' }
  if (red) for (const id of RED_IDS) answers[id] = { i: -2, n: null, input: 'grid' }
  return {
    ...EMPTY,
    mode,
    answers,
    index: quizItems(mode, null).length,
    sc: { 'sc-1': 2 },
    country: 'AU',
    stage: 'done',
    runId: 'abcdef0123456789',
    finishedAt: FINISHED,
  }
}

describe('quizItems', () => {
  it('asks only the statements the longer mode adds, in its order', () => {
    const added = quizItems('standard', 'quick')
    const quick = new Set(itemsForMode('quick').map(it => it.id))
    expect(added).toHaveLength(itemsForMode('standard').length - itemsForMode('quick').length)
    expect(added.some(it => quick.has(it.id))).toBe(false)
    expect(added).toEqual(orderedItems('standard').filter(it => !quick.has(it.id)))
    expect(quizItems('full', 'quick')).toHaveLength(itemsForMode('full').length - itemsForMode('quick').length)
    expect(quizItems('full', null)).toEqual([...orderedItems('full'), ...quizItems('quick', null).slice(-10)])
  })

  it('an extension asks only the red lines it is given, after the added axis items', () => {
    const q = quizItems('standard', 'quick', ['red-03', 'red-01'])
    expect(q.slice(-2).map(s => s.id)).toEqual(['red-01', 'red-03'])
    expect(q).toHaveLength(itemsForMode('standard').length - itemsForMode('quick').length + 2)
  })

  it('lists only longer modes', () => {
    expect(longerModes('quick')).toEqual(['standard', 'full'])
    expect(longerModes('standard')).toEqual(['full'])
    expect(longerModes('full')).toEqual([])
  })
})

describe('continuing a finished run', () => {
  it('keeps answers, context and run id, and starts on the first added statement', () => {
    const s = reduce(finished('quick'), { type: 'extend', mode: 'standard' })
    expect(s).toMatchObject({ mode: 'standard', extendFrom: 'quick', stage: 'quiz', index: 0, runId: 'abcdef0123456789', country: 'AU' })
    expect(s.answers).toEqual(finished('quick').answers)
    expect(s.sc).toEqual({ 'sc-1': 2 })
    const first = sessionStatements(s)[s.index]! as Item
    expect(first.tier).toBe('standard')
    // Red lines were answered when the run first finished, so the extension skips them.
    expect(s.extendRed).toEqual([])
    expect(sessionStatements(s)).toEqual(quizItems('standard', 'quick'))
    expect(first).toEqual(orderedItems('standard').find(it => it.tier === 'standard'))
  })

  it('ignores a mode that is not longer, or a run that is not finished', () => {
    const done = finished('standard')
    expect(reduce(done, { type: 'extend', mode: 'quick' })).toBe(done)
    expect(reduce(done, { type: 'extend', mode: 'standard' })).toBe(done)
    const quiz = { ...done, stage: 'quiz' as const }
    expect(reduce(quiz, { type: 'extend', mode: 'full' })).toBe(quiz)
  })

  it('finishing keeps the run id and updates the time', () => {
    let s = reduce(finished('quick'), { type: 'extend', mode: 'full' })
    s = reduce(s, { type: 'answer', id: quizItems('full', 'quick')[0]!.id, answer: { i: 2, n: 2 }, advance: true })
    s = reduce(s, { type: 'finish', at: '2026-10-30T12:00:00.000Z', runId: 'ffffffffffffffff' })
    expect(s).toMatchObject({ stage: 'done', mode: 'full', runId: 'abcdef0123456789', finishedAt: '2026-10-30T12:00:00.000Z' })
    const run = buildRun(s, 'x')!
    expect(run.id).toBe('abcdef0123456789')
    expect(run.mode).toBe('full')
    expect(Object.keys(run.answers)).toHaveLength(itemsForMode('quick').length + RED_IDS.length + 1)
  })

  it('a finished extension can be extended again from its new mode', () => {
    let s = reduce(finished('quick'), { type: 'extend', mode: 'standard' })
    s = reduce(s, { type: 'finish', at: FINISHED, runId: 'x' })
    s = reduce(s, { type: 'extend', mode: 'full' })
    expect(s).toMatchObject({ mode: 'full', extendFrom: 'standard', index: 0 })
  })

  it('cancelling returns to the shorter result; extra answers stay in the session but not in the run', () => {
    let s = reduce(finished('quick'), { type: 'extend', mode: 'standard' })
    const extra = quizItems('standard', 'quick')[0]!.id
    s = reduce(s, { type: 'answer', id: extra, answer: { i: 3, n: 3 }, advance: true })
    s = reduce(s, { type: 'cancelExtend' })
    expect(s).toMatchObject({ mode: 'quick', extendFrom: null, extendRed: null, stage: 'done', finishedAt: FINISHED, index: quizItems('quick', null).length })
    expect(s.answers[extra]).toBeDefined()
    expect(buildRun(s, 'x')!.answers[extra]).toBeUndefined()
    // Continuing again offers the earlier answer back.
    expect(reduce(s, { type: 'extend', mode: 'standard' }).answers[extra]).toEqual({ i: 3, n: 3 })
  })

  it('starting over clears the extension', () => {
    const s = reduce(reduce(finished('quick'), { type: 'extend', mode: 'standard' }), { type: 'start', mode: 'quick' })
    expect(s.extendFrom).toBeNull()
    expect(s.answers).toEqual({})
  })
})

describe('runs from before red lines existed', () => {
  it('get the red lines asked when extended, fixed at the start so answering them never shifts the order', () => {
    let s = reduce(finished('quick', false), { type: 'extend', mode: 'standard' })
    expect(s.extendRed).toEqual(RED_IDS)
    const order = sessionStatements(s)
    expect(order.slice(-10).map(x => x.id)).toEqual(RED_IDS)
    expect(order).toHaveLength(itemsForMode('standard').length - itemsForMode('quick').length + 10)
    s = reduce(s, { type: 'answer', id: 'red-01', answer: { i: -3, n: -3 }, advance: false })
    expect(sessionStatements(s)).toEqual(order)
    expect(extendOptions(finished('quick', false), at(0))[0]).toEqual({
      mode: 'standard',
      added: itemsForMode('standard').length - itemsForMode('quick').length + 10,
    })
  })

  it('a finished run keeps its red-line answers in the stored run', () => {
    const run = buildRun(finished('quick'), 'x')!
    for (const id of RED_IDS) expect(run.answers[id]).toEqual({ i: -2, n: null, input: 'grid' })
  })
})

describe('extendOptions', () => {
  it('offers each longer mode with its added count for 24 hours', () => {
    expect(extendOptions(finished('quick'), at(60_000))).toEqual([
      { mode: 'standard', added: itemsForMode('standard').length - itemsForMode('quick').length },
      { mode: 'full', added: itemsForMode('full').length - itemsForMode('quick').length },
    ])
    expect(extendOptions(finished('standard'), at(EXTEND_WINDOW_MS))).toEqual([
      { mode: 'full', added: itemsForMode('full').length - itemsForMode('standard').length },
    ])
  })

  it('offers nothing after 24 hours, for Full, or before finishing', () => {
    expect(extendOptions(finished('quick'), at(EXTEND_WINDOW_MS + 1))).toEqual([])
    expect(extendOptions(finished('full'), at(0))).toEqual([])
    expect(extendOptions({ ...finished('quick'), stage: 'quiz' }, at(0))).toEqual([])
    expect(extendOptions({ ...finished('quick'), finishedAt: null }, at(0))).toEqual([])
  })

  it('does not depend on saving', () => {
    expect(extendOptions({ ...finished('quick'), save: false }, at(0))).toHaveLength(2)
  })
})

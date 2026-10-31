import { describe, expect, it } from 'vitest'
import { RED_WORDING, migrateAnswers } from '../src/state/wording'
import { cleanRun } from '../src/state/history'
import type { Answers } from '../src/engine/types'

const NOW = '2026-11-01T00:00:00.000Z'

describe('red-line wording migration', () => {
  it('drops agree answers to the old red-10 frame by frame and keeps disagree', () => {
    const a: Answers = { 'red-10': { i: 2, n: -1 }, 'red-06': { i: 3, n: 3 } }
    expect(migrateAnswers(a, 1)).toEqual({ 'red-10': { i: null, n: -1 }, 'red-06': { i: 3, n: 3 } })
  })

  it('removes red-10 when neither frame survives, so it reads as not answered', () => {
    expect(migrateAnswers({ 'red-10': { i: 1, n: 3 } }, 1)).toEqual({})
    expect(migrateAnswers({ 'red-10': { i: null, n: 2 } }, 1)).toEqual({})
  })

  it('keeps disagree, neutral and passed answers as they are', () => {
    const a: Answers = { 'red-10': { i: -3, n: 0 } }
    expect(migrateAnswers(a, 1)).toBe(a)
  })

  it('leaves answers given to the current wording alone', () => {
    const a: Answers = { 'red-10': { i: 3, n: 3 } }
    expect(migrateAnswers(a, RED_WORDING)).toBe(a)
  })

  it('migrates saved runs without a wording version on load, and stamps them', () => {
    const run = cleanRun({ mode: 'quick', answers: { 'dem-01': { i: 2, n: 1 }, 'red-10': { i: 3, n: -2 } } }, NOW)
    expect(run?.answers['red-10']).toEqual({ i: null, n: -2 })
    expect(run?.wording).toBe(RED_WORDING)
    const again = cleanRun({ ...run, answers: { ...run!.answers, 'red-10': { i: 3, n: 3 } } }, NOW)
    expect(again?.answers['red-10']).toEqual({ i: 3, n: 3 })
  })
})

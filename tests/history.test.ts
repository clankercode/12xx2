import { describe, expect, it } from 'vitest'
import type { Answer, Answers } from '../src/engine/types'
import { itemsForMode } from '../src/data/items'
import { deriveOwn } from '../src/state/derive'
import { EMPTY, reduce, type Session } from '../src/state/session'
import {
  EXPORT_KIND,
  MAX_RUNS,
  buildRun,
  cleanRun,
  exportFile,
  mergeRuns,
  parseImport,
  runToSession,
  sameMethod,
  upsertRun,
  type Run,
} from '../src/state/history'

const NOW = '2026-10-31T10:00:00.000Z'
const answers = (f: (k: number) => [Answer, Answer]): Answers =>
  Object.fromEntries(itemsForMode('quick').map((it, k) => { const [i, n] = f(k); return [it.id, { i, n }] }))

const done = (over: Partial<Session> = {}): Session => ({
  ...EMPTY,
  mode: 'quick',
  stage: 'done',
  answers: answers(k => [((k % 7) - 3) as Answer, ((k % 5) - 2) as Answer]),
  sc: { 'sc-1': 2 },
  country: 'AU',
  runId: 'a1b2c3d4e5f60718',
  finishedAt: NOW,
  ...over,
})

const run = (id: string, finishedAt: string): Run => ({ ...buildRun(done({ runId: id, finishedAt }), 'X')! })

describe('run history', () => {
  it('finish keeps the run id when a run is finished again', () => {
    const s1 = reduce({ ...done(), stage: 'place', runId: null }, { type: 'finish', at: NOW, runId: 'aaaaaaaaaaaaaaaa' })
    expect(s1.runId).toBe('aaaaaaaaaaaaaaaa')
    const s2 = reduce({ ...s1, stage: 'place' }, { type: 'finish', at: '2026-10-31T11:00:00.000Z', runId: 'bbbbbbbbbbbbbbbb' })
    expect(s2.runId).toBe('aaaaaaaaaaaaaaaa')
    expect(s2.finishedAt).toBe('2026-10-31T11:00:00.000Z')
    expect(reduce(s2, { type: 'start', mode: 'full' }).runId).toBeNull()
  })

  it('a stored run re-scores to the same result as the live session', () => {
    const s = done()
    const r = buildRun(s, 'headline')!
    expect(deriveOwn(runToSession(r))!.payload).toEqual(deriveOwn(s)!.payload)
  })

  it('upserts by id, newest first, capped', () => {
    let runs: Run[] = []
    for (let k = 0; k < MAX_RUNS + 5; k++) runs = upsertRun(runs, run(k.toString(16).padStart(16, '0'), new Date(Date.UTC(2026, 0, 1, 0, k)).toISOString()))
    expect(runs).toHaveLength(MAX_RUNS)
    expect(runs[0]!.finishedAt > runs[1]!.finishedAt).toBe(true)
    const again = upsertRun(runs, { ...runs[5]!, snapshot: { headline: 'edited' } })
    expect(again).toHaveLength(MAX_RUNS)
    expect(again.filter(r => r.id === runs[5]!.id)).toHaveLength(1)
  })

  it('export → import round-trips, and merging skips runs already present', () => {
    const runs = [run('1111111111111111', NOW), run('2222222222222222', '2026-10-30T10:00:00.000Z')]
    const res = parseImport(JSON.stringify(exportFile(runs, NOW)), NOW)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.runs.map(r => ({ ...r, imported: undefined }))).toEqual(runs.map(r => ({ ...r, imported: undefined })))
    const m = mergeRuns([runs[0]!], res.runs)
    expect(m.added).toBe(1)
    expect(m.skipped).toBe(1)
    expect(m.runs).toHaveLength(2)
  })

  it('reads the older single-result export file', () => {
    const legacy = { tool: '12 Axes²', mode: 'quick', answers: done().answers, systemConfidence: { 'sc-1': 1 }, statusQuo: { fed: 20 }, country: 'NZ' }
    const res = parseImport(JSON.stringify(legacy), NOW)
    expect(res.ok && res.runs[0]!.country).toBe('NZ')
    expect(res.ok && res.runs[0]!.imported).toBe(true)
  })

  it('a run saved before the headline rule was versioned counts as a different method', () => {
    const r = run('5555555555555555', NOW)
    expect(sameMethod(r.method)).toBe(true)
    const { headline: _, ...old } = r.method
    expect(sameMethod(old)).toBe(false)
    expect(cleanRun({ ...r, method: old }, NOW)!.method.headline).toBe(1)
  })

  it('keeps red-line answers through export and import', () => {
    const r = buildRun(done({ answers: { ...done().answers, 'red-04': { i: -3, n: 1 } } }), 'X')!
    expect(r.answers['red-04']).toEqual({ i: -3, n: 1 })
    const back = parseImport(JSON.stringify(exportFile([r], NOW)), NOW)
    expect(back.ok && back.runs[0]!.answers['red-04']).toEqual({ i: -3, n: 1 })
    expect(cleanRun({ ...r, answers: { 'red-99': { i: 1, n: 1 } } }, NOW)).toBeNull()
  })

  it('rejects files that are not exports and drops malformed fields', () => {
    expect(parseImport('not json', NOW).ok).toBe(false)
    expect(parseImport('{"kind":"other"}', NOW).ok).toBe(false)
    const bad = { kind: EXPORT_KIND, runs: [{ mode: 'quick', answers: { nope: { i: 1, n: 1 } } }] }
    expect(parseImport(JSON.stringify(bad), NOW).ok).toBe(false)
    const r = cleanRun({ ...run('3333333333333333', NOW), country: 'ZZ', sc: { 'sc-1': 9, junk: 1 }, q: { fed: 500, dem: 10 } }, NOW)!
    expect(r.country).toBeNull()
    expect(r.sc).toEqual({})
    expect(r.q).toEqual({ dem: 10 })
    expect(cleanRun({ ...run('4444444444444444', NOW), answers: { [itemsForMode('quick')[0]!.id]: { i: 7, n: 0 } } }, NOW)).toBeNull()
  })
})

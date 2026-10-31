import { describe, expect, it } from 'vitest'
import { AXIS_IDS, type Answer, type Answers } from '../src/engine/types'
import {
  checkArchetype,
  checkCommitment,
  checkFrame,
  ruledOutIndices,
  validateCommitments,
  type Commitment,
  type CommitmentBook,
} from '../src/engine/commitments'
import { decodePayload, encodePayload, formatFor, payloadBytes, payloadSeed, profileToPayload, type Payload } from '../src/engine/payload'
import { deriveResults, type Hero } from '../src/engine/results'
import { computeProfile } from '../src/engine/score'
import { fnv1a, mulberry32 } from '../src/engine/prng'
import type { Archetype } from '../src/engine/match'
import { ALL_ITEMS, askedIdsForMode, itemsForMode } from '../src/data/items'
import { RED_IDS, RED_LINES } from '../src/data/redlines'
import { MAX_CORE, MAX_RED, isRedCommitment } from '../src/engine/commitments'
import { deriveOwn } from '../src/state/derive'
import { EMPTY } from '../src/state/session'
import { forSharing } from '../src/engine/payload'
import type { RedCode } from '../src/engine/types'
import { CALIBRATION } from '../src/data/calibration'
import { CATALOGUE, CATALOGUE_VERSION } from '../src/data/archetypes'
import { CATALOGUE_SLUGS, COMMITMENTS, ruledOutSlugs } from '../src/data/commitments'
import { decodeShared, deriveShared } from '../src/state/shared'
import fixture from './fixtures/commitments.json'

const SLUGS = CATALOGUE.map(a => a.slug)
const c = (item: string, side: 1 | -1, frame: 'I' | 'both' = 'I'): Commitment => ({ item, side, frame, why: 'test' })
const all = new Set(ALL_ITEMS.map(i => i.id))
const ans = (i: Answer, n: Answer = null): Answers => ({ 'lib-02': { i, n } })

describe('commitment evaluation', () => {
  it('applies the thresholds: |a| ≥ 1 on the right side passes, |a| ≥ 2 on the wrong side fails', () => {
    const v = (a: Answer, side: 1 | -1) => checkFrame(a, side, true, 'I')
    expect(v(1, 1).verdict).toBe('pass')
    expect(v(3, 1).verdict).toBe('pass')
    expect(v(-1, -1).verdict).toBe('pass')
    expect(v(-2, 1).verdict).toBe('fail')
    expect(v(-3, 1).verdict).toBe('fail')
    expect(v(2, -1).verdict).toBe('fail')
    expect(v(-1, 1)).toMatchObject({ verdict: 'unknown', reason: 'not-decisive' })
    expect(v(1, -1)).toMatchObject({ verdict: 'unknown', reason: 'not-decisive' })
    expect(v(0, 1)).toMatchObject({ verdict: 'unknown', reason: 'neutral' })
    expect(v(null, 1)).toMatchObject({ verdict: 'unknown', reason: 'passed' })
    expect(checkFrame(3, 1, false, 'I')).toMatchObject({ verdict: 'unknown', reason: 'not-asked' })
    expect(checkFrame(undefined, 1, true, 'I')).toMatchObject({ verdict: 'unknown', reason: 'passed' })
  })

  it('does not apply the item key: side is the sign of the raw answer', () => {
    const minusKeyed = ALL_ITEMS.find(i => i.key === -1)!
    const r = checkCommitment(c(minusKeyed.id, 1), { [minusKeyed.id]: { i: 3, n: null } }, all)
    expect(r.verdict).toBe('pass')
  })

  it('frame "I" ignores here and now; "both" fails if either fails and passes only if both pass', () => {
    expect(checkCommitment(c('lib-02', 1), ans(2, -3), all).verdict).toBe('pass')
    expect(checkCommitment(c('lib-02', 1, 'both'), ans(2, -3), all).verdict).toBe('fail')
    expect(checkCommitment(c('lib-02', 1, 'both'), ans(-3, 2), all).verdict).toBe('fail')
    expect(checkCommitment(c('lib-02', 1, 'both'), ans(2, 1), all).verdict).toBe('pass')
    expect(checkCommitment(c('lib-02', 1, 'both'), ans(2, null), all).verdict).toBe('unknown')
    expect(checkCommitment(c('lib-02', 1, 'both'), ans(2, -1), all).verdict).toBe('unknown')
    expect(checkCommitment(c('lib-02', 1, 'both'), ans(-2, null), all).verdict).toBe('fail')
    expect(checkCommitment(c('lib-02', 1, 'both'), ans(3, 3), all).frames.map(f => f.frame)).toEqual(['I', 'N'])
  })

  it('an item not asked in this length is unknown, never a pass', () => {
    const fullOnly = ALL_ITEMS.find(i => i.tier === 'full')!
    const asked = new Set(itemsForMode('quick').map(i => i.id))
    expect(checkCommitment(c(fullOnly.id, 1), { [fullOnly.id]: { i: 3, n: 3 } }, asked).verdict).toBe('unknown')
  })

  it('All column: ✘ if any ✘, else ? if any ?, else ✔; no commitments → none', () => {
    const book: CommitmentBook = {
      a: [c('lib-02', 1), c('rel-01', 1)],
      b: [c('lib-02', 1), c('rel-01', -1)],
      d: [],
    }
    const x: Answers = { 'lib-02': { i: 2, n: null }, 'rel-01': { i: 2, n: null } }
    expect(checkArchetype('a', book, x, all).all).toBe('pass')
    expect(checkArchetype('b', book, x, all).all).toBe('fail')
    expect(checkArchetype('a', book, { ...x, 'rel-01': { i: null, n: null } }, all).all).toBe('unknown')
    expect(checkArchetype('b', book, { ...x, 'lib-02': { i: 0, n: null } }, all).all).toBe('fail')
    expect(checkArchetype('d', book, x, all).all).toBe('none')
    expect(checkArchetype('missing', book, x, all).all).toBe('none')
    expect(ruledOutIndices(['a', 'b', 'd'], book, x, all)).toEqual([1])
  })
})

describe('commitments file', () => {
  const ok = { version: 1, method: 'm', commitments: { [SLUGS[0]!]: [c('lib-02', 1)] } }
  const bad = (patch: Record<string, unknown>) => ({ ...ok, commitments: { [SLUGS[0]!]: [{ ...c('lib-02', 1), ...patch }] } })

  it('the shipped file and the test fixture validate', () => {
    expect(COMMITMENTS).toBeTypeOf('object')
    expect(() => validateCommitments(fixture, ALL_ITEMS, SLUGS, RED_LINES)).not.toThrow()
    expect(validateCommitments(ok, ALL_ITEMS, SLUGS, RED_LINES)[SLUGS[0]!]).toHaveLength(1)
  })

  it('rejects bad data', () => {
    const v = (x: unknown) => () => validateCommitments(x, ALL_ITEMS, SLUGS, RED_LINES)
    expect(v({ ...ok, version: 2 })).toThrow(/version/)
    expect(v({ ...ok, commitments: { 'no-such-ideology': [] } })).toThrow(/unknown archetype/)
    expect(v(bad({ item: 'lib-99' }))).toThrow(/unknown item/)
    expect(v(bad({ side: 0 }))).toThrow(/side/)
    expect(v(bad({ frame: 'N' }))).toThrow(/frame/)
    expect(v(bad({ why: ' ' }))).toThrow(/why/)
    expect(v({ ...ok, commitments: { [SLUGS[0]!]: [c('lib-02', 1), c('lib-02', -1)] } })).toThrow(/duplicate/)
    const core = (n: number) => ['lib-01', 'lib-02', 'lib-03', 'lib-04', 'lib-05', 'lib-06', 'lib-07'].slice(0, n).map(id => c(id, 1))
    expect(MAX_CORE).toBe(6)
    expect(v({ ...ok, commitments: { [SLUGS[0]!]: core(6) } })).not.toThrow()
    expect(v({ ...ok, commitments: { [SLUGS[0]!]: core(7) } })).toThrow(/at most 6 core/)
    expect(v(bad({ coders: 4 }))).toThrow(/coders/)
  })

  it('red-line commitments: kind must match the statement, own cap, and do not count towards the core cap', () => {
    const v = (x: unknown) => () => validateCommitments(x, ALL_ITEMS, SLUGS, RED_LINES)
    const file = (list: Commitment[]) => ({ ...ok, commitments: { [SLUGS[0]!]: list } })
    const red = (id: string, side: 1 | -1 = -1): Commitment => ({ item: id, kind: 'red-line', side, frame: 'I', why: 'test' })
    const sixCore = ['lib-01', 'lib-02', 'lib-03', 'lib-04', 'lib-05', 'lib-06'].map(id => c(id, 1))
    expect(MAX_RED).toBe(10)
    const book = validateCommitments(file([...sixCore, ...RED_IDS.map(id => red(id))]), ALL_ITEMS, SLUGS, RED_LINES)
    expect(book[SLUGS[0]!]!.filter(isRedCommitment)).toHaveLength(10)
    expect(book[SLUGS[0]!]![6]).toMatchObject({ item: 'red-01', kind: 'red-line' })
    expect(book[SLUGS[0]!]![0]!.kind).toBeUndefined()
    expect(v(file([red('lib-02')]))).toThrow(/red-line commitments must name a red-line statement/)
    expect(v(file([c('red-01', -1)]))).toThrow(/needs kind "red-line"/)
    expect(v(file([{ ...red('red-01'), kind: 'core' as never }]))).toThrow(/kind/)
    expect(v(file([red('red-01'), red('red-01', 1)]))).toThrow(/duplicate/)
    expect(v(file([red('red-99')]))).toThrow(/red-line/)
    // Eleven red-line commitments can't be made from ten distinct red lines; the cap is checked against fakes.
    const many = Array.from({ length: 11 }, (_, k) => ({ id: `red-${String(k + 1).padStart(2, '0')}` }))
    expect(() => validateCommitments(file(many.map(r => red(r.id))), ALL_ITEMS, SLUGS, many)).toThrow(/at most 10 red-line/)
    // Without red lines known, the shipped file without kinds still validates.
    expect(() => validateCommitments(fixture, ALL_ITEMS, SLUGS, [])).not.toThrow()
  })
})

describe('red-line rule-outs', () => {
  const red = (id: string, side: 1 | -1, frame: 'I' | 'both' = 'I'): Commitment => ({ item: id, kind: 'red-line', side, frame, why: 'test' })
  const book: CommitmentBook = { a: [c('lib-02', 1), red('red-01', -1)], b: [red('red-03', -1, 'both')], c: [c('lib-02', 1)] }
  const asked = new Set(askedIdsForMode('quick'))

  it('a decisive red-line contradiction rules the ideology out, exactly like a core one', () => {
    const ans: Answers = { 'lib-02': { i: 2, n: 2 }, 'red-01': { i: 3, n: -3 }, 'red-03': { i: -2, n: 2 } }
    expect(checkArchetype('a', book, ans, asked).all).toBe('fail')
    expect(checkArchetype('b', book, ans, asked).all).toBe('fail')
    expect(checkArchetype('c', book, ans, asked).all).toBe('pass')
    expect(ruledOutIndices(['a', 'b', 'c'], book, ans, asked)).toEqual([0, 1])
    // Slightly the wrong way or neutral is not decisive; the humane side holds.
    expect(checkArchetype('a', book, { ...ans, 'red-01': { i: 1, n: 1 } }, asked).all).toBe('unknown')
    expect(checkArchetype('a', book, { ...ans, 'red-01': { i: -1, n: 3 } }, asked).all).toBe('pass')
    // Red lines are asked at every length.
    for (const mode of ['quick', 'standard', 'full'] as const) expect(askedIdsForMode(mode)).toEqual(expect.arrayContaining([...RED_IDS]))
  })

  it('the owner view lists red-line answers and what they rule out; rule-outs and the opt-in block follow', () => {
    const items = itemsForMode('quick')
    const answers: Answers = Object.fromEntries(items.map(it => [it.id, { i: 0 as Answer, n: 0 as Answer }]))
    const slug = SLUGS.find(s2 => (COMMITMENTS[s2] ?? []).some(isRedCommitment))
    const own = deriveOwn({ ...EMPTY, mode: 'quick', stage: 'done', answers: { ...answers, 'red-02': { i: -3, n: 1 } } })!
    expect(own.redLines.map(r => r.line.id)).toEqual(RED_IDS)
    expect(own.redLines[1]!.answer).toEqual({ i: -3, n: 1 })
    expect(own.redLines[0]!.answer).toBeNull()
    expect(own.profile.total).toBe(items.length)
    // red-02 is humane on agree: ideal firmly against (3), here and now humane (1); unanswered = 0.
    expect(own.payload.red?.[1]).toEqual({ i: 3, n: 1 })
    expect(own.payload.red?.[0]).toEqual({ i: 0, n: 0 })
    expect(forSharing(own.payload, { q: false, sc: false, country: false }).red).toBeUndefined()
    expect(forSharing(own.payload, { q: false, sc: false, country: false, red: true }).red).toHaveLength(10)
    // A run from before red lines existed: nothing to share, and red-line commitments read "not asked".
    const old = deriveOwn({ ...EMPTY, mode: 'quick', stage: 'done', answers })!
    expect(old.payload.red).toBeUndefined()
    if (slug) {
      const rc = old.commitments.get(slug)!.checks.find(x => isRedCommitment(x.commitment))!
      expect(rc.frames[0]!.reason).toBe('not-asked')
    }
  })
})

describe('rule-outs in matching', () => {
  const mk = (slug: string, v: number, sensitive = false): Archetype => ({
    slug, name: slug, family: 'x', sensitive, summary: '', signature: '',
    ideal: AXIS_IDS.map(() => v), now: AXIS_IDS.map(() => v), weight: AXIS_IDS.map(() => 1), spread: AXIS_IDS.map(() => 0), sources: [],
  })
  const cat = [mk('left', -60), mk('centre', 0), mk('right', 60), mk('far', 95, true), mk('farther', 100)]
  const payloadFor = (I: number, N: number, se = 14, careless = false): Payload => ({
    format: 1, catalogue: 1, mode: 'standard', input: 'grid', careless, answered: 72, total: 72,
    I: AXIS_IDS.map(() => I), N: AXIS_IDS.map(() => N), seI: AXIS_IDS.map(() => se), seN: AXIS_IDS.map(() => se),
    G: AXIS_IDS.map(() => N - I), notable: AXIS_IDS.map(() => false), rg: 10,
  })
  const slugOf = (h: Hero, which: 'ideal' | 'now' = 'ideal') =>
    h.kind === 'no-close'
      ? h.nearest.match.arch.slug
      : h.kind === 'constant' || h.kind === 'split'
        ? (which === 'now' && h.kind === 'split' ? h.now : h.ideal).match.arch.slug
        : null

  it('no rule-outs leaves results exactly as before', () => {
    for (const [i, n] of [[-60, 60], [-55, -50], [84, 84], [10, 30]] as const) {
      const p = payloadFor(i, n)
      const a = deriveResults(p, cat, CALIBRATION)
      expect(deriveResults(p, cat, CALIBRATION, new Set())).toEqual(a)
      expect(a.matchesIdeal.every(m => !m.ruledOut)).toBe(true)
      expect(a.matchesIdeal).toHaveLength(3)
    }
  })

  it('a ruled-out nearest match never leads; the nearest one not ruled out does, with a note', () => {
    const p = payloadFor(-55, -50)
    expect(slugOf(deriveResults(p, cat, CALIBRATION).hero)).toBe('left')
    const r = deriveResults(p, cat, CALIBRATION, new Set(['left']))
    // 'centre' is far from these answers, so it is shown as the nearest, not named as a match.
    expect(r.hero.kind).toBe('no-close')
    if (r.hero.kind !== 'no-close') return
    expect(r.hero.nearest.match.arch.slug).toBe('centre')
    expect(r.hero.nearest.match.ruledOut).toBe(false)
    expect(r.hero.nearest.nearestRuledOut?.arch.slug).toBe('left')
    // The bootstrap never counts a ruled-out archetype as a winner.
    expect(r.hero.nearest.stability.wins.has('left')).toBe(false)
    // Ranked list keeps it visible, marked, plus three that are not ruled out.
    expect(r.matchesIdeal.map(m => [m.arch.slug, m.ruledOut])).toEqual([
      ['left', true],
      ['centre', false],
      ['right', false],
      ['far', false],
    ])
  })

  it('applies to the here-and-now pick too', () => {
    const p = payloadFor(-60, 60)
    expect(deriveResults(p, cat, CALIBRATION).hero.kind).toBe('split')
    const r = deriveResults(p, cat, CALIBRATION, new Set(['right']))
    expect(slugOf(r.hero, 'now')).not.toBe('right')
    if (r.hero.kind === 'constant' && r.hero.leaning) expect(r.hero.leaning.match.arch.slug).not.toBe('right')
    expect(r.matchesNow[0]).toMatchObject({ arch: { slug: 'right' }, ruledOut: true })
  })

  it('a sensitive leader that fails its gate falls back past ruled-out archetypes', () => {
    const p = payloadFor(84, 84, 98)
    const before = deriveResults(p, cat, CALIBRATION).hero
    expect(slugOf(before)).not.toBe('far')
    const out = new Set([slugOf(before)!])
    const r = deriveResults(p, cat, CALIBRATION, out)
    expect(['constant', 'no-close']).toContain(r.hero.kind)
    expect(out.has(slugOf(r.hero)!)).toBe(false)
    expect(slugOf(r.hero)).not.toBe('far')
  })

  it('every ideology ruled out → no ideology fits, never a ruled-out hero', () => {
    const r = deriveResults(payloadFor(0, 0), cat, CALIBRATION, new Set(cat.map(a => a.slug)))
    expect(r.hero.kind).toBe('none-fit')
    expect(r.matchesIdeal.every(m => m.ruledOut)).toBe(true)
  })

  it('careless answering still suppresses every claim', () => {
    const r = deriveResults(payloadFor(-55, -50, 14, true), cat, CALIBRATION, new Set(['left']))
    expect(r.hero.kind).toBe('unreliable')
    expect([r.matchesIdeal, r.matchesNow, r.joint]).toEqual([[], [], []])
  })

  it('is deterministic', () => {
    const p = payloadFor(-20, 30, 30)
    const out = new Set(['centre'])
    expect(deriveResults(p, cat, CALIBRATION, out)).toEqual(deriveResults(p, cat, CALIBRATION, out))
  })
})

describe('ruled-out field in share links', () => {
  const sample = (ruledOut?: number[]): Payload => {
    const rng = mulberry32(5)
    const items = itemsForMode('full')
    const a: Answers = Object.fromEntries(items.map(it => [it.id, { i: (Math.floor(rng() * 7) - 3) as Answer, n: (Math.floor(rng() * 7) - 3) as Answer }]))
    return profileToPayload(computeProfile(items, a, CALIBRATION), { catalogue: 1, mode: 'full', input: 'grid', ruledOut })
  }
  // Encoded by the format-1 codec before rule-outs existed.
  const LEGACY = 'AQFhRkg8eP-gWmSFImm-CnBGff-MWmmCKGm0Hm4iMwARIiIzIhERIjNpZv9aZGdiZ2RfbmMIBA4oCUFVyAZ'

  it('old links decode unchanged and re-encode byte-identically, with no rule-outs known', () => {
    const d = decodePayload(LEGACY)
    expect(d.ok).toBe(true)
    if (!d.ok) return
    expect(d.payload.format).toBe(1)
    expect(d.payload.ruledOut).toBeUndefined()
    expect(encodePayload(d.payload)).toBe(LEGACY)
    expect(ruledOutSlugs(d.payload).size).toBe(0)
  })

  it('payloads without rule-outs stay format 1', () => {
    const p = sample([])
    expect(p.ruledOut).toBeUndefined()
    expect(p.format).toBe(1)
    expect(payloadBytes(p)[0]).toBe(1)
  })

  it('round-trips as format 2 with a minimal bitmask', () => {
    for (const ro of [[0], [7], [8], [0, 5, 46], [3, 21, 27], [255], Array.from({ length: 47 }, (_, k) => k)]) {
      const p = sample(ro)
      expect(p.format).toBe(2)
      expect(formatFor(p)).toBe(2)
      const s = encodePayload(p)
      expect(decodePayload(s)).toEqual({ ok: true, payload: p })
      // 1 length byte + ceil((max + 1) / 8) mask bytes over the format-1 body.
      expect(payloadBytes(p).length - payloadBytes({ ...p, ruledOut: undefined }).length).toBe(1 + (Math.floor(Math.max(...ro) / 8) + 1))
    }
    expect(sample([5, 0, 5]).ruledOut).toEqual([0, 5])
  })

  it('the stability seed ignores rule-outs', () => {
    expect(payloadSeed(sample([3, 9]))).toBe(payloadSeed(sample()))
  })

  it('round-trips alongside every optional field', () => {
    const p: Payload = { ...sample([1, 30]), q: AXIS_IDS.map((_, k) => (k % 3 ? k * 7 - 40 : null)), sc: { score: 37, se: 12 }, country: 'AU', sensitiveOk: true }
    expect(decodePayload(encodePayload(p))).toEqual({ ok: true, payload: p })
  })

  const reencode = (bytes: number[]) => {
    const body = new Uint8Array(bytes)
    const out = new Uint8Array(body.length + 1)
    out.set(body)
    out[body.length] = fnv1a(body) & 0xff
    let s = ''
    for (const x of out) s += String.fromCharCode(x)
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') + 'Z'
  }

  it('rejects malformed or non-canonical bitmasks and newer formats', () => {
    const body = [...payloadBytes(sample([3]))].slice(0, -1)
    const head = body.slice(0, -2)
    expect(decodePayload(reencode(body)).ok).toBe(true)
    expect(decodePayload(reencode([...head, 0]))).toEqual({ ok: false, error: 'corrupt' })
    expect(decodePayload(reencode([...head, 1, 0]))).toEqual({ ok: false, error: 'corrupt' })
    expect(decodePayload(reencode([...head, 2, 8, 0]))).toEqual({ ok: false, error: 'corrupt' })
    expect(decodePayload(reencode([...head, 33, ...new Array(33).fill(1)]))).toEqual({ ok: false, error: 'corrupt' })
    expect(decodePayload(reencode([...head, 2, 8]))).toEqual({ ok: false, error: 'truncated' })
    expect(decodePayload(reencode([4, ...body.slice(1)]))).toEqual({ ok: false, error: 'newer-version' })
  })

  it('survives fuzzing of format-2 links without throwing', () => {
    const rng = mulberry32(123)
    const good = [...payloadBytes(sample([2, 9, 40]))].slice(0, -1)
    for (let t = 0; t < 2000; t++) {
      const b = [...good]
      const edits = 1 + Math.floor(rng() * 3)
      for (let e = 0; e < edits; e++) {
        const k = Math.floor(rng() * b.length)
        const op = rng()
        if (op < 0.5) b[k] = Math.floor(rng() * 256)
        else if (op < 0.75) b.splice(k, 1)
        else b.splice(k, 0, Math.floor(rng() * 256))
      }
      expect(() => decodePayload(reencode(b))).not.toThrow()
    }
  })

  // Encoded by the format-2 codec before red lines existed (country + sensitive opt-in + rule-outs 2, 9, 40).
  const LEGACY2 = 'AgHBRkhuUII8liiqFL4AZP9wUn03mzKgHrQKaf8iITMRIkMiIhERMwBmZV9haW5aaVpuaf8gABFOWgYEAgAAAAHbZ'

  it('old format-2 links decode unchanged and re-encode byte-identically', () => {
    const d = decodePayload(LEGACY2)
    expect(d.ok).toBe(true)
    if (!d.ok) return
    expect(d.payload).toMatchObject({ format: 2, mode: 'standard', answered: 70, total: 72, country: 'NZ', sensitiveOk: true, ruledOut: [2, 9, 40] })
    expect(d.payload.I).toEqual([10, -20, 30, -40, 50, -60, 70, -80, 90, -100, 0, null])
    expect(d.payload.red).toBeUndefined()
    expect(encodePayload(d.payload)).toBe(LEGACY2)
  })

  const codes = (n: number, seed: number): { i: RedCode; n: RedCode }[] => {
    const r = mulberry32(seed)
    return Array.from({ length: n }, () => ({ i: Math.floor(r() * 4) as RedCode, n: Math.floor(r() * 4) as RedCode }))
  }

  it('format 3: the red-line block round-trips, with or without rule-outs, and only it makes format 3', () => {
    for (const ro of [undefined, [0], [3, 21, 27]]) {
      for (const n of [1, 2, 9, 10, 32]) {
        const red = codes(n, n * 7 + (ro?.length ?? 0))
        const p = profileToPayload(computeProfile(itemsForMode('full'), {}, CALIBRATION), { catalogue: 1, mode: 'full', input: 'grid', ruledOut: ro, red })
        const real = { ...sample(ro), red, format: 3 }
        for (const x of [p, real]) {
          expect(formatFor(x)).toBe(3)
          expect(decodePayload(encodePayload(x))).toEqual({ ok: true, payload: x })
        }
        // [ruled-out length (0 = none) + mask] + [count] + ceil(n/2) bytes over the format-1 body.
        const extra = payloadBytes(real).length - payloadBytes({ ...real, red: undefined, ruledOut: undefined }).length
        expect(extra).toBe(1 + (ro ? Math.floor(Math.max(...ro) / 8) + 1 : 0) + 1 + Math.ceil(n / 2))
        // Leaving the block out gives exactly the format-1/2 link.
        const without = { ...real, red: undefined, format: ro ? 2 : 1 }
        expect(encodePayload(forSharing(real, { q: false, sc: false, country: false }))).toBe(encodePayload(without))
        expect(payloadBytes(without)[0]).toBe(ro ? 2 : 1)
      }
    }
  })

  it('the stability seed ignores the red-line block', () => {
    expect(payloadSeed({ ...sample([3]), red: codes(10, 1) })).toBe(payloadSeed(sample()))
  })

  it('format 3 rejects non-canonical or malformed red-line blocks', () => {
    const p = { ...sample(), red: codes(3, 5), format: 3 }
    const body = [...payloadBytes(p)].slice(0, -1)
    const head = body.slice(0, -4) // drop [0][3][b0][b1]
    expect(head[0]).toBe(3)
    expect(decodePayload(reencode(body)).ok).toBe(true)
    expect(decodePayload(reencode([...head, 0, 0]))).toEqual({ ok: false, error: 'corrupt' }) // count 0
    expect(decodePayload(reencode([...head, 0, 33, ...new Array(17).fill(0)]))).toEqual({ ok: false, error: 'corrupt' }) // too many
    expect(decodePayload(reencode([...head, 0, 3, 0xff, 0xf1]))).toEqual({ ok: false, error: 'corrupt' }) // padding nibble set
    expect(decodePayload(reencode([...head, 0, 3, 0xff, 0xf0]))).toMatchObject({ ok: true })
    expect(decodePayload(reencode([...head, 0, 3, 0xff]))).toEqual({ ok: false, error: 'truncated' })
    expect(decodePayload(reencode([...head, 0, 3, 0xff, 0xf0, 0]))).toEqual({ ok: false, error: 'corrupt' }) // trailing byte
    expect(decodePayload(reencode([...head, 1, 0, 3, 0xff, 0xf0]))).toEqual({ ok: false, error: 'corrupt' }) // empty mask byte
    expect(decodePayload(reencode([...head, 0]))).toEqual({ ok: false, error: 'truncated' })
    // A format-1 body with a stray 3 in the format byte (no block) is not readable.
    const f1 = [...payloadBytes(sample())].slice(0, -1)
    expect(decodePayload(reencode([3, ...f1.slice(1)])).ok).toBe(false)
    expect(decodePayload(reencode([0, ...f1.slice(1)]))).toEqual({ ok: false, error: 'corrupt' })
  })

  it('survives fuzzing of format-3 links without throwing', () => {
    const rng = mulberry32(321)
    const good = [...payloadBytes({ ...sample([2, 9]), red: codes(10, 9) })].slice(0, -1)
    let ok = 0
    for (let t = 0; t < 3000; t++) {
      const b = [...good]
      const edits = 1 + Math.floor(rng() * 3)
      for (let e = 0; e < edits; e++) {
        const k = good.length - 1 - Math.floor(rng() * 12)
        const op = rng()
        if (op < 0.5) b[k] = Math.floor(rng() * 256)
        else if (op < 0.75) b.splice(k, 1)
        else b.splice(k, 0, Math.floor(rng() * 256))
      }
      let d: ReturnType<typeof decodePayload> | undefined
      expect(() => (d = decodePayload(reencode(b)))).not.toThrow()
      // Anything that still decodes re-encodes to the same bytes (canonical).
      if (d?.ok) {
        ok++
        expect(encodePayload(d.payload)).toBe(reencode(b))
      }
    }
    expect(ok).toBeGreaterThan(0)
  })

  it('a shared link shows the same hero as the owner, rule-outs included', () => {
    // Rule out the owner's nearest match on the real catalogue and check the viewer agrees.
    const rng = mulberry32(31)
    let checked = 0
    for (let t = 0; t < 40 && checked < 10; t++) {
      const items = itemsForMode('standard')
      const lean = AXIS_IDS.map(() => Math.floor(rng() * 7) - 3)
      const a: Answers = Object.fromEntries(
        items.map(it => {
          const v = Math.max(-3, Math.min(3, it.key * lean[AXIS_IDS.indexOf(it.axis)]! + Math.round(rng() * 2 - 1))) as Answer
          return [it.id, { i: v, n: v }]
        }),
      )
      const prof = computeProfile(items, a, CALIBRATION)
      const base = profileToPayload(prof, { catalogue: CATALOGUE_VERSION, mode: 'standard', input: 'grid' })
      const plain = deriveResults(base, CATALOGUE, CALIBRATION)
      if (plain.hero.kind !== 'constant' && plain.hero.kind !== 'split' && plain.hero.kind !== 'no-close') continue
      const top = CATALOGUE_SLUGS.indexOf(plain.matchesIdeal[0]!.arch.slug)
      const owner = profileToPayload(prof, { catalogue: CATALOGUE_VERSION, mode: 'standard', input: 'grid', ruledOut: [top] })
      const mine = deriveResults(owner, CATALOGUE, CALIBRATION, ruledOutSlugs(owner))
      const d = decodeShared(encodePayload({ ...owner, sensitiveOk: true }))
      expect(d.ok).toBe(true)
      if (!d.ok) continue
      const theirs = deriveShared(d.payload)
      expect(slugOf(theirs.hero)).toBe(slugOf(mine.hero))
      expect(slugOf(mine.hero)).not.toBe(CATALOGUE_SLUGS[top])
      expect(theirs.matchesIdeal[0]).toMatchObject({ arch: { slug: CATALOGUE_SLUGS[top] }, ruledOut: true })
      checked++
    }
    expect(checked).toBeGreaterThan(3)
  })

  it('indices from another catalogue version are ignored', () => {
    expect(ruledOutSlugs({ catalogue: CATALOGUE_VERSION, ruledOut: [0] })).toEqual(new Set([CATALOGUE_SLUGS[0]]))
    expect(ruledOutSlugs({ catalogue: CATALOGUE_VERSION + 1, ruledOut: [0] }).size).toBe(0)
    expect(ruledOutSlugs({ catalogue: CATALOGUE_VERSION, ruledOut: [999] }).size).toBe(0)
  })
})

function slugOf(h: Hero) {
  if (h.kind === 'no-close') return h.nearest.match.arch.slug
  return h.kind === 'constant' || h.kind === 'split' ? h.ideal.match.arch.slug : null
}

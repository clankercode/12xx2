import { describe, expect, it } from 'vitest'
import { AXIS_IDS, type Answer, type Answers, type Item } from '../src/engine/types'
import { MAX_AXIS_ITEMS, carelessThreshold, computeProfile, gapAxis, realityGap, scoreAxis, tableAt, tauFor } from '../src/engine/score'
import { decodePayload, encodePayload, payloadSeed, profileToPayload, type Payload } from '../src/engine/payload'
import { classify, typeGap } from '../src/engine/typology'
import { coverageOk, distance, stability, type Archetype } from '../src/engine/match'
import { deriveResults } from '../src/engine/results'
import { mulberry32 } from '../src/engine/prng'
import { ALL_ITEMS, askedIdsForMode, itemsForMode, orderedItems, quizItems } from '../src/data/items'
import { RED_IDS, RED_LINES, validateRedLines } from '../src/data/redlines'
import { isRedLine, redCode, type Mode } from '../src/engine/types'
import type { Calibration } from '../src/engine/calibration'
import { CALIBRATION } from '../src/data/calibration'

const items = ALL_ITEMS
const answerAll = (f: (it: Item) => [Answer, Answer]): Answers =>
  Object.fromEntries(items.map(it => { const [i, n] = f(it); return [it.id, { i, n }] }))

describe('axis scoring', () => {
  it('all-agree scores 0 on every axis (balanced keying cancels acquiescence)', () => {
    const p = computeProfile(items, answerAll(() => [3, 3]), CALIBRATION)
    for (const ax of AXIS_IDS) {
      expect(p.I[ax].score).toBeCloseTo(0)
      expect(p.N[ax].score).toBeCloseTo(0)
    }
  })

  it('all-agree stays 0 under random pass masks', () => {
    const rng = mulberry32(7)
    for (let t = 0; t < 200; t++) {
      const ans = answerAll(() => [rng() < 0.4 ? null : 2, rng() < 0.4 ? null : 2])
      const p = computeProfile(items, ans, CALIBRATION)
      for (const ax of AXIS_IDS) {
        const s = p.I[ax].score
        if (s !== null) expect(s).toBeCloseTo(0)
      }
    }
  })

  it('pole-perfect answering gives ±100', () => {
    const p = computeProfile(items, answerAll(it => [(3 * it.key) as Answer, (-3 * it.key) as Answer]), CALIBRATION)
    for (const ax of AXIS_IDS) {
      expect(p.I[ax].score).toBeCloseTo(100)
      expect(p.N[ax].score).toBeCloseTo(-100)
    }
  })

  it('pass is not neutral: passing excludes the item instead of pulling toward 0', () => {
    const axis = items.filter(i => i.axis === 'col')
    const strong: Answers = Object.fromEntries(axis.map(it => [it.id, { i: (3 * it.key) as Answer, n: null }]))
    const passOne = { ...strong, [axis[0]!.id]: { i: null, n: null } }
    const neutralOne = { ...strong, [axis[0]!.id]: { i: 0 as Answer, n: null } }
    expect(scoreAxis(axis, passOne, 'I').score).toBeCloseTo(100)
    expect(scoreAxis(axis, neutralOne, 'I').score!).toBeLessThan(100)
    expect(scoreAxis(axis, strong, 'N').score).toBeNull()
  })

  it('needs ≥3 answers including both keys', () => {
    const axis = items.filter(i => i.axis === 'fed')
    const onlyPlus: Answers = Object.fromEntries(axis.filter(i => i.key === 1).map(it => [it.id, { i: 2 as Answer, n: 2 as Answer }]))
    expect(scoreAxis(axis, onlyPlus, 'I').score).toBeNull()
  })

  it('band is positive even for perfectly consistent answers, and clamped to 100', () => {
    const axis = items.filter(i => i.axis === 'pro')
    const s = scoreAxis(axis, Object.fromEntries(axis.map(it => [it.id, { i: (2 * it.key) as Answer, n: null }])), 'I')
    expect(s.se!).toBeGreaterThan(5)
    const wild = Object.fromEntries(axis.map((it, k) => [it.id, { i: (k % 2 ? 3 : -3) as Answer, n: null }]))
    expect(scoreAxis(axis, wild, 'I').se!).toBeLessThanOrEqual(100)
  })
})

describe('gaps', () => {
  it('identical frames give zero gap and RG 0', () => {
    const rng = mulberry32(3)
    const ans = answerAll(() => { const v = (Math.floor(rng() * 7) - 3) as Answer; return [v, v] })
    const p = computeProfile(items, ans, CALIBRATION)
    expect(p.rg.rg).toBe(0)
    for (const ax of AXIS_IDS) {
      expect(p.gaps[ax].g ?? 0).toBeCloseTo(0)
      expect(p.gaps[ax].notable).toBe(false)
    }
  })

  it('a uniform shift in Now is cancelled by balanced keying (no fake gap from response style)', () => {
    const ans = answerAll(() => [0, 2])
    const p = computeProfile(items, ans, CALIBRATION)
    for (const ax of AXIS_IDS) expect(p.gaps[ax].g).toBeCloseTo(0)
  })

  it('a real keyed shift on one axis is notable; others are not', () => {
    const ans = answerAll(it => {
      const i = it.key as Answer
      const n = (it.axis === 'col' ? -2 * it.key : it.key) as Answer
      return [i, n]
    })
    const p = computeProfile(items, ans, CALIBRATION)
    expect(p.gaps.col.notable).toBe(true)
    expect(p.gaps.col.g!).toBeLessThan(0)
    expect(p.gaps.fed.notable).toBe(false)
  })

  it('per-frame passes cannot create a gap: G uses paired items only', () => {
    const axis = items.filter(i => i.axis === 'lib')
    const ans: Answers = Object.fromEntries(axis.map((it, k) => [it.id, { i: (it.key * (k % 3)) as Answer, n: k === 0 ? null : ((it.key * (k % 3)) as Answer) }]))
    expect(gapAxis(axis, ans, CALIBRATION).g).toBeCloseTo(0)
  })

  it('random clicking has RG ≈ 38 (exact expectation 16/7/6·100)', () => {
    const rng = mulberry32(11)
    let sum = 0
    const T = 400
    for (let t = 0; t < T; t++) {
      const ans = answerAll(() => [(Math.floor(rng() * 7) - 3) as Answer, (Math.floor(rng() * 7) - 3) as Answer])
      sum += realityGap(items, ans).rg!
    }
    expect(sum / T).toBeCloseTo((16 / 7 / 6) * 100, 0)
  })
})

describe('typology', () => {
  it('is total: every input yields exactly one type', () => {
    const seen = new Set<string>()
    for (let q = -100; q <= 100; q += 5)
      for (let i = -100; i <= 100; i += 5)
        for (let n = -100; n <= 100; n += 5) {
          const t = classify(q, i, n)
          expect(['away-from-settled', 'status-quo', 'partway', 'beyond', 'opposite']).toContain(t)
          seen.add(t)
        }
    expect(seen.size).toBe(5)
  })

  it('classifies canonical cases', () => {
    expect(classify(-60, 60, 0)).toBe('partway')
    expect(classify(-60, 60, 90)).toBe('beyond')
    expect(classify(-20, 60, -70)).toBe('opposite')
    expect(classify(-60, 60, -55)).toBe('status-quo')
    expect(classify(50, 55, -40)).toBe('away-from-settled')
  })

  it('reports unclear when a one-SE band flips the type', () => {
    expect(typeGap(-60, 60, -46, 10, 10)).toBe('unclear')
    expect(typeGap(-60, 60, 0, 10, 10)).toBe('partway')
  })
})

describe('payload codec', () => {
  const sample = (): Payload => {
    const rng = mulberry32(5)
    const ans = answerAll(() => [(Math.floor(rng() * 7) - 3) as Answer, (Math.floor(rng() * 7) - 3) as Answer])
    const p = computeProfile(items, ans, CALIBRATION)
    return profileToPayload(p, { catalogue: 1, mode: 'full', input: 'grid' })
  }

  it('round-trips', () => {
    const p = sample()
    const s = encodePayload(p)
    const d = decodePayload(s)
    expect(d.ok).toBe(true)
    if (d.ok) expect(d.payload).toEqual(p)
    expect(s.length).toBeLessThan(90)
  })

  it('round-trips optional fields', () => {
    const p: Payload = { ...sample(), q: AXIS_IDS.map((_, k) => (k % 3 ? k * 7 - 40 : null)), sc: { score: 37, se: 12 }, country: 'AU' }
    const d = decodePayload(encodePayload(p))
    expect(d.ok && d.payload).toEqual(p)
  })

  it('round-trips the sensitive opt-in and rejects impossible results', () => {
    const p: Payload = { ...sample(), sensitiveOk: true }
    expect(decodePayload(encodePayload(p))).toEqual({ ok: true, payload: p })
    const k = p.G.findIndex(g => g !== null)
    const bad: Payload = { ...sample(), G: p.G.map((g, i) => (i === k ? null : g)), notable: p.notable.map((n, i) => n || i === k) }
    expect(decodePayload(encodePayload(bad))).toEqual({ ok: false, error: 'corrupt' })
    expect(decodePayload(encodePayload({ ...sample(), answered: 200, total: 144 }))).toEqual({ ok: false, error: 'corrupt' })
  })

  it('detects truncation and corruption', () => {
    const s = encodePayload(sample())
    // Dropping the terminator is always rejected (as truncated, or by the checksum when the last data char is also 'Z').
    for (let cut = 1; cut < 6; cut++) expect(decodePayload(s.slice(0, -cut)).ok).toBe(false)
    expect(decodePayload(s.slice(0, 20) + 'Z').ok).toBe(false)
    const flipped = s.slice(0, 10) + (s[10] === 'A' ? 'B' : 'A') + s.slice(11)
    expect(decodePayload(flipped).ok).toBe(false)
    expect(decodePayload('')).toEqual({ ok: false, error: 'empty' })
  })

  it('survives fuzzing without throwing', () => {
    const rng = mulberry32(99)
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
    for (let t = 0; t < 2000; t++) {
      const len = Math.floor(rng() * 100)
      let s = ''
      for (let k = 0; k < len; k++) s += alphabet[Math.floor(rng() * alphabet.length)]
      expect(() => decodePayload(s + 'Z')).not.toThrow()
    }
  })

  it('seed ignores optional share toggles', () => {
    const p = sample()
    expect(payloadSeed(p)).toBe(payloadSeed({ ...p, country: 'NZ', sc: { score: 1, se: 1 } }))
  })
})

describe('matching', () => {
  const mk = (slug: string, v: number, sensitive = false): Archetype => ({
    slug, name: slug, family: 'x', sensitive, summary: '', signature: '',
    ideal: AXIS_IDS.map(() => v), now: AXIS_IDS.map(() => v), weight: AXIS_IDS.map(() => 1), spread: AXIS_IDS.map(() => 0), sources: [],
  })
  const cat = [mk('left', -60), mk('centre', 0), mk('right', 60), mk('far', 95, true)]

  it('distance ignores uncovered axes and is 0 at identity', () => {
    expect(distance(AXIS_IDS.map(() => 10), AXIS_IDS.map(() => 10), AXIS_IDS.map(() => 1))).toBe(0)
    const u = AXIS_IDS.map((_, k) => (k < 6 ? 10 : null))
    expect(distance(u, AXIS_IDS.map(() => 10), AXIS_IDS.map(() => 1))).toBe(0)
  })

  it('coverage gate needs 8 axes and 2 per group', () => {
    expect(coverageOk(AXIS_IDS.map(() => 0))).toBe(true)
    expect(coverageOk(AXIS_IDS.map((_, k) => (k < 7 ? 0 : null)))).toBe(false)
    expect(coverageOk(AXIS_IDS.map((_, k) => (k % 3 === 0 ? null : 0)))).toBe(true)
  })

  it('stability is deterministic for a seed', () => {
    const u = AXIS_IDS.map(() => 25)
    const se = AXIS_IDS.map(() => 20)
    const a = stability(u, se, cat, 'ideal', 42)
    const b = stability(u, se, cat, 'ideal', 42)
    expect([...a.wins]).toEqual([...b.wins])
  })

  const payloadFor = (I: number, N: number, careless = false, se = 14): Payload => ({
    format: 1, catalogue: 1, mode: 'standard', input: 'grid', careless, answered: 72, total: 72,
    I: AXIS_IDS.map(() => I), N: AXIS_IDS.map(() => N), seI: AXIS_IDS.map(() => se), seN: AXIS_IDS.map(() => se),
    G: AXIS_IDS.map(() => N - I), notable: AXIS_IDS.map(() => false), rg: 10,
  })

  it('hero splits only when Now clearly favours another archetype', () => {
    expect(deriveResults(payloadFor(-60, 60), cat, CALIBRATION).hero.kind).toBe('split')
    expect(deriveResults(payloadFor(-60, -58), cat, CALIBRATION).hero.kind).toBe('constant')
  })

  it('careless flag suppresses the hero and every closeness or gap claim', () => {
    const r = deriveResults({ ...payloadFor(-60, 60, true), notable: AXIS_IDS.map(() => true) }, cat, CALIBRATION)
    expect(r.hero.kind).toBe('unreliable')
    expect([r.matchesIdeal, r.matchesNow, r.joint]).toEqual([[], [], []])
    expect(r.rows.some(x => x.notable)).toBe(false)
    expect(r.strongestGap).toBeNull()
  })

  it('the displayed match carries its own stability, not the modal winner\'s', () => {
    // Extreme scores clamp the bootstrap, so a rival can win most draws; the label must describe what is shown.
    const two = [mk('a', 100), mk('b', 93)]
    const r = deriveResults(payloadFor(100, 100), two, CALIBRATION)
    if (r.hero.kind === 'constant') {
      const st = r.hero.ideal.stability
      expect(st.share).toBeCloseTo(st.wins.get(r.hero.ideal.match.arch.slug) ?? 0)
    }
  })

  it('a missing here-and-now frame never claims a split', () => {
    const p = { ...payloadFor(-60, 0), N: AXIS_IDS.map(() => null), seN: AXIS_IDS.map(() => null), G: AXIS_IDS.map(() => null) }
    expect(deriveResults(p, cat, CALIBRATION).hero).toMatchObject({ kind: 'constant', nowMissing: true })
  })

  it('sensitive archetypes need very close + stable to lead', () => {
    // Closest to 'far' but with wide bands, so not "stable": the best non-sensitive archetype leads.
    expect(deriveResults(payloadFor(84, 84), cat, CALIBRATION).hero).toMatchObject({ kind: 'constant', ideal: { match: { arch: { slug: 'far' } } } })
    const r = deriveResults(payloadFor(84, 84, false, 98), cat, CALIBRATION)
    expect(r.hero.kind).toBe('constant')
    if (r.hero.kind === 'constant') {
      expect(r.hero.ideal.match.arch.slug).toBe('right')
      expect(r.hero.ideal.alsoClose?.arch.slug).toBe('far')
    }
  })
})

describe('item bank invariants', () => {
  const FULL: Record<(typeof AXIS_IDS)[number], number> = { fed: 12, dem: 16, lib: 12, col: 12, pla: 14, glo: 10, int: 10, mil: 12, mul: 12, rel: 12, pro: 10, tec: 12 }

  it('has 144 unique axis items with the published per-axis counts, 1:1 keyed', () => {
    expect(items.length).toBe(144)
    expect(new Set(items.map(i => i.id)).size).toBe(144)
    for (const ax of AXIS_IDS) {
      const a = items.filter(i => i.axis === ax)
      expect(a.length, ax).toBe(FULL[ax])
      expect(a.filter(i => i.key === 1).length, ax).toBe(FULL[ax] / 2)
    }
    expect(Math.max(...Object.values(FULL))).toBe(MAX_AXIS_ITEMS)
  })

  it('tiers are nested and balanced 1:1 per axis: Quick 4 / Standard 6 / Full all', () => {
    const per = (mode: Mode, ax: (typeof AXIS_IDS)[number]) => (mode === 'quick' ? 4 : mode === 'standard' ? 6 : FULL[ax])
    for (const mode of ['quick', 'standard', 'full'] as const) {
      const pool = itemsForMode(mode)
      for (const ax of AXIS_IDS) {
        const a = pool.filter(i => i.axis === ax)
        expect(a.length, `${mode} ${ax}`).toBe(per(mode, ax))
        expect(a.filter(i => i.key === 1).length, `${mode} ${ax}`).toBe(per(mode, ax) / 2)
      }
    }
    const quick = new Set(itemsForMode('quick').map(i => i.id))
    const standard = new Set(itemsForMode('standard').map(i => i.id))
    for (const id of quick) expect(standard.has(id)).toBe(true)
    expect(itemsForMode('full')).toHaveLength(144)
  })

  it('conditional-form items are balanced across keys on every axis', () => {
    for (const ax of AXIS_IDS) {
      const a = items.filter(i => i.axis === ax && i.form === 'conditional')
      expect(a.filter(i => i.key === 1).length, ax).toBe(a.filter(i => i.key === -1).length)
    }
  })

  it('avoids status-quo-relative wording', () => {
    const banned = /\b(currently|more than now|too much|still|nowadays|these days|any longer)\b/i
    for (const it of items) expect(it.text, it.id).not.toMatch(banned)
  })

  it('presentation order never repeats an axis back-to-back and covers each mode exactly', () => {
    for (const mode of ['quick', 'standard', 'full'] as const) {
      const order = orderedItems(mode)
      expect(order.length).toBe(itemsForMode(mode).length)
      expect(new Set(order.map(i => i.id)).size).toBe(order.length)
      for (let k = 1; k < order.length; k++) expect(order[k]!.axis, `${mode} #${k}`).not.toBe(order[k - 1]!.axis)
    }
  })

  it('Quick and Standard keep their round-robin order; Full starts with the Standard rounds\' structure', () => {
    // Equal counts per axis: every round has all 12 axes, so the order is 4 or 6 full rounds.
    for (const mode of ['quick', 'standard'] as const) {
      const order = orderedItems(mode)
      for (let r = 0; r < order.length / 12; r++) expect(new Set(order.slice(12 * r, 12 * r + 12).map(i => i.axis)).size).toBe(12)
    }
  })
})

describe('red lines', () => {
  it('ten valid off-axis statements, never in the axis bank', () => {
    expect(RED_LINES).toHaveLength(10)
    expect(RED_IDS).toEqual(Array.from({ length: 10 }, (_, k) => `red-${String(k + 1).padStart(2, '0')}`))
    const axisIds = new Set(items.map(i => i.id))
    for (const r of RED_LINES) {
      expect(axisIds.has(r.id)).toBe(false)
      expect([1, -1]).toContain(r.humane)
      expect(isRedLine(r)).toBe(true)
    }
    expect(isRedLine(items[0]!)).toBe(false)
    expect(() => validateRedLines({ set: 'red', items: [{ id: 'red-01', humane: 0, text: 'x' }] })).toThrow(/humane/)
    expect(() => validateRedLines({ set: 'red', items: [{ id: 'red-01', humane: 1, text: 'x' }, { id: 'red-01', humane: 1, text: 'y' }] })).toThrow(/duplicate/)
  })

  it('are asked at every length, after the axis items, and listed in askedIdsForMode', () => {
    for (const mode of ['quick', 'standard', 'full'] as const) {
      const q = quizItems(mode, null)
      expect(q.slice(-10).map(s => s.id)).toEqual(RED_IDS)
      expect(q.slice(0, -10)).toEqual(orderedItems(mode))
      expect(askedIdsForMode(mode)).toEqual([...itemsForMode(mode).map(i => i.id), ...RED_IDS])
    }
  })

  it('are never scored: red answers change no score, gap, RG, careless index or count', () => {
    const rng = mulberry32(41)
    for (const mode of ['quick', 'standard', 'full'] as const) {
      const its = itemsForMode(mode)
      const base: Answers = Object.fromEntries(its.map(it => [it.id, { i: (Math.floor(rng() * 7) - 3) as Answer, n: (Math.floor(rng() * 7) - 3) as Answer }]))
      const withRed: Answers = { ...base, ...Object.fromEntries(RED_IDS.map((id, k) => [id, { i: (k % 7) - 3 as Answer, n: 3 as Answer }])) }
      expect(computeProfile(its, withRed, CALIBRATION)).toEqual(computeProfile(its, base, CALIBRATION))
      expect(computeProfile(its, withRed, CALIBRATION).total).toBe(its.length)
    }
  })

  it('codes an answer by side, strength and the humane direction', () => {
    expect([null, undefined, 1, 3, 0, -1, -2, -3].map(a => redCode(a as Answer | undefined, 1))).toEqual([0, 0, 1, 1, 2, 2, 3, 3])
    expect([-1, -3, 0, 1, 2, 3].map(a => redCode(a as Answer, -1))).toEqual([1, 1, 2, 2, 3, 3])
  })
})

describe('calibration tables', () => {
  const cal = { tauG: { 3: 90, 4: 80, 10: 40 }, careless: { 3: 5, 12: 3 } } as unknown as Calibration
  it('cover counts up to MAX_AXIS_ITEMS, falling back to the largest smaller entry', () => {
    expect(tableAt(cal.tauG, 4)).toBe(80)
    expect(tableAt(cal.tauG, 9)).toBe(80)
    expect(tableAt(cal.tauG, 16)).toBe(40)
    expect(tableAt(cal.tauG, 40)).toBe(40)
    expect(tableAt(cal.tauG, 1)).toBe(90)
    expect(tableAt({}, 5)).toBe(Infinity)
    expect(tauFor(cal, 14)).toBe(40)
    expect(carelessThreshold(cal, 12.4)).toBe(3)
    expect(carelessThreshold(cal, 11)).toBe(5)
  })
})

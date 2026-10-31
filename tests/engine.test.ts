import { describe, expect, it } from 'vitest'
import { AXIS_IDS, type Answer, type Answers, type Item } from '../src/engine/types'
import { computeProfile, gapAxis, realityGap, scoreAxis } from '../src/engine/score'
import { decodePayload, encodePayload, payloadSeed, profileToPayload, type Payload } from '../src/engine/payload'
import { classify, typeGap } from '../src/engine/typology'
import { coverageOk, distance, stability, type Archetype } from '../src/engine/match'
import { deriveResults } from '../src/engine/results'
import { mulberry32 } from '../src/engine/prng'
import { ALL_ITEMS, itemsForMode, orderedItems } from '../src/data/items'
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
    expect(decodePayload(encodePayload({ ...sample(), answered: 200, total: 120 }))).toEqual({ ok: false, error: 'corrupt' })
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

  it('hero splits only when the two frames fit no ideology in common', () => {
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

  it('the nearest carries its own stability, not the modal winner\'s', () => {
    // Extreme scores clamp the bootstrap, so a rival can win most draws; the label must describe what is shown.
    const two = [mk('a', 100), mk('b', 93)]
    const r = deriveResults(payloadFor(100, 100), two, CALIBRATION)
    if (r.hero.kind !== 'constant') throw new Error(r.hero.kind)
    const st = r.hero.ideal.stability!
    expect(st.share).toBeCloseTo(st.wins.get(r.hero.ideal.nearest!.arch.slug) ?? 0)
  })

  it('a missing here-and-now frame never claims a split', () => {
    const p = { ...payloadFor(-60, 0), N: AXIS_IDS.map(() => null), seN: AXIS_IDS.map(() => null), G: AXIS_IDS.map(() => null) }
    expect(deriveResults(p, cat, CALIBRATION).hero).toMatchObject({ kind: 'constant', now: null })
  })

  it('sensitive archetypes need to be very close to fit, whatever their stability', () => {
    // 11 points from 'far': inside the very-close cut, so it fits even with wide error bars.
    const wide = deriveResults(payloadFor(84, 84, false, 98), cat, CALIBRATION).hero
    if (wide.kind !== 'constant') throw new Error(wide.kind)
    expect(wide.ideal.fits.map(m => m.arch.slug)).toEqual(['far', 'right'])
    // 20 points from 'far': within "loose" but not "very close", so it is held back and 'right' fits alone.
    const r = deriveResults(payloadFor(75, 75), cat, CALIBRATION)
    if (r.hero.kind !== 'constant') throw new Error(r.hero.kind)
    expect(r.hero.ideal.fits.map(m => m.arch.slug)).toEqual(['right'])
    expect(r.hero.ideal.heldBack.map(m => m.arch.slug)).toEqual(['far'])
  })
})

describe('item bank invariants', () => {
  it('has 120 unique items, 10 per axis, 5:5 keyed', () => {
    expect(items.length).toBe(120)
    expect(new Set(items.map(i => i.id)).size).toBe(120)
    for (const ax of AXIS_IDS) {
      const a = items.filter(i => i.axis === ax)
      expect(a.length).toBe(10)
      expect(a.filter(i => i.key === 1).length).toBe(5)
    }
  })

  it('tiers are nested and balanced per axis: 4 / 6 / 10', () => {
    for (const [mode, per] of [['quick', 4], ['standard', 6], ['full', 10]] as const) {
      const pool = itemsForMode(mode)
      for (const ax of AXIS_IDS) {
        const a = pool.filter(i => i.axis === ax)
        expect(a.length).toBe(per)
        expect(a.filter(i => i.key === 1).length).toBe(per / 2)
      }
    }
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
      for (let k = 1; k < order.length; k++) expect(order[k]!.axis).not.toBe(order[k - 1]!.axis)
    }
  })
})

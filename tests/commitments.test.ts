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
import { ALL_ITEMS, itemsForMode } from '../src/data/items'
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
    expect(() => validateCommitments(fixture, ALL_ITEMS, SLUGS)).not.toThrow()
    expect(validateCommitments(ok, ALL_ITEMS, SLUGS)[SLUGS[0]!]).toHaveLength(1)
  })

  it('rejects bad data', () => {
    const v = (x: unknown) => () => validateCommitments(x, ALL_ITEMS, SLUGS)
    expect(v({ ...ok, version: 2 })).toThrow(/version/)
    expect(v({ ...ok, commitments: { 'no-such-ideology': [] } })).toThrow(/unknown archetype/)
    expect(v(bad({ item: 'lib-99' }))).toThrow(/unknown item/)
    expect(v(bad({ side: 0 }))).toThrow(/side/)
    expect(v(bad({ frame: 'N' }))).toThrow(/frame/)
    expect(v(bad({ why: ' ' }))).toThrow(/why/)
    expect(v({ ...ok, commitments: { [SLUGS[0]!]: [c('lib-02', 1), c('lib-02', -1)] } })).toThrow(/duplicate/)
    const six = ['lib-01', 'lib-02', 'lib-03', 'lib-04', 'lib-05', 'lib-06'].map(id => c(id, 1))
    expect(v({ ...ok, commitments: { [SLUGS[0]!]: six } })).toThrow(/at most 5/)
    expect(v(bad({ coders: 4 }))).toThrow(/coders/)
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
  /** The frame's fit set as slugs, nearest first. */
  const fitsOf = (h: Hero, which: 'ideal' | 'now' = 'ideal') => {
    const f = h.kind === 'unreliable' || h.kind === 'insufficient' ? null : which === 'now' ? h.now : h.ideal
    return f ? f.fits.map(m => m.arch.slug) : null
  }

  it('no rule-outs leaves results exactly as before', () => {
    for (const [i, n] of [[-60, 60], [-55, -50], [84, 84], [10, 30]] as const) {
      const p = payloadFor(i, n)
      const a = deriveResults(p, cat, CALIBRATION)
      expect(deriveResults(p, cat, CALIBRATION, new Set())).toEqual(a)
      expect(a.matchesIdeal.every(m => !m.ruledOut)).toBe(true)
      expect(a.matchesIdeal).toHaveLength(3)
    }
  })

  it('a ruled-out nearest never fits; with nothing else in range the headline is "no close match", nearest shown', () => {
    const p = payloadFor(-55, -50)
    expect(fitsOf(deriveResults(p, cat, CALIBRATION).hero)).toEqual(['left'])
    const r = deriveResults(p, cat, CALIBRATION, new Set(['left']))
    // 'centre' is far from these answers, so it is shown as the nearest, not named as a match.
    expect(r.hero.kind).toBe('no-fit')
    if (r.hero.kind !== 'no-fit') return
    expect(r.hero.ideal.fits).toEqual([])
    expect(r.hero.ideal.nearest?.arch.slug).toBe('centre')
    expect(r.hero.ideal.nearest?.ruledOut).toBe(false)
    expect(r.hero.ideal.ruledOutInRange.map(m => m.arch.slug)).toEqual(['left'])
    // The bootstrap never counts a ruled-out archetype as nearest.
    expect(r.hero.ideal.stability?.wins.has('left')).toBe(false)
    // Ranked list keeps it visible, marked, plus three that are not ruled out.
    expect(r.matchesIdeal.map(m => [m.arch.slug, m.ruledOut])).toEqual([
      ['left', true],
      ['centre', false],
      ['right', false],
      ['far', false],
    ])
  })

  it('a ruled-out nearest leaves the others in range in the fit set', () => {
    // Two ideologies 20 points apart, the answers 10 from each: both within the loose cut.
    const cat2 = [...cat, mk('left2', -40)]
    const p = payloadFor(-50, -50)
    expect(fitsOf(deriveResults(p, cat2, CALIBRATION).hero)).toEqual(['left', 'left2'])
    const r = deriveResults(p, cat2, CALIBRATION, new Set(['left']))
    expect(fitsOf(r.hero)).toEqual(['left2'])
    if (r.hero.kind !== 'constant') throw new Error(r.hero.kind)
    expect(r.hero.ideal.ruledOutInRange.map(m => m.arch.slug)).toEqual(['left'])
  })

  it('applies to the here-and-now fit set too', () => {
    const p = payloadFor(-60, 60)
    expect(deriveResults(p, cat, CALIBRATION).hero.kind).toBe('split')
    const r = deriveResults(p, cat, CALIBRATION, new Set(['right']))
    expect(fitsOf(r.hero, 'now')).not.toContain('right')
    expect(r.matchesNow[0]).toMatchObject({ arch: { slug: 'right' }, ruledOut: true })
  })

  it('a sensitive ideology fits only within the stricter "very close" cut; otherwise it is held back, never named', () => {
    // 84: far (95) is 11 points away, inside "very close"; farther and right are within "loose".
    expect(fitsOf(deriveResults(payloadFor(84, 84, 98), cat, CALIBRATION).hero)).toEqual(['far', 'farther', 'right'])
    // 75: far is 20 points away, inside "loose" but not "very close".
    const r = deriveResults(payloadFor(75, 75), cat, CALIBRATION)
    expect(fitsOf(r.hero)).toEqual(['right', 'farther'])
    if (r.hero.kind !== 'constant') throw new Error(r.hero.kind)
    expect(r.hero.ideal.heldBack.map(m => m.arch.slug)).toEqual(['far'])
    // Ruling out the non-sensitive fits leaves an empty set: the sensitive one is still not named.
    const out = deriveResults(payloadFor(75, 75), cat, CALIBRATION, new Set(['right', 'farther']))
    expect(out.hero.kind).toBe('no-fit')
  })

  it('every ideology ruled out → no ideology fits, and no nearest is shown as a match', () => {
    const r = deriveResults(payloadFor(0, 0), cat, CALIBRATION, new Set(cat.map(a => a.slug)))
    expect(r.hero.kind).toBe('no-fit')
    if (r.hero.kind !== 'no-fit') return
    expect(r.hero.ideal.nearest).toBeNull()
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
    expect(decodePayload(reencode([3, ...body.slice(1)]))).toEqual({ ok: false, error: 'newer-version' })
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
      if (plain.hero.kind !== 'constant' && plain.hero.kind !== 'split' && plain.hero.kind !== 'no-fit') continue
      const top = CATALOGUE_SLUGS.indexOf(plain.matchesIdeal[0]!.arch.slug)
      const owner = profileToPayload(prof, { catalogue: CATALOGUE_VERSION, mode: 'standard', input: 'grid', ruledOut: [top] })
      const mine = deriveResults(owner, CATALOGUE, CALIBRATION, ruledOutSlugs(owner))
      const d = decodeShared(encodePayload({ ...owner, sensitiveOk: true }))
      expect(d.ok).toBe(true)
      if (!d.ok) continue
      const theirs = deriveShared(d.payload)
      expect(slugOf(theirs.hero)).toEqual(slugOf(mine.hero))
      expect(slugOf(mine.hero)).not.toContain(CATALOGUE_SLUGS[top])
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

/** Both frames' fit sets plus the ideal nearest, as slugs: everything the headline can name. */
function slugOf(h: Hero) {
  if (h.kind === 'unreliable' || h.kind === 'insufficient') return []
  return [...h.ideal.fits.map(m => m.arch.slug), '|', ...(h.now?.fits.map(m => m.arch.slug) ?? []), '|', h.ideal.nearest?.arch.slug ?? '']
}

import { describe, expect, it } from 'vitest'
import { AXIS_IDS, MODES, type Answer, type Mode } from '../src/engine/types'
import type { Archetype } from '../src/engine/match'
import type { Payload } from '../src/engine/payload'
import { deriveResults, fits, type FitSet, type Results } from '../src/engine/results'
import { mulberry32 } from '../src/engine/prng'
import { itemsForMode } from '../src/data/items'
import { CALIBRATION } from '../src/data/calibration'
import { CATALOGUE } from '../src/data/archetypes'
import { EMPTY } from '../src/state/session'
import { deriveOwn } from '../src/state/derive'
import { constantNote, distanceNote, fitNames, heroName, noFitNote } from '../src/ui/copy'
import { previewPath, shareText } from '../src/ui/ShareSheet'
import { headline } from '../src/share/card'

const NAMES = CATALOGUE.map(a => a.name)
const straightLiner = (mode: Mode, v: Answer): Results =>
  deriveOwn({ ...EMPTY, mode, stage: 'done', answers: Object.fromEntries(itemsForMode(mode).map(it => [it.id, { i: v, n: v }])) })!.results

/** Every surface that can name an ideology as "your match": hero name, card headline, share text, preview path. */
function namedAnywhere(r: Results): string[] {
  const card = headline(r, true).lines.map(l => l.name)
  const text = shareText(r)
  const claimed = NAMES.filter(n => heroName(r).includes(n) || card.some(c => c.includes(n)) || text.includes(`fit ${n}`))
  return previewPath(r) ? [...claimed, previewPath(r)!] : claimed
}

const slugs = (f: FitSet | null | undefined) => f?.fits.map(m => m.arch.slug) ?? null

describe('fit-set headline on the real catalogue', () => {
  it('all-neutral answers never get a named fit, in any mode', () => {
    for (const mode of MODES) {
      const r = straightLiner(mode, 0)
      expect(r.hero.kind, mode).not.toBe('constant')
      expect(r.hero.kind, mode).not.toBe('split')
      expect(namedAnywhere(r), mode).toEqual([])
      expect(['No close match', 'No reliable match']).toContain(heroName(r))
    }
  })

  it('straight-liners at every non-neutral strength never get a named fit', () => {
    for (const mode of MODES)
      for (const v of [1, -1, 2, -2, 3, -3] as const) expect(namedAnywhere(straightLiner(mode, v)), `${mode} ${v}`).toEqual([])
  })

  it('all-neutral answers show the nearest ideology as a labelled measurement', () => {
    const r = straightLiner('standard', 0)
    expect(r.hero.kind).toBe('no-fit')
    if (r.hero.kind !== 'no-fit') return
    expect(r.hero.ideal.fits).toEqual([])
    const card = headline(r, false)
    expect(card.kicker).toBe('My 12 axes, twice')
    expect(card.lines[0]!.name).toBe('No close match')
    expect(r.hero.ideal.flat).toBe(true)
    expect(card.lines[0]!.note).toBe(`Nearest: ${r.hero.ideal.nearest!.arch.name}, but every axis scored exactly 0`)
    expect(shareText(r)).not.toMatch(/I fit/)
  })

  it('every named ideology fits: not ruled out and within the loose cut (random answer patterns)', () => {
    const rng = mulberry32(7)
    let named = 0
    let unnamed = 0
    for (let t = 0; t < 120; t++) {
      const mode = MODES[t % 3]!
      const lean = AXIS_IDS.map(() => Math.floor(rng() * 7) - 3)
      const answers = Object.fromEntries(
        itemsForMode(mode).map(it => {
          const v = Math.max(-3, Math.min(3, it.key * lean[AXIS_IDS.indexOf(it.axis)]! + Math.round(rng() * 2 - 1))) as Answer
          return [it.id, { i: v, n: v }]
        }),
      )
      const r = deriveOwn({ ...EMPTY, mode, stage: 'done', answers })!.results
      const h = r.hero
      if (h.kind === 'constant' || h.kind === 'split') {
        expect(h.ideal.fits.length).toBeGreaterThan(0)
        for (const m of [...h.ideal.fits, ...(h.now?.fits ?? [])]) {
          expect(m.ruledOut).toBe(false)
          expect(m.d).toBeLessThanOrEqual(CALIBRATION.labels[mode][m.arch.sensitive ? 'veryClose' : 'loose'])
        }
        // The set is exactly the ideologies that fit, nearest first.
        expect(h.ideal.fits.map(m => m.d)).toEqual([...h.ideal.fits.map(m => m.d)].sort((a, b) => a - b))
        named++
      }
      if (h.kind === 'no-fit') {
        expect(h.ideal.fits).toEqual([])
        unnamed++
      }
    }
    expect(named + unnamed).toBeGreaterThan(60)
  })
})

describe('fit-set headline on a synthetic catalogue', () => {
  const mk = (slug: string, v: number | number[], sensitive = false): Archetype => {
    const ideal = Array.isArray(v) ? v : AXIS_IDS.map(() => v)
    return {
      slug, name: slug.toUpperCase(), family: 'x', sensitive, summary: '', signature: '',
      ideal, now: ideal, weight: AXIS_IDS.map(() => 1), spread: AXIS_IDS.map(() => 0), sources: [],
    }
  }
  const payloadFor = (I: number, N: number, se = 14): Payload => ({
    format: 1, catalogue: 1, mode: 'standard', input: 'grid', careless: false, answered: 72, total: 72,
    I: AXIS_IDS.map(() => I), N: AXIS_IDS.map(() => N), seI: AXIS_IDS.map(() => se), seN: AXIS_IDS.map(() => se),
    G: AXIS_IDS.map(() => N - I), notable: AXIS_IDS.map(() => false), rg: 10,
  })
  // Standard-length cuts: "loose" ≈ 25.4 points on uniform vectors, "very close" ≈ 17.4.
  const spread = [mk('l', -60), mk('c', 0), mk('r', 60)]

  it('a flat frame fits nothing even with a catalogue entry exactly at zero', () => {
    const r = deriveResults(payloadFor(0, -60), spread, CALIBRATION)
    if (r.hero.kind !== 'no-fit') throw new Error(r.hero.kind)
    expect(r.hero.ideal.flat).toBe(true)
    expect(slugs(r.hero.ideal)).toEqual([])
    expect(slugs(r.hero.now)).toEqual(['l'])
    expect(r.matchesIdeal.every(m => !fits(m))).toBe(true)
    expect(noFitNote(r.hero.ideal)).toContain('every statement the same way')
    expect(shareText(r)).toContain('no position to match')
    expect(previewPath(r)).toBeNull()
  })

  it('a flat here-and-now frame is empty, not a split or a shared fit', () => {
    const r = deriveResults(payloadFor(-60, 0), spread, CALIBRATION)
    if (r.hero.kind !== 'constant') throw new Error(r.hero.kind)
    expect(slugs(r.hero.ideal)).toEqual(['l'])
    expect(slugs(r.hero.now)).toEqual([])
    expect(r.hero.now?.flat).toBe(true)
    expect(constantNote(r.hero)).toContain('no position to match')
    expect(shareText(r)).toContain('Here and now every axis scored exactly 0')
    expect(previewPath(r)).toBeNull()
  })

  it('single fit: names it, everywhere', () => {
    const r = deriveResults(payloadFor(-60, -58), spread, CALIBRATION)
    expect(r.hero).toMatchObject({ kind: 'constant' })
    if (r.hero.kind !== 'constant') return
    expect(slugs(r.hero.ideal)).toEqual(['l'])
    expect(slugs(r.hero.now)).toEqual(['l'])
    expect(heroName(r)).toBe('L')
    expect(constantNote(r.hero)).toBe('Your ideal and here-and-now answers fit the same ideology.')
    expect(shareText(r)).toBe('In theory and here and now, I fit L (Reality Gap 10). What’s yours?')
    expect(headline(r, false)).toMatchObject({ kicker: 'In theory and here and now I fit', lines: [{ name: 'L', note: 'Very close' }] })
    expect(previewPath(r)).toBe('p/l/')
  })

  it('several fits: names them all and says the test cannot tell them apart; no preview stub', () => {
    const cat = [mk('a', -50), mk('b', -40), mk('c', 40)]
    const r = deriveResults(payloadFor(-45, -45), cat, CALIBRATION)
    if (r.hero.kind !== 'constant') throw new Error(r.hero.kind)
    expect(slugs(r.hero.ideal)).toEqual(['a', 'b'])
    expect(heroName(r)).toBe('A and B')
    expect(constantNote(r.hero)).toBe('Your ideal and here-and-now answers fit the same ideologies.')
    expect(shareText(r)).toBe('In theory and here and now, I fit A and B (this test can’t tell them apart) (Reality Gap 10). What’s yours?')
    expect(headline(r, false).lines).toMatchObject([{ name: 'A and B', note: 'This test can’t tell them apart' }])
    expect(previewPath(r)).toBeNull()
  })

  it('more than three fits: the nearest three by distance, then "and N more"', () => {
    const cat = [-20, -10, -5, 0, 5, 10, 60].map((v, k) => mk(`x${k}`, v))
    const r = deriveResults(payloadFor(-4, -4), cat, CALIBRATION)
    if (r.hero.kind !== 'constant') throw new Error(r.hero.kind)
    // Distances from -4: x2 (1), x3 (4), x1 (6), x4 (9), x5 (14), x0 (16); x6 is out of range.
    expect(slugs(r.hero.ideal)).toEqual(['x2', 'x3', 'x1', 'x4', 'x5', 'x0'])
    expect(fitNames(r.hero.ideal)).toBe('X2, X3, X1 and 3 more')
    expect(heroName(r)).toBe('X2, X3, X1 and 3 more')
    expect(headline(r, false).lines[0]!.name).toBe('X2, X3, X1 and 3 more')
  })

  it('empty fit set: "No close match", the nearest shown only as a measurement', () => {
    const r = deriveResults(payloadFor(-20, -20), [mk('a', 40), mk('b', 90)], CALIBRATION)
    expect(r.hero).toMatchObject({ kind: 'no-fit', ideal: { fits: [], nearest: { arch: { slug: 'a' }, label: 'none' } } })
    expect(heroName(r)).toBe('No close match')
    expect(namedAnywhere(r)).toEqual([])
    expect(shareText(r)).toBe('No listed ideology is a close match for my politics; the nearest, A, isn’t close enough to name. What’s your gap?')
    expect(headline(r, false).lines).toMatchObject([{ name: 'No close match', note: 'Nearest: A, but not close' }])
    expect(previewPath(r)).toBeNull()
  })

  it('a ruled-out nearest is never named; others in range still fit', () => {
    const cat = [mk('a', -50), mk('b', -40), mk('c', 40)]
    const r = deriveResults(payloadFor(-50, -50), cat, CALIBRATION, new Set(['a']))
    if (r.hero.kind !== 'constant') throw new Error(r.hero.kind)
    expect(slugs(r.hero.ideal)).toEqual(['b'])
    expect(r.hero.ideal.ruledOutInRange.map(m => m.arch.slug)).toEqual(['a'])
    expect(heroName(r)).toBe('B')
    expect(namedAnywhere(r)).not.toContain('A')
    // With nothing else in range, the set is empty and the ruled-out one is not the nearest shown.
    const alone = deriveResults(payloadFor(-60, -60), cat, CALIBRATION, new Set(['a', 'b']))
    expect(alone.hero).toMatchObject({ kind: 'no-fit', ideal: { fits: [], nearest: { arch: { slug: 'c' } } } })
  })

  it('a toss-up between close ideologies is a multi-fit, not a forced pick', () => {
    // Four archetypes equally close to the centre, each on a different pattern of sides.
    const pat = (k: number) => AXIS_IDS.map((_, i) => (((i >> (k % 2)) + k) % 2 ? 20 : -20))
    const cat = [0, 1, 2, 3].map(k => mk(`p${k}`, k < 2 ? pat(k) : pat(k - 2).map(x => -x)))
    const r = deriveResults(payloadFor(1, 1), cat, CALIBRATION)
    if (r.hero.kind !== 'constant') throw new Error(r.hero.kind)
    expect(r.hero.ideal.fits).toHaveLength(4)
    expect(r.hero.ideal.stability?.label).toBe('toss-up')
    // Exactly one past the limit: all four are named, never "and 1 more".
    expect(heroName(r)).not.toMatch(/more/)
    expect(heroName(r).split(/, | and /).sort()).toEqual(['P0', 'P1', 'P2', 'P3'])
  })

  describe('frame splits: each frame gets its own fit set', () => {
    it('disjoint fit sets split, naming each frame', () => {
      const r = deriveResults(payloadFor(-60, 60), spread, CALIBRATION)
      if (r.hero.kind !== 'split') throw new Error(r.hero.kind)
      expect([slugs(r.hero.ideal), slugs(r.hero.now)]).toEqual([['l'], ['r']])
      expect(heroName(r)).toBe('L → R')
      expect(shareText(r)).toBe('In theory I fit L. Here and now, I fit R. What’s your gap?')
      expect(headline(r, false).lines.map(l => [l.label, l.name])).toEqual([
        ['In theory I fit', 'L'],
        ['Here and now I fit', 'R'],
      ])
      expect(previewPath(r)).toBe('p/l/r/')
    })

    it('a here-and-now frame that fits nothing is not a split (noise alone puts ~1 in 20 outside the cut)', () => {
      const r = deriveResults(payloadFor(-60, 100), [mk('a', -60), mk('b', 40)], CALIBRATION)
      if (r.hero.kind !== 'constant') throw new Error(r.hero.kind)
      expect(slugs(r.hero.now)).toEqual([])
      expect(heroName(r)).toBe('A')
      expect(constantNote(r.hero)).toMatch(/^Here and now no listed ideology is close enough to name\. That alone isn’t a split/)
      expect(shareText(r)).toBe('In theory I fit A. Here and now no listed ideology is close enough to name (Reality Gap 10). What’s your gap?')
      expect(headline(r, false)).toMatchObject({ kicker: 'My politics', lines: [{ label: 'In theory I fit', name: 'A' }] })
      expect(previewPath(r)).toBeNull()
    })

    it('overlapping fit sets are not a split, and the copy says what here and now fits', () => {
      const cat = [mk('a', -55), mk('b', -35), mk('c', -15)]
      // Ideal at -50 fits a (5 away), b (15); here and now at -22 fits c (7), b (13): b is in both.
      const r = deriveResults(payloadFor(-50, -22), cat, CALIBRATION)
      if (r.hero.kind !== 'constant') throw new Error(r.hero.kind)
      expect(slugs(r.hero.ideal)).toEqual(['a', 'b'])
      expect(slugs(r.hero.now)).toEqual(['c', 'b'])
      expect(constantNote(r.hero)).toBe('Here and now you fit C and B. The two frames share at least one ideology, so it isn’t a split.')
      expect(constantNote(r.hero, 'They')).not.toMatch(/same/)
      expect(headline(r, false)).toMatchObject({ kicker: 'My politics', lines: [{ label: 'In theory I fit', name: 'A and B' }] })
      expect(shareText(r)).toMatch(/^In theory I fit A and B \(this test can’t tell them apart\)\. Here and now I fit C and B/)
      expect(previewPath(r)).toBeNull()
    })

    it('a missing here-and-now frame names the ideal only', () => {
      const p = { ...payloadFor(-60, 0), N: AXIS_IDS.map(() => null), seN: AXIS_IDS.map(() => null), G: AXIS_IDS.map(() => null) }
      const r = deriveResults(p, spread, CALIBRATION)
      if (r.hero.kind !== 'constant') throw new Error(r.hero.kind)
      expect(r.hero.now).toBeNull()
      expect(constantNote(r.hero)).not.toMatch(/same/)
      expect(shareText(r)).toBe('In theory I fit L. What’s your gap?')
      expect(previewPath(r)).toBeNull()
    })
  })

  it('the measured line quotes the cut that applies: "very close" for a sensitive nearest', () => {
    const cuts = CALIBRATION.labels.standard
    const plain = deriveResults(payloadFor(75, 75), [mk('right', 60)], CALIBRATION)
    if (plain.hero.kind !== 'constant') throw new Error(plain.hero.kind)
    expect(distanceNote(plain.hero.ideal, cuts)).toContain(`“fits” means ${cuts.loose.toFixed(3)} or less`)
    const sens = deriveResults(payloadFor(75, 75), [mk('far', 95, true), mk('left', -60)], CALIBRATION)
    if (sens.hero.kind !== 'no-fit') throw new Error(sens.hero.kind)
    expect(sens.hero.ideal.nearest?.arch.slug).toBe('far')
    expect(distanceNote(sens.hero.ideal, cuts)).toContain(`a sensitive ideology “fits” only at ${cuts.veryClose.toFixed(3)} or less`)
  })

  it('fits() is the rule: not ruled out, within "loose" ("very close" for a sensitive ideology)', () => {
    const r = deriveResults(payloadFor(75, 75), [mk('right', 60), mk('far', 95, true)], CALIBRATION)
    const [right, far] = [r.matchesIdeal.find(m => m.arch.slug === 'right')!, r.matchesIdeal.find(m => m.arch.slug === 'far')!]
    expect(fits(right)).toBe(true)
    expect(['close', 'loose']).toContain(far.label)
    expect(fits(far)).toBe(false)
    expect(fits({ ...right, ruledOut: true })).toBe(false)
  })
})

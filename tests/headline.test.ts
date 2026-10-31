import { describe, expect, it } from 'vitest'
import { AXIS_IDS, MODES, type Answer, type Mode } from '../src/engine/types'
import type { Archetype } from '../src/engine/match'
import type { Payload } from '../src/engine/payload'
import { deriveResults, nameable, type Results } from '../src/engine/results'
import { mulberry32 } from '../src/engine/prng'
import { itemsForMode } from '../src/data/items'
import { CALIBRATION } from '../src/data/calibration'
import { CATALOGUE } from '../src/data/archetypes'
import { EMPTY } from '../src/state/session'
import { deriveOwn } from '../src/state/derive'
import { constantNote, heroName } from '../src/ui/copy'
import { previewPath, shareText } from '../src/ui/ShareSheet'
import { headline } from '../src/share/card'

const NAMES = CATALOGUE.map(a => a.name)
const straightLiner = (mode: Mode, v: Answer): Results =>
  deriveOwn({ ...EMPTY, mode, stage: 'done', answers: Object.fromEntries(itemsForMode(mode).map(it => [it.id, { i: v, n: v }])) })!.results

/** Every surface that can name an ideology as "your match": hero name, card headline, share text, preview path. */
function namedAnywhere(r: Results): string[] {
  const card = headline(r, true).lines.map(l => l.name)
  const text = shareText(r)
  const claimed = NAMES.filter(n => heroName(r).includes(n) || card.includes(n) || text.includes(`closest to ${n}`))
  return previewPath(r) ? [...claimed, previewPath(r)!] : claimed
}

describe('headline naming breakpoint', () => {
  it('all-neutral answers never get a named headline, in any mode', () => {
    for (const mode of MODES) {
      const r = straightLiner(mode, 0)
      expect(r.hero.kind, mode).not.toBe('constant')
      expect(r.hero.kind, mode).not.toBe('split')
      expect(namedAnywhere(r), mode).toEqual([])
      expect(['No close match', 'No clear match', 'No reliable match']).toContain(heroName(r))
    }
  })

  it('"slightly agree" and "slightly disagree" straight-liners never get a named headline', () => {
    for (const mode of MODES)
      for (const v of [1, -1] as const) expect(namedAnywhere(straightLiner(mode, v)), `${mode} ${v}`).toEqual([])
  })

  it('all-neutral answers show the nearest ideology as a labelled measurement', () => {
    const r = straightLiner('standard', 0)
    expect(r.hero.kind).toBe('no-close')
    if (r.hero.kind !== 'no-close') return
    expect(nameable(r.hero.nearest)).toBe(false)
    const card = headline(r, false)
    expect(card.kicker).toBe('My 12 axes, twice')
    expect(card.lines[0]!.name).toBe(heroName(r))
    expect(card.lines[0]!.note).toBe(
      `Nearest: ${r.hero.nearest.match.arch.name}, but ${r.hero.nearest.match.label === 'none' ? 'not close' : 'others are about as close'}`,
    )
    expect(shareText(r)).not.toMatch(/closest to/)
  })

  it('a named hero always passes the breakpoint (random answer patterns, real catalogue)', () => {
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
      const h = deriveOwn({ ...EMPTY, mode, stage: 'done', answers })!.results.hero
      if (h.kind === 'constant' || h.kind === 'split') {
        expect(nameable(h.ideal)).toBe(true)
        named++
      }
      if (h.kind === 'no-close') {
        expect(nameable(h.nearest)).toBe(false)
        unnamed++
      }
    }
    expect(named + unnamed).toBeGreaterThan(60)
  })
})

describe('naming breakpoint on a synthetic catalogue', () => {
  const mk = (slug: string, v: number | number[]): Archetype => {
    const ideal = Array.isArray(v) ? v : AXIS_IDS.map(() => v)
    return {
      slug, name: slug, family: 'x', sensitive: false, summary: '', signature: '',
      ideal, now: ideal, weight: AXIS_IDS.map(() => 1), spread: AXIS_IDS.map(() => 0), sources: [],
    }
  }
  const payloadFor = (I: number, N: number, se = 14): Payload => ({
    format: 1, catalogue: 1, mode: 'standard', input: 'grid', careless: false, answered: 72, total: 72,
    I: AXIS_IDS.map(() => I), N: AXIS_IDS.map(() => N), seI: AXIS_IDS.map(() => se), seN: AXIS_IDS.map(() => se),
    G: AXIS_IDS.map(() => N - I), notable: AXIS_IDS.map(() => false), rg: 10,
  })

  it('beyond the "loose" cut: no close match, nearest shown', () => {
    const r = deriveResults(payloadFor(-20, -20), [mk('a', 40), mk('b', 90)], CALIBRATION)
    expect(r.hero).toMatchObject({ kind: 'no-close', nearest: { match: { arch: { slug: 'a' }, label: 'none' } } })
    expect(heroName(r)).toBe('No close match')
    expect(previewPath(r)).toBeNull()
  })

  it('a toss-up between close ideologies: no clear match', () => {
    // Four archetypes equally close to the centre, each on a different pattern of sides.
    const pat = (k: number) => AXIS_IDS.map((_, i) => ((i >> (k % 2)) + k) % 2 ? 20 : -20)
    const cat = [0, 1, 2, 3].map(k => mk(`p${k}`, k < 2 ? pat(k) : pat(k - 2).map(x => -x)))
    const r = deriveResults(payloadFor(0, 0), cat, CALIBRATION)
    expect(r.hero.kind).toBe('no-close')
    if (r.hero.kind !== 'no-close') return
    expect(r.hero.nearest.match.label).not.toBe('none')
    expect(r.hero.nearest.stability.label).toBe('toss-up')
    expect(heroName(r)).toBe('No clear match')
  })

  it('a split whose here-and-now side is close to nothing names only the ideal', () => {
    const r = deriveResults(payloadFor(-60, 100), [mk('a', -60), mk('b', 40)], CALIBRATION)
    expect(r.hero.kind).toBe('split')
    if (r.hero.kind !== 'split') return
    expect(nameable(r.hero.ideal)).toBe(true)
    expect(nameable(r.hero.now)).toBe(false)
    expect(heroName(r)).toBe('a → No close match')
    expect(shareText(r)).toContain('Here and now, no listed ideology is close.')
    expect(headline(r, false).lines.map(l => l.name)).toEqual(['a', 'No close match'])
    expect(previewPath(r)).toBeNull()
  })

  it('"Constant" copy says "same ideology" only when both frames agree', () => {
    const cat = [mk('a', -20), mk('b', 20)]
    // Here and now sits a little nearer b, by less than the split margin: a lean, not a split.
    const lean = deriveResults(payloadFor(-20, 1), cat, CALIBRATION).hero
    expect(lean).toMatchObject({ kind: 'constant', ideal: { match: { arch: { slug: 'a' } } }, leaning: { match: { arch: { slug: 'b' } } } })
    if (lean.kind !== 'constant') return
    expect(constantNote(lean)).toBe('Here and now you lean toward b, but not by enough to call it a split.')
    expect(constantNote(lean, 'They')).not.toMatch(/same ideology/)
    const same = deriveResults(payloadFor(-20, -18), cat, CALIBRATION).hero
    expect(same.kind === 'constant' && !same.leaning).toBe(true)
    if (same.kind !== 'constant') return
    expect(constantNote(same)).toBe('Your ideal and here-and-now answers sit closest to the same ideology.')
    expect(constantNote({ ...same, nowMissing: true })).not.toMatch(/same ideology/)
  })

  it('a close, stable ideal is still named', () => {
    const r = deriveResults(payloadFor(-60, -58), [mk('left', -60), mk('centre', 0), mk('right', 60)], CALIBRATION)
    expect(r.hero).toMatchObject({ kind: 'constant', ideal: { match: { arch: { slug: 'left' } } } })
    expect(heroName(r)).toBe('left')
  })
})

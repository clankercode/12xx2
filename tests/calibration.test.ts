import { describe, expect, it } from 'vitest'
import { AXIS_IDS, MODES } from '../src/engine/types'
import { computeProfile } from '../src/engine/score'
import { mulberry32 } from '../src/engine/prng'
import { itemsForMode } from '../src/data/items'
import { CALIBRATION } from '../src/data/calibration'
import { MODEL, falseRuleOuts, fitSetStats, latentSheet, randomAnswers, respond, type Sheets } from '../scripts/sim'
import { COMMITMENTS, HAS_COMMITMENTS } from '../src/data/commitments'
import { ALL_ITEMS } from '../src/data/items'
import sheetsJson from '../content/archetypes/sheets.json'
import { CATALOGUE, CATALOGUE_VERSION } from '../src/data/archetypes'

const sheets = sheetsJson as unknown as Sheets

/**
 * Re-checks the committed thresholds on a fresh, smaller seeded run (spec §4.9).
 * Tolerances allow for sampling error in the smaller run.
 */
describe('committed calibration still meets its criteria', () => {
  it('has every table entry', () => {
    for (let n = 3; n <= 10; n++) {
      expect(CALIBRATION.tauG[String(n)]).toBeGreaterThan(0)
      expect(CALIBRATION.careless[String(n)]).toBeGreaterThan(0)
    }
    for (const m of MODES) {
      const l = CALIBRATION.labels[m]
      expect(l.veryClose).toBeLessThan(l.close)
      expect(l.close).toBeLessThan(l.loose)
    }
    expect(CALIBRATION.rgCuts[0]).toBeLessThan(CALIBRATION.rgCuts[1])
    expect(CALIBRATION.rgCuts[1]).toBeLessThan(CALIBRATION.rgCuts[2])
  })

  it('no-gap respondents rarely see a false notable gap (target ≤ 10%)', () => {
    const rng = mulberry32(2024)
    let any = 0
    const T = 300
    for (let d = 0; d < T; d++) {
      const items = itemsForMode(MODES[d % 3]!)
      const ans = respond(rng, items, latentSheet(rng, items), { p: MODEL.copyRates[d % 3]!, pass: MODEL.passRates[d % 3]!, noGap: true })
      const prof = computeProfile(items, ans, CALIBRATION)
      if (AXIS_IDS.some(ax => prof.gaps[ax].notable)) any++
    }
    expect(any / T).toBeLessThanOrEqual(0.14)
  })

  it('flags most random clickers and almost no honest respondents', () => {
    const rng = mulberry32(77)
    let caught = 0
    let falseFlags = 0
    const T = 300
    for (let d = 0; d < T; d++) {
      const items = itemsForMode(MODES[d % 3]!)
      if (computeProfile(items, randomAnswers(rng, items), CALIBRATION).careless) caught++
      const honest = respond(rng, items, latentSheet(rng, items), { p: 0.5, pass: 0.1 })
      if (computeProfile(items, honest, CALIBRATION).careless) falseFlags++
    }
    expect(caught / T).toBeGreaterThanOrEqual(0.8)
    expect(falseFlags / T).toBeLessThanOrEqual(0.05)
  })
})

describe('core commitments', () => {
  it('sincere adherents are rarely ruled out of their own ideology (target ≤ 2%)', () => {
    const r = falseRuleOuts(mulberry32(0xc0332), sheets, COMMITMENTS, 60)
    // No commitments coded yet: nothing can be ruled out.
    if (!HAS_COMMITMENTS) return expect(r).toBeNull()
    expect(r!.byMode.full).toBeLessThanOrEqual(0.02)
  })

  it('the simulation catches a commitment on the wrong side', () => {
    const slug = 'social-democracy'
    const strong = ALL_ITEMS.find(it => sheets[slug]![it.id]?.[0] === 3 && it.tier === 'quick')!
    const book = (side: 1 | -1) => ({ [slug]: [{ item: strong.id, frame: 'I' as const, side, why: 'test' }] })
    expect(falseRuleOuts(mulberry32(1), sheets, book(1), 60)!.byMode.quick).toBeLessThanOrEqual(0.02)
    expect(falseRuleOuts(mulberry32(1), sheets, book(-1), 60)!.byArchetype[slug]).toBeGreaterThan(0.8)
  })

  it('fit-set headline: sincere adherents usually fit their own ideology; random clickers almost never get a named fit', () => {
    const st = fitSetStats(mulberry32(99), CATALOGUE, sheets, COMMITMENTS, CALIBRATION, CATALOGUE_VERSION, 2, 40)
    expect(st.adherents.standard.ownInFit).toBeGreaterThanOrEqual(0.8)
    expect(st.adherents.full.ownInFit).toBeGreaterThanOrEqual(0.8)
    for (const m of MODES) expect(st.random[m].named).toBeLessThanOrEqual(0.05)
    // The committed report carries the same diagnostics, quoted on the method page.
    expect((CALIBRATION.report as { fitSet?: unknown }).fitSet).toBeTruthy()
  }, 120_000)
})

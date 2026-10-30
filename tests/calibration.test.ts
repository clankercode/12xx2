import { describe, expect, it } from 'vitest'
import { AXIS_IDS, MODES } from '../src/engine/types'
import { computeProfile } from '../src/engine/score'
import { mulberry32 } from '../src/engine/prng'
import { itemsForMode } from '../src/data/items'
import { CALIBRATION } from '../src/data/calibration'
import { MODEL, latentSheet, randomAnswers, respond } from '../scripts/sim'

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

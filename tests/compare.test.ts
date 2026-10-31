import { describe, expect, it } from 'vitest'
import { AXIS_IDS, MODES } from '../src/engine/types'
import { computeProfile } from '../src/engine/score'
import { profileToPayload, type Payload } from '../src/engine/payload'
import { compareResults, sameScores } from '../src/engine/compare'
import { mulberry32 } from '../src/engine/prng'
import { itemsForMode } from '../src/data/items'
import { CALIBRATION } from '../src/data/calibration'
import { MODEL, latentSheet, respond } from '../scripts/sim'
import { resultFromLink } from '../src/ui/router'

const twelve = (v: number | null) => AXIS_IDS.map(() => v)
const flat = (I: number | null, N: number | null, se = 14): Payload => ({
  format: 1,
  catalogue: 1,
  mode: 'full',
  input: 'grid',
  careless: false,
  answered: 120,
  total: 120,
  I: twelve(I),
  N: twelve(N),
  seI: twelve(I === null ? null : se),
  seN: twelve(N === null ? null : se),
  G: twelve(I === null || N === null ? null : N - I),
  notable: AXIS_IDS.map(() => false),
  rg: 0,
})

describe('comparing two results', () => {
  it('identical results have no clear differences', () => {
    const c = compareResults(flat(30, 10), flat(30, 10))
    expect(c.ideal.clear).toBe(0)
    expect(c.now.clear).toBe(0)
    expect(c.ideal.compared).toBe(12)
    expect(c.summary).toBe('none')
    // Equal gaps everywhere: no axis is "closest" or "furthest".
    expect(c.ideal.closest).toBeNull()
    expect(compareResults(flat(0, 0), flat(10, 10)).ideal.furthest).toBeNull()
  })

  it('a difference counts only beyond 1.96 combined standard errors', () => {
    // SE 14 each → threshold 1.96·√2·14 ≈ 38.8
    expect(compareResults(flat(0, 0), flat(38, 38)).ideal.clear).toBe(0)
    expect(compareResults(flat(0, 0), flat(40, 40)).ideal.clear).toBe(12)
    // A zero stored SE is floored at half a quantisation step, not treated as exact.
    expect(compareResults(flat(0, 0, 0), flat(4, 4, 0)).ideal.clear).toBe(0)
  })

  it('names the frame with more disagreement only with a 2-axis margin', () => {
    expect(compareResults(flat(-60, 0), flat(60, 0)).summary).toBe('ideals-differ-more')
    expect(compareResults(flat(0, -60), flat(0, 60)).summary).toBe('practice-differs-more')
    const one = flat(0, 0)
    const other = { ...flat(0, 0), I: AXIS_IDS.map((_, k) => (k === 0 ? 90 : 0)) }
    expect(compareResults(one, other).summary).toBe('even')
    expect(compareResults(one, other).ideal.furthest).toBe('fed')
  })

  it('skips axes either person lacks and makes no frame claim without here-and-now', () => {
    const c = compareResults(flat(10, null), flat(10, 20))
    expect(c.now.compared).toBe(0)
    expect(c.now.closest).toBeNull()
    expect(c.summary).toBeNull()
  })

  it('claims nothing when either result is careless', () => {
    const c = compareResults({ ...flat(-80, -80), careless: true }, flat(80, 80))
    expect(c.reliable).toBe(false)
    expect(c.summary).toBeNull()
  })

  it('reports country match only when both shared one', () => {
    expect(compareResults({ ...flat(0, 0), country: 'AU' }, { ...flat(0, 0), country: 'NZ' }).sameCountry).toBe(false)
    expect(compareResults({ ...flat(0, 0), country: 'AU' }, flat(0, 0)).sameCountry).toBeNull()
  })

  it('tells which side is the viewer by scores', () => {
    expect(sameScores(flat(1, 2), flat(1, 2, 99))).toBe(true)
    expect(sameScores(flat(1, 2), flat(1, 3))).toBe(false)
  })

  // Two takes by the same simulated person should rarely look "clearly different".
  // In the simulation the shared SEs are conservative: 1.96 gives ~0.3% per axis, not 5%,
  // and about 45% of axes between two random people (median gap ~50 points) count as clear.
  it('rarely flags the same person twice and often flags different people', () => {
    const rng = mulberry32(2026)
    const T = 300
    let [same0, same1, diff0, diff1] = [0, 0, 0, 0]
    for (let t = 0; t < T; t++) {
      const items = itemsForMode(MODES[t % 3]!)
      const take = (sheet: ReturnType<typeof latentSheet>) =>
        profileToPayload(computeProfile(items, respond(rng, items, sheet, { p: MODEL.copyRates[1]!, pass: 0.1 }), CALIBRATION), {
          catalogue: 1,
          mode: MODES[t % 3]!,
          input: 'grid',
        })
      const me = latentSheet(rng, items)
      const s = compareResults(take(me), take(me))
      const d = compareResults(take(me), take(latentSheet(rng, items)))
      same0 += s.ideal.clear
      same1 += s.ideal.compared
      diff0 += d.ideal.clear
      diff1 += d.ideal.compared
    }
    expect(same0 / same1).toBeLessThanOrEqual(0.02)
    expect(diff0 / diff1).toBeGreaterThanOrEqual(0.35)
  })

  it('reads the result code out of a pasted link', () => {
    expect(resultFromLink('https://12axes-squared.netlify.app/p/centrism/#r=AQEB0he_-9Z')).toBe('AQEB0he_-9Z')
    expect(resultFromLink('  AQEBZx9Z ')).toBe('AQEBZx9Z')
    expect(resultFromLink('https://example.org/#/results')).toBeNull()
  })
})

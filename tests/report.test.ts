import { describe, expect, it } from 'vitest'
import { CATALOGUE } from '../src/data/archetypes'
import { CALIBRATION } from '../src/data/calibration'
import { COMMITMENTS } from '../src/data/commitments'
import { itemsForMode } from '../src/data/items'
import { RED_LINES } from '../src/data/redlines'
import { buildReport, formatReport, type ReportInput } from '../src/engine/report'
import { distance, jointDistance } from '../src/engine/match'
import { deriveOwn } from '../src/state/derive'
import { EMPTY } from '../src/state/session'
import { AXIS_IDS, type Answer, type Answers, type Mode } from '../src/engine/types'
import { parseReport, summarizeReport } from '../scripts/report'

function fixture(mode: Mode = 'standard'): ReportInput {
  const items = itemsForMode(mode)
  const answers: Answers = Object.fromEntries(items.map(it => [it.id, { i: (it.key * 2) as Answer, n: it.key as Answer, input: 'grid' }]))
  for (const r of RED_LINES) answers[r.id] = { i: r.humane, n: r.humane, input: 'rows' }
  const own = deriveOwn({ ...EMPTY, mode, answers })!
  return {
    payload: own.payload, answers, statements: [...items, ...RED_LINES], catalogue: CATALOGUE,
    calibration: CALIBRATION, commitments: COMMITMENTS, appVersion: 'test', date: '2026-11-01T00:00:00.000Z',
  }
}

describe('diagnostic report', () => {
  it('is a deterministic plain object with every statement, score, version and all 48 ranked ideologies', () => {
    const input = fixture()
    const id = input.statements[0]!.id
    input.answers[id] = { i: null, n: 2, chip: 'conditions', input: 'rows' }
    input.payload = deriveOwn({ ...EMPTY, mode: 'standard', answers: input.answers })!.payload
    const before = JSON.stringify(input)
    const report = buildReport(input)
    expect(JSON.stringify(input)).toBe(before)
    expect(buildReport(input)).toEqual(report)
    expect(JSON.parse(JSON.stringify(report))).toEqual(report)
    expect(report.versions).toMatchObject({ app: 'test', catalogue: input.payload.catalogue, calibration: CALIBRATION.version })
    expect(report.statements).toHaveLength(input.statements.length)
    expect(report.statements[0]).toMatchObject({ id, text: input.statements[0]!.text, ideal: null, now: 2, chip: 'conditions', input: 'rows', passed: { ideal: true, now: false } })
    expect(report.statements.filter(s => s.kind === 'red-line')).toHaveLength(RED_LINES.length)
    expect(report.axes).toHaveLength(12)
    expect(report.axes[0]).toMatchObject({ ideal: { score: input.payload.I[0], se: input.payload.seI[0] }, now: { score: input.payload.N[0], se: input.payload.seN[0] } })
    expect(report.headline.kind).toBe(deriveOwn({ ...EMPTY, mode: 'standard', answers: input.answers })!.results.hero.kind)
    for (const ranking of Object.values(report.rankings)) {
      expect(ranking).toHaveLength(48)
      expect(new Set(ranking.map(r => r.slug)).size).toBe(48)
      expect(ranking.map(r => r.distance)).toEqual([...ranking.map(r => r.distance)].sort((a, b) => a - b))
    }
  })

  it.each(['quick', 'standard', 'full'] as const)('uses %s label cuts and bounds details to the top 10 plus unique valid focus slugs', mode => {
    const input = fixture(mode)
    const first = buildReport(input)
    const slug = first.rankings.ideal.at(-1)!.slug
    const report = buildReport({ ...input, focus: [slug, slug, 'does-not-exist'] })
    expect(report.focus).toEqual([slug])
    expect(report.unknownFocus).toEqual(['does-not-exist'])
    expect(report.labelCuts).toEqual(CALIBRATION.labels[mode])
    for (const ranking of Object.values(report.rankings)) {
      for (const row of ranking) expect(row.breakdown !== null).toBe(row.rank <= 10 || row.slug === slug)
    }
  })

  it.each(['covered', 'partial', 'missing'] as const)('breakdown recomputes distance exactly with %s axes in both frames and joint', coverage => {
    const input = fixture()
    if (coverage !== 'covered') {
      input.payload.I = input.payload.I.map((v, i) => coverage === 'missing' || i % 2 === 0 ? null : v)
      input.payload.N = input.payload.N.map((v, i) => coverage === 'missing' || i % 3 === 0 ? null : v)
    }
    // Exercise every catalogue weight/target, not just the default detailed top 10.
    const report = buildReport({ ...input, focus: CATALOGUE.map(a => a.slug) })
    for (const frame of ['ideal', 'now', 'joint'] as const) {
      for (const row of report.rankings[frame]) {
        const arch = CATALOGUE.find(a => a.slug === row.slug)!
        const b = row.breakdown!
        const recomputed = b.coveredWeight ? Math.sqrt(b.axes.reduce((sum, a) => sum + a.distanceSquaredContribution, 0)) : 1
        const expected = frame === 'joint' ? jointDistance(input.payload.I, input.payload.N, arch) : distance(frame === 'ideal' ? input.payload.I : input.payload.N, arch.ideal, arch.weight)
        expect(recomputed).toBeCloseTo(expected, 14)
        expect(row.distance).toBe(expected)
        expect(b.axes.reduce((sum, a) => sum + a.share, 0)).toBeCloseTo(b.squaredWeightedGap ? 1 : 0, 14)
        expect(b.axes.filter(a => !a.covered).every(a => a.share === 0 && a.weightedSquaredGap === 0)).toBe(true)
        expect(b.axes).toHaveLength(frame === 'joint' ? 24 : 12)
        expect(b.axes.map(a => a.axis).slice(0, 12)).toEqual(AXIS_IDS)
      }
    }
  })

  it('records every failing commitment frame including red lines, without inventing passes or rule-outs', () => {
    const input = fixture()
    const slug = CATALOGUE[0]!.slug
    const item = input.statements[0]!.id
    const red = RED_LINES[0]!.id
    input.answers[item] = { i: -2, n: -3 }
    input.answers[red] = { i: 2, n: null }
    input.commitments = { [slug]: [
      { item, frame: 'both', side: 1, why: 'core test' },
      { item: red, kind: 'red-line', frame: 'both', side: -1, why: 'red test' },
    ] }
    const report = buildReport(input)
    expect(report.ruleOuts).toEqual([{ slug, reasons: [
      { item, frame: 'I', kind: 'core', requiredSide: 1, answer: -2, why: 'core test' },
      { item, frame: 'N', kind: 'core', requiredSide: 1, answer: -3, why: 'core test' },
      { item: red, frame: 'I', kind: 'red-line', requiredSide: -1, answer: 2, why: 'red test' },
    ] }])
    for (const ranking of Object.values(report.rankings)) expect(ranking.find(r => r.slug === slug)).toMatchObject({ ruledOut: true, stability: null })
    expect(report.headline.ideal?.fits).not.toContain(slug)
    input.payload.careless = true
    const careless = buildReport(input)
    expect(careless.headline.kind).toBe('unreliable')
    expect(careless.ruleOuts).toEqual([])
    expect(careless.rankings.ideal.every(r => !r.ruledOut && r.stability === null)).toBe(true)
  })

  it('preserves nearest stability while joint explicitly has none', () => {
    const input = fixture()
    const report = buildReport(input)
    const own = deriveOwn({ ...EMPTY, mode: 'standard', answers: input.answers })!
    if (!('ideal' in own.results.hero)) throw new Error('fixture needs a fit set')
    const fit = own.results.hero.ideal
    const nearest = report.rankings.ideal.find(r => r.slug === fit.nearest!.arch.slug)!
    expect(nearest.stability).toEqual({ nearest: true, winShare: fit.stability!.share, label: fit.stability!.label })
    expect(report.rankings.joint.every(r => r.stability === null)).toBe(true)
  })

  it('distinguishes absent legacy red-line answers from passed answers', () => {
    const input = fixture()
    delete input.answers[RED_LINES[0]!.id]
    input.answers[RED_LINES[1]!.id] = { i: null, n: null }
    const report = buildReport(input)
    expect(report.statements.find(s => s.id === RED_LINES[0]!.id)).toMatchObject({ recorded: false, passed: { ideal: null, now: null } })
    expect(report.statements.find(s => s.id === RED_LINES[1]!.id)).toMatchObject({ recorded: true, passed: { ideal: true, now: true } })
  })

  it('formats as one header then JSON with one-space indentation, and round-trips pasted/fenced/raw JSON', () => {
    const report = buildReport(fixture())
    const text = formatReport(report)
    expect(text.split('\n')[0]).toBe('12 Axes² diagnostic report · standard · 2026-11-01T00:00:00.000Z')
    expect(text.split('\n')[2]).toBe(' "schema": "12axes-report-v1",')
    expect(JSON.parse(text.slice(text.indexOf('\n') + 1))).toEqual(report)
    for (const value of [text, JSON.stringify(report), `\`\`\`text\n${text}\n\`\`\``]) expect(parseReport(value)).toEqual(report)
    expect(() => parseReport('no json')).toThrow('No report JSON')
    expect(() => parseReport('{}')).toThrow('Expected a 12axes-report')
  })

  it('summarises top matches, rule-out reasons and the largest three focus contributions per frame', () => {
    const input = fixture()
    const slug = CATALOGUE[0]!.slug
    const item = input.statements[0]!.id
    input.answers[item] = { i: -3, n: -2 }
    input.commitments = { [slug]: [{ item, frame: 'both', side: 1, why: 'required test' }] }
    const report = buildReport({ ...input, focus: [slug] })
    const summary = summarizeReport(report)
    expect(summary).toContain('Rule-outs:')
    expect(summary).toContain(`${item} (core, I): requires agree (+1), answered -3`)
    for (const frame of ['ideal', 'now', 'joint'] as const) {
      expect(summary).toContain(`${frame}: top 5 by distance`)
      const row = report.rankings[frame].find(r => r.slug === slug)!
      const axes = [...row.breakdown!.axes].sort((a, b) => b.weightedSquaredGap - a.weightedSquaredGap).slice(0, 3)
      for (const a of axes) expect(summary).toContain(`${a.axis} (${a.frame}): you ${a.score}, ideology ${a.target}`)
    }
  })
})

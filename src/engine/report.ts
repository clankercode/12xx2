import type { Calibration } from './calibration'
import { checkArchetype, type CommitmentBook } from './commitments'
import { coverageOk, explainDistance, labelFor, rank, rankJoint, type Archetype, type Ranked, type Vec } from './match'
import type { Payload } from './payload'
import { deriveResults, isFlat, type FitSet } from './results'
import { AXIS_IDS, isRedLine, type Answers, type Statement } from './types'

export interface ReportInput {
  /** Use the same quantised payload as the results page, not the pre-quantisation profile. */
  payload: Payload
  answers: Answers
  /** The run's axis statements and any red lines it reached; excludes a cancelled extension. */
  statements: readonly Statement[]
  catalogue: readonly Archetype[]
  calibration: Calibration
  commitments: CommitmentBook
  appVersion: string
  /** Explicit timestamp keeps this function pure. */
  date: string
  focus?: readonly string[]
}

type RankingFrame = 'ideal' | 'now' | 'joint'

function breakdown(p: Payload, arch: Archetype, frame: RankingFrame) {
  // Both single-frame rankings compare against the ideology's ideal. Only joint uses its programme.
  const u: Vec = frame === 'joint' ? [...p.I, ...p.N] : frame === 'ideal' ? p.I : p.N
  const targets = frame === 'joint' ? [...arch.ideal, ...arch.now] : arch.ideal
  const weights = frame === 'joint' ? [...arch.weight, ...arch.weight] : arch.weight
  const { terms, coveredWeight, squaredWeightedGap } = explainDistance(u, targets, weights)
  return {
    coveredWeight,
    squaredWeightedGap,
    axes: terms.map((t, i) => ({
      axis: AXIS_IDS[i % AXIS_IDS.length]!,
      frame: frame === 'joint' ? (i < AXIS_IDS.length ? 'ideal' : 'now') : frame,
      ...t,
    })),
  }
}

/** Complete local diagnostic: all rankings, detailed top 10 per ranking plus explicitly focused slugs. */
export function buildReport(input: ReportInput) {
  const { payload: p, answers, statements, catalogue, calibration: cal, commitments } = input
  const asked = new Set(statements.map(s => s.id))
  const checks = catalogue.map(a => checkArchetype(a.slug, commitments, answers, asked))
  // Preserve the results engine's suppression of rule-out claims for careless answering.
  const out = new Set(p.careless ? [] : checks.filter(c => c.all === 'fail').map(c => c.slug))
  const results = deriveResults(p, catalogue, cal, out)
  const h = results.hero
  const idealFit = 'ideal' in h ? h.ideal : null
  const nowFit = 'now' in h ? h.now : null
  const known = new Set(catalogue.map(a => a.slug))
  const focus = [...new Set(input.focus ?? [])].filter(slug => known.has(slug))
  const unknownFocus = [...new Set(input.focus ?? [])].filter(slug => !known.has(slug))
  const fitSummary = (f: FitSet | null) => f && ({
    fits: f.fits.map(m => m.arch.slug),
    nearest: f.nearest?.arch.slug ?? null,
    flat: f.flat ?? false,
    ruledOutInRange: f.ruledOutInRange.map(m => m.arch.slug),
    heldBack: f.heldBack.map(m => m.arch.slug),
  })
  const ranking = (ranked: Ranked[], frame: RankingFrame, fit: FitSet | null) => ranked.map(({ arch, d }, i) => {
    const detailed = i < 10 || focus.includes(arch.slug)
    const stab = fit?.stability
    return {
      rank: i + 1,
      slug: arch.slug,
      name: arch.name,
      sensitive: arch.sensitive,
      distance: d,
      label: labelFor(d, cal.labels[p.mode]),
      ruledOut: out.has(arch.slug),
      stability: stab && !out.has(arch.slug) ? {
        winShare: stab.wins.get(arch.slug) ?? 0,
        nearest: fit?.nearest?.arch.slug === arch.slug,
        ...(fit?.nearest?.arch.slug === arch.slug ? { label: stab.label } : {}),
      } : null,
      // All other entries retain distance, label, rule-out and stability as their summary.
      breakdown: detailed ? breakdown(p, arch, frame) : null,
    }
  })
  return {
    schema: '12axes-report-v1' as const,
    versions: { app: input.appVersion, catalogue: p.catalogue, calibration: cal.version, payload: p.format },
    mode: p.mode,
    date: input.date,
    focus,
    unknownFocus,
    conventions: {
      answers: '-3 strongly disagree … 0 neutral/torn … +3 strongly agree; null means no answer',
      scores: 'Quantised results-page scores, -100 to +100; null means insufficient axis coverage. SE uses the same units.',
      matching: 'ideal and now each compare with ideology.ideal; joint compares ideal with ideology.ideal and now with ideology.now',
      breakdowns: 'Top 10 per ranking plus focus; all other ideologies have summary entries. share = fraction of squared weighted gap; distance = sqrt(sum(distanceSquaredContribution)). No covered weight gives distance 1.',
      stability: 'Win share over the results engine bootstrap, excluding ruled-out ideologies; null when unavailable. Joint stability is not calculated.',
      claims: 'Rankings are diagnostic measurements even when coverage fails or answers are unreliable; use headline and eligibility before making match claims.',
    },
    context: {
      careless: p.careless,
      answered: p.answered,
      total: p.total,
      input: p.input,
      realityGap: p.rg,
      systemConfidence: p.sc ?? null,
      country: p.country ?? null,
      countryPlacements: p.q ?? null,
    },
    statements: statements.map(s => {
      const a = answers[s.id]
      return {
        id: s.id,
        text: s.text,
        kind: isRedLine(s) ? 'red-line' : 'axis',
        axis: isRedLine(s) ? null : s.axis,
        key: isRedLine(s) ? null : s.key,
        recorded: !!a,
        ideal: a?.i ?? null,
        now: a?.n ?? null,
        chip: a?.chip ?? null,
        input: a ? a.input ?? 'grid' : null,
        passed: { ideal: a ? a.i === null : null, now: a ? a.n === null : null },
      }
    }),
    axes: results.rows.map(row => ({
      axis: row.axis,
      ideal: { score: row.I, se: row.seI },
      now: { score: row.N, se: row.seN },
    })),
    headline: { kind: h.kind, ideal: fitSummary(idealFit), now: fitSummary(nowFit) },
    eligibility: {
      ideal: { coverageOk: coverageOk(p.I), flat: isFlat(p.I) },
      now: { coverageOk: coverageOk(p.N), flat: isFlat(p.N) },
    },
    labelCuts: { ...cal.labels[p.mode] },
    ruleOuts: checks.filter(c => out.has(c.slug)).map(c => ({
      slug: c.slug,
      reasons: c.checks.flatMap(check => check.frames.filter(f => f.verdict === 'fail').map(f => ({
        item: check.commitment.item,
        kind: check.commitment.kind ?? 'core',
        frame: f.frame,
        requiredSide: check.commitment.side,
        answer: f.answer,
        why: check.commitment.why,
      }))),
    })),
    rankings: {
      ideal: ranking(rank(p.I, catalogue, 'ideal'), 'ideal', idealFit),
      now: ranking(rank(p.N, catalogue, 'ideal'), 'now', nowFit),
      joint: ranking(rankJoint(p.I, p.N, catalogue), 'joint', null),
    },
  }
}

export type Report = ReturnType<typeof buildReport>

export function formatReport(report: Report): string {
  return `12 Axes² diagnostic report · ${report.mode} · ${report.date}\n${JSON.stringify(report, null, 1)}`
}

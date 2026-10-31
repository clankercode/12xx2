import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import type { Report } from '../src/engine/report'

/** Accept the copied header + JSON, raw JSON, or a Markdown-fenced paste. */
export function parseReport(text: string): Report {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end < start) throw new Error('No report JSON found')
  const report = JSON.parse(text.slice(start, end + 1)) as Report
  if (report?.schema !== '12axes-report-v1' || !report.rankings || !Array.isArray(report.focus) || !Array.isArray(report.ruleOuts)) {
    throw new Error('Expected a 12axes-report-v1 diagnostic report')
  }
  for (const frame of ['ideal', 'now', 'joint'] as const) {
    if (!Array.isArray(report.rankings[frame])) throw new Error(`Missing ${frame} ranking`)
  }
  return report
}

export function summarizeReport(report: Report): string {
  const lines = [
    `12 Axes² · ${report.mode} · ${report.date}`,
    `Versions: app ${report.versions.app}, catalogue ${report.versions.catalogue}, calibration ${report.versions.calibration}`,
    `Headline: ${report.headline.kind}`,
  ]
  if (report.context.careless) lines.push('Unreliable answering: rankings below are diagnostic measurements only.')
  for (const frame of ['ideal', 'now', 'joint'] as const) {
    const rank = report.rankings[frame]
    lines.push(`\n${frame}: top 5 by distance (including rule-outs)`)
    if (frame !== 'joint' && !report.eligibility[frame].coverageOk) lines.push('Insufficient coverage for match claims.')
    if (frame !== 'joint' && report.eligibility[frame].flat) lines.push('Flat frame: no scored position to name.')
    for (const row of rank.slice(0, 5)) lines.push(`  ${row.rank}. ${row.name} (${row.slug}): ${row.distance.toFixed(5)}, ${row.label}${row.ruledOut ? ', RULED OUT' : ''}`)
    const fit = frame === 'joint' ? null : report.headline[frame]
    if (fit) lines.push(`  Fits: ${fit.fits.join(', ') || 'none'}`)
    for (const slug of report.focus) {
      const row = rank.find(r => r.slug === slug)
      lines.push(`  Focus ${slug}: ${row ? `rank ${row.rank}, distance ${row.distance.toFixed(5)}${row.ruledOut ? ', RULED OUT' : ''}` : 'not found'}`)
      if (!row?.breakdown) {
        lines.push('    No detailed breakdown available.')
        continue
      }
      const axes = [...row.breakdown.axes].filter(a => a.covered).sort((a, b) => b.weightedSquaredGap - a.weightedSquaredGap).slice(0, 3)
      if (!axes.length || !row.breakdown.squaredWeightedGap) lines.push('    No axes push away (no covered axes or all gaps zero).')
      else for (const a of axes) lines.push(`    ${a.axis} (${a.frame}): you ${a.score}, ideology ${a.target}, weight ${a.weight.toFixed(3)}, ${(100 * a.share).toFixed(1)}% of squared weighted gap`)
    }
  }
  lines.push('\nRule-outs:')
  if (!report.ruleOuts.length) lines.push('  None')
  for (const out of report.ruleOuts) {
    lines.push(`  ${out.slug}`)
    for (const r of out.reasons) lines.push(`    ${r.item} (${r.kind}, ${r.frame}): requires ${r.requiredSide === 1 ? 'agree (+1)' : 'disagree (-1)'}, answered ${r.answer}. ${r.why}`)
  }
  if (report.unknownFocus.length) lines.push(`\nUnknown focus slugs: ${report.unknownFocus.join(', ')}`)
  return lines.join('\n')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (!process.argv[2]) throw new Error('Usage: just report <file>')
    console.log(summarizeReport(parseReport(readFileSync(process.argv[2], 'utf8'))))
  } catch (error) {
    console.error(`Report: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  }
}

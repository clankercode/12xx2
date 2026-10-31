/**
 * Pair separation (CF review §5 breakpoint): a catalogue pair is separated at a length when some
 * statement asked at that length has one ideology at ≥ +2 and the other at ≤ −2 (coded median
 * sheets, either frame). Also counts pairs that a core commitment rules apart (one ideology's
 * coded sheet decisively contradicts the other's commitment). Prints counts per length and the
 * unseparated pairs at Full, closest first.
 *
 *   pnpm tsx scripts/separation.ts [--json out.json]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { MODES, type Mode } from '../src/engine/types'
import { askedIdsForMode } from '../src/data/items'
import { distance, type Archetype } from '../src/engine/match'

const DIR = 'content/archetypes'
const sheets = JSON.parse(readFileSync(`${DIR}/sheets.json`, 'utf8')) as Record<string, Record<string, [number | null, number | null]>>
const cat = (JSON.parse(readFileSync(`${DIR}/archetypes.json`, 'utf8')) as { archetypes: Archetype[] }).archetypes
const book = (JSON.parse(readFileSync(`${DIR}/commitments.json`, 'utf8')) as {
  commitments: Record<string, { item: string; frame: 'I' | 'both'; side: 1 | -1 }[]>
}).commitments
const slugs = cat.map(a => a.slug).filter(s => sheets[s])
const bySlug = new Map(cat.map(a => [a.slug, a]))

const firm = (a: number | null | undefined, b: number | null | undefined) =>
  a !== null && a !== undefined && b !== null && b !== undefined && ((a >= 2 && b <= -2) || (a <= -2 && b >= 2))

function separators(p: string, q: string, ids: readonly string[]): string[] {
  const out: string[] = []
  for (const id of ids)
    for (const f of [0, 1] as const) if (firm(sheets[p]![id]?.[f], sheets[q]![id]?.[f])) out.push(`${id}${'IN'[f]}`)
  return out
}

/** Commitments of x that y's coded sheet contradicts decisively (|v| ≥ 2 on the wrong side). */
function ruleOuts(x: string, y: string, ids: ReadonlySet<string>): string[] {
  const out: string[] = []
  for (const c of book[x] ?? []) {
    if (!ids.has(c.item)) continue
    const frames = c.frame === 'I' ? [0] : [0, 1]
    if (frames.some(f => (sheets[y]![c.item]?.[f] ?? 0) * c.side <= -2)) out.push(`${x}:${c.item}`)
  }
  return out
}

/** Symmetric ideal-frame distance with the pair's mean weights (for ordering only). */
const pairD = (p: string, q: string) => {
  const a = bySlug.get(p)!
  const b = bySlug.get(q)!
  const w = a.weight.map((x, k) => (x + b.weight[k]!) / 2)
  return distance(a.ideal, b.ideal, w)
}

const pairs: [string, string][] = []
for (let i = 0; i < slugs.length; i++) for (let j = i + 1; j < slugs.length; j++) pairs.push([slugs[i]!, slugs[j]!])

const report: Record<string, unknown> = { ideologies: slugs.length, pairs: pairs.length }
const fullRows: { p: string; q: string; d: number; ruleOut: string[] }[] = []
for (const mode of MODES as readonly Mode[]) {
  const ids = askedIdsForMode(mode)
  const set = new Set(ids)
  let unsep = 0
  let unsepNoRule = 0
  let ruled = 0
  for (const [p, q] of pairs) {
    const s = separators(p, q, ids)
    const r = [...ruleOuts(p, q, set), ...ruleOuts(q, p, set)]
    if (r.length) ruled++
    if (!s.length) {
      unsep++
      if (!r.length) unsepNoRule++
      if (mode === 'full') fullRows.push({ p, q, d: pairD(p, q), ruleOut: r })
    }
  }
  report[mode] = { statements: ids.length, unseparated: unsep, unseparatedAndNoRuleOut: unsepNoRule, pairsWithRuleOut: ruled }
  console.log(`${mode.padEnd(8)} ${String(ids.length).padStart(3)} statements: ${unsep} of ${pairs.length} pairs have no firm yes/no split (${unsepNoRule} of them with no commitment rule-out either); ${ruled} pairs ruled apart by a commitment`)
}
fullRows.sort((a, b) => a.d - b.d)
console.log('\nUnseparated at Full (closest first):')
for (const r of fullRows) console.log(`  ${r.d.toFixed(3)}  ${r.p} ~ ${r.q}${r.ruleOut.length ? `  (commitment: ${r.ruleOut.join(', ')})` : ''}`)
report.unseparatedFull = fullRows.map(r => ({ pair: `${r.p} ~ ${r.q}`, d: Number(r.d.toFixed(4)), ruleOut: r.ruleOut }))
const at = process.argv.indexOf('--json')
if (at > 0) writeFileSync(process.argv[at + 1]!, JSON.stringify(report, null, 1) + '\n')

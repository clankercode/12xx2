/**
 * Content v2: merges the three commitment lenses (theorist, insider, sceptic) into commitments.json.
 * Each lens file (lens-<lens>-<half>.json) lists, per ideology, red-line commitments (set R) and up to
 * two core commitments on the new axis statements (up to five for critical-rationalism, any statement).
 *
 * Same agreement rule as the v1 commitments: an entry is kept when at least 2 of 3 lenses proposed the
 * same statement and side (coders = how many). Frame is "both" only when at least 2 of the proposing
 * lenses said "both". Each kept entry is checked against the ideology's coded median sheet (required
 * side at |v| >= 2): a "both" entry whose here-and-now answer fails is narrowed to "I"; one whose ideal
 * answer fails is not kept (listed in the report). Core entries never exceed MAX_CORE per ideology
 * (existing entries first, then new ones by agreement), never repeat a statement and never re-add a
 * dropped (slug, statement) pair. Raw lens output is appended to commitments-raw.json under `v2`.
 *
 *   pnpm tsx scripts/merge-commitments.ts <lens-dir> [--write]
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { MAX_CORE, type Commitment, type CommitmentsFile } from '../src/engine/commitments'

const DIR = 'content/archetypes'
const lensDir = process.argv[2]
if (!lensDir) throw new Error('usage: merge-commitments.ts <lens-dir> [--write]')
const WRITE = process.argv.includes('--write')

interface Proposal {
  q: string
  side: 'agree' | 'disagree'
  frame: 'I' | 'both'
  why: string
}
interface LensFile {
  lens: 'theorist' | 'insider' | 'sceptic'
  half: number
  archetypes: { slug: string; redlines: Proposal[]; core: Proposal[] }[]
}

const qmap = JSON.parse(readFileSync(`${DIR}/qmap.json`, 'utf8')) as Record<string, string>
const sheets = JSON.parse(readFileSync(`${DIR}/sheets.json`, 'utf8')) as Record<string, Record<string, [number | null, number | null]>>
const file = JSON.parse(readFileSync(`${DIR}/commitments.json`, 'utf8')) as CommitmentsFile & { dropped?: { slug: string; item: string }[] }
const lenses = readdirSync(lensDir)
  .filter(f => /^lens-(theorist|insider|sceptic)-\d\.json$/.test(f))
  .sort()
  .map(f => JSON.parse(readFileSync(`${lensDir}/${f}`, 'utf8')) as LensFile)
const ORDER = ['theorist', 'insider', 'sceptic'] as const

// slug -> "item|side" -> proposals by lens
const votes = new Map<string, Map<string, { lens: string; p: Proposal; red: boolean }[]>>()
for (const lf of lenses)
  for (const a of lf.archetypes)
    for (const [red, list] of [
      [true, a.redlines],
      [false, a.core],
    ] as const)
      for (const p of list ?? []) {
        const item = qmap[p.q]
        if (!item) throw new Error(`${lf.lens}/${a.slug}: unknown ${p.q}`)
        if (red !== item.startsWith('red-')) throw new Error(`${lf.lens}/${a.slug}: ${p.q} (${item}) in the wrong list`)
        const key = `${item}|${p.side}`
        const per = (votes.get(a.slug) ?? votes.set(a.slug, new Map()).get(a.slug)!)
        const v = per.get(key) ?? per.set(key, []).get(key)!
        if (!v.some(x => x.lens === lf.lens)) v.push({ lens: lf.lens, p, red })
      }

const dropped = new Set((file.dropped ?? []).map(d => `${d.slug}|${d.item}`))
const report = { kept: 0, keptRed: 0, keptCore: 0, narrowed: [] as string[], sheetDisagrees: [] as string[], overCap: [] as string[], conflicting: [] as string[] }
const out: Record<string, Commitment[]> = {}
const slugs = [...new Set([...Object.keys(file.commitments), ...votes.keys()])]
for (const slug of slugs) {
  const existing = (file.commitments[slug] ?? []).filter(c => c.kind !== 'red-line')
  const fresh: (Commitment & { n: number })[] = []
  for (const [key, v] of votes.get(slug) ?? []) {
    if (v.length < 2) continue
    const [item, sideWord] = key.split('|') as [string, string]
    const side = sideWord === 'agree' ? 1 : -1
    // Lenses agreeing on opposite sides of one statement cancel out (never happened in v1).
    if ((votes.get(slug)!.get(`${item}|${side === 1 ? 'disagree' : 'agree'}`)?.length ?? 0) >= 2) {
      report.conflicting.push(`${slug} ${item}`)
      continue
    }
    if (dropped.has(`${slug}|${item}`) || existing.some(c => c.item === item)) continue
    let frame: 'I' | 'both' = v.filter(x => x.p.frame === 'both').length >= 2 ? 'both' : 'I'
    const sheet = sheets[slug]?.[item]
    const ok = (f: 0 | 1) => sheet !== undefined && sheet[f] !== null && sheet[f]! * side >= 2
    if (!ok(0)) {
      report.sheetDisagrees.push(`${slug} ${item} side ${side} (sheet ${JSON.stringify(sheet ?? null)}, ${v.length} lenses)`)
      continue
    }
    if (frame === 'both' && !ok(1)) {
      frame = 'I'
      report.narrowed.push(`${slug} ${item}`)
    }
    const why = ORDER.map(l => v.find(x => x.lens === l)).find(Boolean)!.p.why
    fresh.push({ item, frame, side, why, coders: v.length, n: v.length, ...(v[0]!.red && { kind: 'red-line' as const }) })
  }
  const red = fresh.filter(c => c.kind === 'red-line').sort((a, b) => a.item.localeCompare(b.item))
  const core = fresh.filter(c => c.kind !== 'red-line').sort((a, b) => b.n - a.n || a.item.localeCompare(b.item))
  const room = Math.max(0, MAX_CORE - existing.length)
  for (const c of core.slice(room)) report.overCap.push(`${slug} ${c.item}`)
  const strip = ({ n: _n, ...c }: Commitment & { n: number }): Commitment => c
  const list = [...existing, ...core.slice(0, room).map(strip), ...red.map(strip)]
  if (list.length) out[slug] = list
  report.keptRed += red.length
  report.keptCore += Math.min(room, core.length)
}
report.kept = report.keptRed + report.keptCore
console.log(JSON.stringify(report, null, 1))

if (WRITE) {
  file.commitments = out
  file.method = file.method.replace(
    / Raw coder output: commitments-raw\.json\.$/,
    ' Content v2 (2026-10-31) added red-line commitments (kind "red-line", on the off-axis red-line statements; they rule an ideology out exactly like core ones and do not count toward the core cap of 6) and core commitments on the new Full statements, coded by the same three lenses under the same 2-of-3 and coded-sheet rules (scripts/merge-commitments.ts). Raw coder output: commitments-raw.json (v1 under batches, v2 under v2).',
  )
  writeFileSync(`${DIR}/commitments.json`, JSON.stringify(file, null, 1) + '\n')
  const raw = JSON.parse(readFileSync(`${DIR}/commitments-raw.json`, 'utf8')) as Record<string, unknown>
  raw.v2 = lenses
  writeFileSync(`${DIR}/commitments-raw.json`, JSON.stringify(raw, null, 1) + '\n')
  console.log('wrote commitments.json and commitments-raw.json')
}

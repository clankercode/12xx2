/**
 * Turns coders' raw answer sheets into archetype vectors (spec §2.6).
 *
 * - Parses content/archetypes/raw/g*.{opus,sol,grok}.txt (BEGIN/END blocks, blind Q-ids).
 * - Median answer per item per frame across coders, scored with the *same* engine code as users.
 * - Per-axis spread = range of the coders' individually scored ideal vectors.
 * - Weights: a mechanical, published rule (defining axes 1.5, indifferent/disputed 0.5), normalised to Σ = 12.
 * - Leave-one-coder-out validation: each coder's own scored sheet should rank its archetype in the top 3.
 *
 *   pnpm tsx scripts/build-archetypes.ts
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { AXIS_IDS, type Answer, type Answers } from '../src/engine/types'
import { groupByAxis, scoreAxis } from '../src/engine/score'
import { distance, type Archetype } from '../src/engine/match'
import { ALL_ITEMS } from '../src/data/items'

const DIR = 'content/archetypes'
const qmap = JSON.parse(readFileSync(`${DIR}/qmap.json`, 'utf8')) as Record<string, string>
const catalogue = JSON.parse(readFileSync(`${DIR}/catalogue.json`, 'utf8')) as {
  version: number
  archetypes: (Omit<Archetype, 'ideal' | 'now' | 'weight' | 'spread'> & { brief: string; now_notes: string })[]
}
// The catalogue version is encoded into share links; bump it whenever vectors change (spec §6.1).
const VERSION = Number(process.env.CATALOGUE_VERSION ?? 1)
const byAxis = groupByAxis(ALL_ITEMS)

type Sheet = Record<string, [number | null, number | null]>
const sheets: Record<string, Record<string, Sheet>> = {} // slug -> coder -> sheet
const problems: string[] = []

for (const f of readdirSync(`${DIR}/raw`).filter(f => f.endsWith('.txt')).sort()) {
  const coder = f.split('.')[1]!
  const text = readFileSync(`${DIR}/raw/${f}`, 'utf8')
  const blocks = text.matchAll(/BEGIN\s+([a-z0-9-]+)\s*\n([\s\S]*?)\nEND\s+\1/g)
  for (const [, slug, body] of blocks) {
    const sheet: Sheet = {}
    for (const line of body!.split('\n')) {
      const m = line.trim().match(/^(Q\d{3})\s*[:|]?\s*(-?\d|x)\s*[,|\s]\s*(-?\d|x)\s*$/i)
      if (!m) continue
      const id = qmap[m[1]!]
      if (!id) continue
      const v = (s: string) => (s.toLowerCase() === 'x' ? null : Math.max(-3, Math.min(3, Number(s))))
      sheet[id] = [v(m[2]!), v(m[3]!)]
    }
    const n = Object.keys(sheet).length
    if (n < 110) problems.push(`${slug}/${coder}: only ${n} items parsed`)
    if (n >= 60) ((sheets[slug!] ??= {})[coder] = sheet)
  }
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  if (!s.length) return null
  const m = s.length >> 1
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2
}

/** Scores a sheet exactly as a user's answers are scored (fractional medians allowed); null = unscorable axis. */
function score(sheet: Sheet, frame: 0 | 1): (number | null)[] {
  const ans: Answers = {}
  for (const [id, v] of Object.entries(sheet)) ans[id] = { i: v[frame] as Answer, n: null }
  return AXIS_IDS.map(ax => scoreAxis(byAxis[ax], ans, 'I').score)
}

/** Per-item median across coders; an item every coder passed stays missing. */
function medianSheet(coders: Sheet[]): Sheet {
  const out: Sheet = {}
  for (const it of ALL_ITEMS) {
    const col = (f: 0 | 1) => coders.map(c => c[it.id]?.[f]).filter((x): x is number => x !== null && x !== undefined)
    out[it.id] = [median(col(0)), median(col(1))]
  }
  return out
}

const range = (vs: (number | null)[][], k: number) => {
  const xs = vs.map(v => v[k]).filter((x): x is number => x !== null && x !== undefined)
  return xs.length > 1 ? Math.max(...xs) - Math.min(...xs) : 0
}

/** Builds one archetype from a set of coder sheets, or null (with a problem logged) if it can't be scored. */
function build(a: (typeof catalogue.archetypes)[number], coderSheets: Sheet[], log: string[]): Archetype | null {
  const med = medianSheet(coderSheets)
  const ideal = score(med, 0)
  const now = score(med, 1)
  const missing = AXIS_IDS.filter((_, k) => ideal[k] === null || now[k] === null)
  if (missing.length) {
    log.push(`${a.slug}: unscorable axes ${missing.join(',')} — excluded`)
    return null
  }
  const vI = coderSheets.map(c => score(c, 0))
  const vN = coderSheets.map(c => score(c, 1))
  // Disagreement in either frame counts: weights also apply to the here-and-now half of joint matching.
  const spread = AXIS_IDS.map((_, k) => Math.max(range(vI, k), range(vN, k)))
  // Weight rule: strong positions define the ideology; near-centre or disputed axes matter less.
  const raw = AXIS_IDS.map((_, k) => (spread[k]! > 35 || Math.abs(ideal[k]!) < 20 ? 0.5 : Math.abs(ideal[k]!) >= 60 ? 1.5 : 1))
  const total = raw.reduce((p, q) => p + q, 0)
  return {
    slug: a.slug,
    name: a.name,
    family: a.family,
    sensitive: a.sensitive,
    summary: a.summary,
    signature: a.signature,
    ideal: ideal.map(v => Number(v!.toFixed(1))),
    now: now.map(v => Number(v!.toFixed(1))),
    weight: raw.map(w => Number(((12 * w) / total).toFixed(4))),
    spread: spread.map(v => Number(v.toFixed(1))),
    sources: a.sources,
  }
}

const archetypes: Archetype[] = []
const medianSheets: Record<string, Sheet> = {}
const agreement: Record<string, number> = {}

for (const a of catalogue.archetypes) {
  const per = sheets[a.slug] ?? {}
  const coders = Object.keys(per).sort()
  if (coders.length === 0) {
    problems.push(`${a.slug}: no coder sheets`)
    continue
  }
  if (coders.length < 3) problems.push(`${a.slug}: only ${coders.length} coder(s): ${coders.join(',')}`)
  const built = build(a, coders.map(c => per[c]!), problems)
  if (!built) continue
  archetypes.push(built)
  medianSheets[a.slug] = medianSheet(coders.map(c => per[c]!))
  // Mean absolute pairwise difference of item answers between coders (ideal frame), on the −3…3 scale.
  let sum = 0
  let cnt = 0
  for (let x = 0; x < coders.length; x++)
    for (let y = x + 1; y < coders.length; y++)
      for (const it of ALL_ITEMS) {
        const p = per[coders[x]!]![it.id]?.[0]
        const q = per[coders[y]!]![it.id]?.[0]
        if (p !== null && p !== undefined && q !== null && q !== undefined) {
          sum += Math.abs(p - q)
          cnt++
        }
      }
  agreement[a.slug] = cnt ? Number((sum / cnt).toFixed(2)) : NaN
}

// Leave-one-coder-out: rebuild the WHOLE catalogue without coder c, then rank c's own ideal sheets against it.
let checked = 0
let top3 = 0
const misses: string[] = []
for (const c of ['opus', 'sol', 'grok']) {
  const loo: Archetype[] = []
  for (const a of catalogue.archetypes) {
    const others = Object.entries(sheets[a.slug] ?? {}).filter(([k]) => k !== c)
    if (!others.length) continue
    const b = build(a, others.map(([, v]) => v), [])
    if (b) loo.push(b)
  }
  for (const a of archetypes) {
    const own = sheets[a.slug]?.[c]
    if (!own || !loo.some(b => b.slug === a.slug)) continue
    const u = score(own, 0)
    const ranked = [...loo].sort((x, y) => distance(u, x.ideal, x.weight) - distance(u, y.ideal, y.weight))
    const rank = ranked.findIndex(x => x.slug === a.slug)
    checked++
    if (rank < 3) top3++
    else misses.push(`${a.slug} (coder ${c}: rank ${rank + 1}, top was ${ranked[0]!.slug})`)
  }
}

const families = Object.fromEntries(['opus', 'sol', 'grok'].map(c => [c, Object.values(sheets).filter(s => s[c]).length]))
const meta = {
  version: VERSION,
  coders: { opus: 'Anthropic Claude Opus', sol: 'OpenAI GPT-6.1-sol', grok: 'xAI Grok (llmp-grok-4-7)' },
  sheetsPerCoder: families,
  leaveOneOut: { checked, top3Rate: Number((top3 / Math.max(1, checked)).toFixed(3)), misses },
  meanItemDisagreement: agreement,
  problems,
}
const outFile = `${DIR}/archetypes.json`
const prev = JSON.parse(readFileSync(outFile, 'utf8')) as { version: number; placeholder?: boolean; archetypes: Archetype[] }
if (!prev.placeholder && prev.version === VERSION && JSON.stringify(prev.archetypes) !== JSON.stringify(archetypes) && !process.argv.includes('--force')) {
  console.error(`archetypes: vectors changed but version is still ${VERSION}; set CATALOGUE_VERSION=${VERSION + 1} (or pass --force before release)`)
  process.exit(1)
}
writeFileSync(outFile, JSON.stringify({ version: VERSION, meta, archetypes }, null, 1) + '\n')
writeFileSync(`${DIR}/sheets.json`, JSON.stringify(medianSheets) + '\n')
console.log(JSON.stringify({ archetypes: archetypes.length, ...meta, meanItemDisagreement: undefined }, null, 1))
const ag = Object.values(agreement).filter(Number.isFinite)
console.log('mean item disagreement across archetypes:', (ag.reduce((p, q) => p + q, 0) / ag.length).toFixed(2))

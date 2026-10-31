/**
 * Turns coders' raw answer sheets into archetype vectors (spec §2.6).
 *
 * - Parses content/archetypes/raw/{g,fill-,v2fill-}*.{opus,sol,grok}.txt (BEGIN/END blocks, blind Q-ids);
 *   fill files supply missing items and items recoded after a rewording; v2fill files add the
 *   content-v2 statements (Full-only axis items and red lines). The first answer wins in the
 *   order g* < fill-* < v2fill-*, except for RECODED items, where the latest fill answer wins.
 *   (Fills also re-asked items first answered as "+N", which coder-fill's parser once missed; those
 *   re-asks are ignored, so each such item keeps the coder's first answer.)
 * - Sheets carry red-line answers too (sheets.json), for auditing red-line commitments; scoring
 *   only ever reads axis items, so red lines never move a vector.
 * - Median answer per item per frame across coders, scored with the *same* engine code as users.
 * - Per-axis spread = range of the coders' individually scored ideal vectors.
 * - Weights: a mechanical, published rule (defining axes 1.5, indifferent/disputed 0.5), normalised to Σ = 12.
 * - Leave-one-coder-out validation: each coder's own scored sheet should rank its archetype in the top 3.
 *
 *   pnpm tsx scripts/build-archetypes.ts [--out-dir DIR]   (DIR defaults to content/archetypes; for dry runs)
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { AXIS_IDS, type Answer, type Answers } from '../src/engine/types'
import { groupByAxis, scoreAxis } from '../src/engine/score'
import { distance, type Archetype } from '../src/engine/match'
import { ALL_ITEMS } from '../src/data/items'
import { RED_IDS } from '../src/data/redlines'
import { parseSheetLine } from './sheet-line'

const DIR = 'content/archetypes'
const qmap = JSON.parse(readFileSync(`${DIR}/qmap.json`, 'utf8')) as Record<string, string>
const catalogue = JSON.parse(readFileSync(`${DIR}/catalogue.json`, 'utf8')) as {
  version: number
  archetypes: (Omit<Archetype, 'ideal' | 'now' | 'weight' | 'spread'> & { brief: string; now_notes: string })[]
}
// The catalogue version is encoded into share links; bump it whenever vectors change (spec §6.1).
const VERSION = Number(process.env.CATALOGUE_VERSION ?? 1)
const byAxis = groupByAxis(ALL_ITEMS)
/** Every statement a coder sheet answers: axis items and red lines (one blind Q-id each). */
const SHEET_IDS = [...ALL_ITEMS.map(it => it.id), ...RED_IDS]
const NQ = Object.keys(qmap).length
// A sheet should answer every Q-id; one missing more than ~8% (as 110 of 120 was) is dropped.
const MIN_KEEP = Math.floor((NQ * 11) / 12)
const unmapped = SHEET_IDS.filter(id => !Object.values(qmap).includes(id))
if (unmapped.length) throw new Error(`qmap.json has no Q-id for: ${unmapped.join(', ')}`)
/** Merge order: originals, then fills, then content-v2 fills. */
const kindRank = (f: string) => (f.startsWith('v2fill-') ? 2 : f.startsWith('fill-') ? 1 : 0)
/**
 * Items reworded after the original sheets were coded (Q007, Q011, Q059, Q098; the RECODE list in
 * scripts/coder-fill.ts): an original answer to the old wording is replaced by any fill answer.
 */
const RECODED = new Set(['Q007', 'Q011', 'Q059', 'Q098'].map(q => qmap[q]!))

type Sheet = Record<string, [number | null, number | null]>
const sheets: Record<string, Record<string, Sheet>> = {} // slug -> coder -> sheet
const problems: string[] = []

const rawFiles = readdirSync(`${DIR}/raw`)
  .filter(f => f.endsWith('.txt'))
  .sort((a, b) => kindRank(a) - kindRank(b) || a.localeCompare(b))
for (const f of rawFiles) {
  const coder = f.split('.')[1]!
  const text = readFileSync(`${DIR}/raw/${f}`, 'utf8')
  const blocks = text.matchAll(/BEGIN\s+([a-z0-9-]+)\s*\n([\s\S]*?)\nEND\s+\1/g)
  for (const [, slug, body] of blocks) {
    const sheet: Sheet = {}
    for (const line of body!.split('\n')) {
      const a = parseSheetLine(line)
      const id = a && qmap[a.q]
      if (id) sheet[id] = [a.i, a.n]
    }
    // rawFiles puts g* before fill-* before v2fill-*: the first answer wins, except on a recoded item,
    // where every fill answer replaces what came before (so the latest fill wins).
    const into = ((sheets[slug!] ??= {})[coder] ??= {})
    for (const [id, v] of Object.entries(sheet)) if (into[id] === undefined || (RECODED.has(id) && kindRank(f) > 0)) into[id] = v
  }
}
for (const [slug, per] of Object.entries(sheets))
  for (const [coder, sheet] of Object.entries(per)) {
    const n = Object.keys(sheet).length
    if (n < NQ) problems.push(`${slug}/${coder}: only ${n} of ${NQ} items parsed`)
    if (n < MIN_KEEP) delete per[coder]
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

/** Per-statement median across coders (axis items and red lines); one every coder passed stays missing. */
function medianSheet(coders: Sheet[]): Sheet {
  const out: Sheet = {}
  for (const id of SHEET_IDS) {
    const col = (f: 0 | 1) => coders.map(c => c[id]?.[f]).filter((x): x is number => x !== null && x !== undefined)
    out[id] = [median(col(0)), median(col(1))]
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
const OUT_DIR = process.argv.includes('--out-dir') ? process.argv[process.argv.indexOf('--out-dir') + 1]! : DIR
const outFile = `${OUT_DIR}/archetypes.json`
const prev = JSON.parse(readFileSync(`${DIR}/archetypes.json`, 'utf8')) as { version: number; placeholder?: boolean; archetypes: Archetype[] }
if (!prev.placeholder && prev.version === VERSION && JSON.stringify(prev.archetypes) !== JSON.stringify(archetypes) && !process.argv.includes('--force')) {
  console.error(`archetypes: vectors changed but version is still ${VERSION}; set CATALOGUE_VERSION=${VERSION + 1} (or pass --force before release)`)
  process.exit(1)
}
writeFileSync(outFile, JSON.stringify({ version: VERSION, meta, archetypes }, null, 1) + '\n')
writeFileSync(`${OUT_DIR}/sheets.json`, JSON.stringify(medianSheets) + '\n')
console.log(JSON.stringify({ archetypes: archetypes.length, ...meta, meanItemDisagreement: undefined }, null, 1))
const ag = Object.values(agreement).filter(Number.isFinite)
console.log('mean item disagreement across archetypes:', (ag.reduce((p, q) => p + q, 0) / ag.length).toFixed(2))

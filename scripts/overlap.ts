/**
 * Provenance gate (spec §2.4): every item must be original wording.
 *
 * Upstream banks are stored only as salted hashes of stopword-stripped word
 * 3-grams (containment test) and raw word 6-grams (exact-run test), so no
 * upstream text — in particular the all-rights-reserved 12axes.vercel.app bank
 * — is ever committed.
 *
 *   pnpm tsx scripts/overlap.ts                  # check items, exit 1 on any hit
 *   pnpm tsx scripts/overlap.ts --probe "<text>"  # check one sentence
 *   pnpm tsx scripts/overlap.ts --generate <src>…  # rebuild the hash file from local upstream copies
 *
 * Sources for --generate: a .js file (string literals are extracted) or a JSON
 * array of { text } objects.
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { ALL_ITEMS } from '../src/data/items'
import { RED_LINES } from '../src/data/redlines'

/** Every statement shown to people: axis items and red lines, plus the notes shown under them. */
const NOTES = [...ALL_ITEMS, ...RED_LINES].flatMap(s => (s.note ? [{ id: `${s.id} note`, text: s.note }] : []))
const STATEMENTS: { id: string; text: string }[] = [...ALL_ITEMS, ...RED_LINES, ...NOTES]

const OUT = 'content/provenance/upstream-shingles.json'
const SALT = '12xx2-provenance-v1'
const CONTAIN_MAX = 0.5
const STOP = new Set(
  'the a an of to and or in on for be is are should my our we i it that this with by as at from not than more most its their there'.split(' '),
)

const words = (s: string) => s.toLowerCase().match(/[a-z0-9']+/g) ?? []
const grams = (ws: string[], n: number) => ws.slice(0, Math.max(0, ws.length - n + 1)).map((_, k) => ws.slice(k, k + n).join(' '))
const h = (s: string) => createHash('sha256').update(SALT + s).digest('base64url').slice(0, 12)
const shingles = (s: string) => grams(words(s).filter(w => !STOP.has(w)), 3)
const runs = (s: string) => grams(words(s), 6)

interface HashFile {
  salt: string
  sources: { name: string; sentences: number }[]
  /** Per upstream sentence: hashed 3-gram shingles. */
  sentences: string[][]
  /** All hashed 6-word runs. */
  runs: string[]
}

function texts(path: string): string[] {
  const raw = readFileSync(path, 'utf8')
  if (path.endsWith('.json')) {
    const d = JSON.parse(raw) as unknown[]
    return d.map(x => (x as { text?: unknown }).text).filter((t): t is string => typeof t === 'string')
  }
  return [...raw.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map(m => m[1]!).filter(t => t.split(' ').length >= 4)
}

if (process.argv[2] === '--generate') {
  const out: HashFile = { salt: SALT, sources: [], sentences: [], runs: [] }
  const allRuns = new Set<string>()
  for (const p of process.argv.slice(3)) {
    const ts = texts(p)
    out.sources.push({ name: p.split('/').slice(-3).join('/'), sentences: ts.length })
    for (const t of ts) {
      const sh = [...new Set(shingles(t).map(h))]
      if (sh.length) out.sentences.push(sh)
      for (const r of runs(t)) allRuns.add(h(r))
    }
  }
  out.runs = [...allRuns].sort()
  writeFileSync(OUT, JSON.stringify(out) + '\n')
  console.log(`wrote ${OUT}: ${out.sentences.length} sentences, ${out.runs.length} runs`)
  process.exit(0)
}

const file = JSON.parse(readFileSync(OUT, 'utf8')) as HashFile
if (file.salt !== SALT || !file.sentences.length) {
  console.error('overlap: hash file missing or salt mismatch — failing closed')
  process.exit(1)
}
const runSet = new Set(file.runs)
const fails: string[] = []
let worst = 0
// --probe "<text>" checks one sentence instead of the bank (used to test the gate itself).
const probe = process.argv[2] === '--probe' ? [{ id: 'probe', text: process.argv[3] ?? '' }] : null
for (const it of probe ?? STATEMENTS) {
  const mine = new Set(shingles(it.text).map(h))
  let best = 0
  for (const s of file.sentences) {
    let hit = 0
    for (const x of s) if (mine.has(x)) hit++
    best = Math.max(best, mine.size ? hit / mine.size : 0)
  }
  worst = Math.max(worst, best)
  const exact = runs(it.text).filter(r => runSet.has(h(r)))
  if (best >= CONTAIN_MAX || exact.length) fails.push(`${it.id}: containment ${best.toFixed(2)}${exact.length ? `, ${exact.length} exact 6-word run(s)` : ''} — "${it.text}"`)
}
console.log(`overlap: ${probe ? 1 : STATEMENTS.length} texts (${ALL_ITEMS.length} axis, ${RED_LINES.length} red lines, ${NOTES.length} notes) vs ${file.sentences.length} upstream sentences; worst containment ${worst.toFixed(2)}`)
if (fails.length) {
  console.error(fails.join('\n'))
  process.exit(1)
}

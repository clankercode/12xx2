/**
 * Lists what each coder still owes: items missing from its sheets (truncated
 * output) plus items reworded after coding (RECODE). Writes a job list for the
 * fill workflow; answers go to content/archetypes/raw/fill-NN.<coder>.txt.
 *
 *   pnpm tsx scripts/coder-fill.ts > fill-jobs.json
 *   pnpm tsx scripts/coder-fill.ts --write <dir>   # one self-contained prompt file per job + jobs.tsv
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'

const DIR = 'content/archetypes'
/** Items whose wording changed after coding began (review of 2026-10-31). */
const RECODE = ['Q007', 'Q011', 'Q059', 'Q098']
const CODERS = ['opus', 'sol', 'grok']
interface Entry {
  slug: string
  name: string
  summary: string
  brief: string
  now_notes: string
  sources: { title: string; author: string; year?: string }[]
}
const catalogue = JSON.parse(readFileSync(`${DIR}/catalogue.json`, 'utf8')) as { archetypes: Entry[] }
const all = Array.from({ length: 120 }, (_, k) => `Q${String(k + 1).padStart(3, '0')}`)
const have: Record<string, Set<string>> = {}
for (const f of readdirSync(`${DIR}/raw`).filter(f => f.endsWith('.txt') && f.startsWith('g'))) {
  const coder = f.split('.')[1]!
  for (const [, slug, body] of readFileSync(`${DIR}/raw/${f}`, 'utf8').matchAll(/BEGIN\s+([a-z0-9-]+)\s*\n([\s\S]*?)\nEND\s+\1/g)) {
    const set = (have[`${slug}/${coder}`] ??= new Set())
    for (const m of body!.matchAll(/^\s*(Q\d{3})\s*[:|]?\s*(-?\d|x)\s*[,|\s]\s*(-?\d|x)\s*$/gim)) set.add(m[1]!)
  }
}
const jobs: { coder: string; slugs: { slug: string; q: string[] }[] }[] = []
for (const coder of CODERS) {
  const cap = coder === 'grok' ? 50 : 160
  const need = catalogue.archetypes
    .map(a => {
      const h = have[`${a.slug}/${coder}`] ?? new Set<string>()
      return { slug: a.slug, q: all.filter(q => !h.has(q) || RECODE.includes(q)) }
    })
    .filter(x => x.q.length)
    // A sheet that needs more than one batch is split into chunks.
    .flatMap(x => Array.from({ length: Math.ceil(x.q.length / cap) }, (_, k) => ({ slug: x.slug, q: x.q.slice(k * cap, (k + 1) * cap) })))
  // Small batches keep outputs short enough not to truncate (Grok stopped near 60 lines).
  let batch: typeof need = []
  let size = 0
  for (const x of need) {
    if (batch.length && size + x.q.length > cap) {
      jobs.push({ coder, slugs: batch })
      batch = []
      size = 0
    }
    batch.push(x)
    size += x.q.length
  }
  if (batch.length) jobs.push({ coder, slugs: batch })
}
const out = process.argv[2] === '--write' ? process.argv[3] : null
if (!out) {
  console.log(JSON.stringify(jobs))
  process.exit(0)
}

// Same instructions as the original coding run, restricted to the statements still owed.
const frames = readFileSync(`${DIR}/coder-frames.txt`, 'utf8').trim()
const statements = new Map(
  readFileSync(`${DIR}/items-for-coders.txt`, 'utf8')
    .split('\n')
    .filter(l => /^Q\d{3}:/.test(l))
    .map(l => [l.slice(0, 4), l] as const),
)
const bySlug = new Map(catalogue.archetypes.map(a => [a.slug, a]))
const packet = (a: Entry) => `ARCHETYPE: ${a.name} (slug ${a.slug})
Summary: ${a.summary}
Adherent brief: ${a.brief}
Here-and-now programme notes: ${a.now_notes}
Sources: ${a.sources.map(s => `${s.author}${s.year ? ' (' + s.year + ')' : ''}, ${s.title}`).join('; ')}`
mkdirSync(out, { recursive: true })
const tsv: string[] = []
jobs.forEach((j, n) => {
  const id = `fill-${String(n).padStart(2, '0')}.${j.coder}`
  const parts = j.slugs.map(x => `${packet(bySlug.get(x.slug)!)}

Statements to answer for ${x.slug} (answer exactly these, in this order):
${x.q.map(q => statements.get(q)).join('\n')}`)
  const prompt = `You are role-playing SINCERE, MAINSTREAM, well-informed adherents of political ideologies, answering a political survey exactly as they would. Not a caricature, not the most extreme fringe: the typical committed adherent as described in the packet and its sources. Be faithful to the ideology even where you personally disagree. Do not use tools; answer directly.

${frames}

For EACH archetype below, answer the listed statements, giving two numbers per statement: IDEAL then NOW.

${parts.join('\n\n')}

OUTPUT FORMAT (strict; nothing else between the markers). For each archetype:
BEGIN <slug>
Qnnn <ideal> <now>
... (one line per listed statement)
END <slug>
where <ideal>/<now> are integers -3..3 or x.`
  writeFileSync(`${out}/${id}.prompt.txt`, prompt)
  tsv.push(`${id}\t${j.coder}\t${j.slugs.map(x => x.slug).join(',')}`)
})
writeFileSync(`${out}/jobs.tsv`, tsv.join('\n') + '\n')
console.error(`wrote ${jobs.length} prompts to ${out}`)

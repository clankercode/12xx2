/**
 * Lists what each coder still owes: items missing from its sheets (truncated
 * output) plus items reworded after coding (RECODE). Writes a job list for the
 * fill workflow; answers go to content/archetypes/raw/fill-NN.<coder>.txt.
 *
 *   pnpm tsx scripts/coder-fill.ts > fill-jobs.json
 */
import { readFileSync, readdirSync } from 'node:fs'

const DIR = 'content/archetypes'
/** Items whose wording changed after coding began (review of 2026-10-31). */
const RECODE = ['Q007', 'Q011', 'Q059', 'Q098']
const CODERS = ['opus', 'sol', 'grok']
const catalogue = JSON.parse(readFileSync(`${DIR}/catalogue.json`, 'utf8')) as { archetypes: { slug: string }[] }
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
console.log(JSON.stringify(jobs))

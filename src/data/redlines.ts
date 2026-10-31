import type { RedLine } from '../engine/types'
import red from '../../content/items/red.json'

interface RawRed {
  set: string
  method: string
  items: { id: string; humane: number; text: string; note?: string; rationale: string }[]
}

/** Validates red.json at import, so a malformed entry fails tests and builds rather than the quiz. */
export function validateRedLines(raw: unknown): RedLine[] {
  const fail = (msg: string): never => {
    throw new Error(`red.json: ${msg}`)
  }
  const f = raw as Partial<RawRed> | null
  if (!f || typeof f !== 'object' || f.set !== 'red' || !Array.isArray(f.items)) return fail('expected { set: "red", items: [...] }')
  const seen = new Set<string>()
  return f.items.map((r, k) => {
    if (typeof r?.id !== 'string' || !/^red-\d{2}$/.test(r.id)) fail(`item ${k}: id must look like red-01`)
    if (seen.has(r.id)) fail(`${r.id}: duplicate id`)
    seen.add(r.id)
    if (r.humane !== 1 && r.humane !== -1) fail(`${r.id}: humane must be 1 or -1`)
    if (typeof r.text !== 'string' || !r.text.trim()) fail(`${r.id}: text is required`)
    if (r.note !== undefined && (typeof r.note !== 'string' || !r.note.trim())) fail(`${r.id}: note must be non-empty text`)
    return {
      id: r.id,
      humane: r.humane as 1 | -1,
      text: r.text,
      ...(r.note ? { note: r.note } : {}),
      rationale: typeof r.rationale === 'string' ? r.rationale : '',
    }
  })
}

/** The red-line statements, in the order they are asked (and encoded in share links). */
export const RED_LINES: readonly RedLine[] = validateRedLines(red)
export const RED_IDS: readonly string[] = RED_LINES.map(r => r.id)
export const RED_ID_SET: ReadonlySet<string> = new Set(RED_IDS)
export const redLineById = (id: string) => RED_LINES.find(r => r.id === id)

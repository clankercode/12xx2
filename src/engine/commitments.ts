import type { Answer, Answers, Item } from './types'

/**
 * Core commitments (an IGC-style binary check): statements on which the coded profiles of an
 * ideology's mainstream all take the same side (coders' judgements, not a survey of adherents). A decisive contradiction rules the ideology out, however close
 * the distance match is. Ideologies are the ideas, commitments the goals, answers the context.
 */
export interface Commitment {
  item: string
  /** 'I' checks the ideal-system answer; 'both' checks the ideal and here-and-now answers. */
  frame: 'I' | 'both'
  /** Required sign of the raw answer: +1 agree, −1 disagree (item key NOT applied). */
  side: 1 | -1
  why: string
  /** Provenance: how many of the three coders proposed it independently. */
  coders?: number
}

/**
 * A coded commitment removed because simulated sincere adherents fail it too often (the audit
 * sets `falseRuleOut`), or because a counterexample refutes it (set by hand with `reason`).
 */
export interface DroppedCommitment extends Commitment {
  slug: string
  /** Adherents of `slug` simulated from the coded sheets, ruled out by this commitment alone (full test). */
  falseRuleOut?: number
  /** Why it was dropped, when a real counterexample rather than the audit refuted it. */
  reason?: string
}

export type CommitmentBook = Readonly<Record<string, readonly Commitment[]>>

export interface CommitmentsFile {
  version: 1
  method: string
  commitments: Record<string, Commitment[]>
  dropped?: DroppedCommitment[]
}

export const MAX_COMMITMENTS = 5

/** ✔ non-refuted · ✘ decisive error · ? unknown (never counted as a pass). */
export type Verdict = 'pass' | 'fail' | 'unknown'

/** Why a frame came out unknown, for the "?" explanation. */
export type UnknownReason = 'passed' | 'not-asked' | 'neutral' | 'not-decisive'

export interface FrameCheck {
  frame: 'I' | 'N'
  answer: Answer
  verdict: Verdict
  reason?: UnknownReason
}

export interface CommitmentCheck {
  commitment: Commitment
  verdict: Verdict
  frames: FrameCheck[]
}

export interface ArchetypeCheck {
  slug: string
  /** 'none' = no commitments listed: neither ✘ nor ✔. */
  all: Verdict | 'none'
  checks: CommitmentCheck[]
}

/** Answers this far on the wrong side are decisive; "slightly" (|a| = 1) is noise. */
export const DECISIVE = 2

export function checkFrame(a: Answer | undefined, side: 1 | -1, asked: boolean, frame: 'I' | 'N'): FrameCheck {
  if (!asked) return { frame, answer: null, verdict: 'unknown', reason: 'not-asked' }
  if (a === null || a === undefined) return { frame, answer: null, verdict: 'unknown', reason: 'passed' }
  if (a === 0) return { frame, answer: a, verdict: 'unknown', reason: 'neutral' }
  if (Math.sign(a) === side) return { frame, answer: a, verdict: 'pass' }
  if (Math.abs(a) >= DECISIVE) return { frame, answer: a, verdict: 'fail' }
  return { frame, answer: a, verdict: 'unknown', reason: 'not-decisive' }
}

export function checkCommitment(c: Commitment, answers: Answers, asked: ReadonlySet<string>): CommitmentCheck {
  const isAsked = asked.has(c.item)
  const ans = answers[c.item]
  const frames = [checkFrame(ans?.i, c.side, isAsked, 'I')]
  if (c.frame === 'both') frames.push(checkFrame(ans?.n, c.side, isAsked, 'N'))
  return { commitment: c, verdict: combine(frames.map(f => f.verdict)), frames }
}

/** ✘ if any is ✘; else ? if any is ?; else ✔. */
export function combine(vs: readonly Verdict[]): Verdict {
  if (vs.includes('fail')) return 'fail'
  if (vs.includes('unknown')) return 'unknown'
  return 'pass'
}

export function checkArchetype(slug: string, book: CommitmentBook, answers: Answers, asked: ReadonlySet<string>): ArchetypeCheck {
  const list = book[slug] ?? []
  const checks = list.map(c => checkCommitment(c, answers, asked))
  return { slug, all: checks.length === 0 ? 'none' : combine(checks.map(c => c.verdict)), checks }
}

/** Catalogue-order indices of every archetype the answers rule out (ascending). */
export function ruledOutIndices(
  slugs: readonly string[],
  book: CommitmentBook,
  answers: Answers,
  asked: ReadonlySet<string>,
): number[] {
  const out: number[] = []
  slugs.forEach((slug, k) => {
    if (checkArchetype(slug, book, answers, asked).all === 'fail') out.push(k)
  })
  return out
}

/** Validates a commitments file against the item bank and catalogue; throws on any bad entry. */
export function validateCommitments(raw: unknown, items: readonly Item[], slugs: readonly string[]): CommitmentBook {
  const fail = (msg: string): never => {
    throw new Error(`commitments.json: ${msg}`)
  }
  const f = raw as Partial<CommitmentsFile> | null
  if (!f || typeof f !== 'object') return fail('not an object')
  if (f.version !== 1) fail(`unsupported version ${String(f.version)}`)
  if (typeof f.method !== 'string') fail('method must be a string')
  if (!f.commitments || typeof f.commitments !== 'object' || Array.isArray(f.commitments)) return fail('commitments must be an object')
  const itemIds = new Set(items.map(i => i.id))
  const known = new Set(slugs)
  const book: Record<string, readonly Commitment[]> = {}
  for (const [slug, list] of Object.entries(f.commitments)) {
    if (!known.has(slug)) fail(`unknown archetype "${slug}"`)
    if (!Array.isArray(list)) return fail(`${slug}: commitments must be an array`)
    if (list.length > MAX_COMMITMENTS) fail(`${slug}: at most ${MAX_COMMITMENTS} commitments`)
    const seen = new Set<string>()
    for (const c of list as Partial<Commitment>[]) {
      const at = `${slug}/${String(c?.item)}`
      if (typeof c?.item !== 'string' || !itemIds.has(c.item)) fail(`${at}: unknown item`)
      if (seen.has(c.item!)) fail(`${at}: duplicate item`)
      seen.add(c.item!)
      if (c.frame !== 'I' && c.frame !== 'both') fail(`${at}: frame must be "I" or "both"`)
      if (c.side !== 1 && c.side !== -1) fail(`${at}: side must be 1 or -1`)
      if (typeof c.why !== 'string' || !c.why.trim()) fail(`${at}: why is required`)
      if (c.coders !== undefined && (!Number.isInteger(c.coders) || c.coders < 1 || c.coders > 3)) fail(`${at}: coders must be 1–3`)
    }
    book[slug] = (list as Commitment[]).map(c => ({ item: c.item, frame: c.frame, side: c.side, why: c.why, ...(c.coders && { coders: c.coders }) }))
  }
  return book
}

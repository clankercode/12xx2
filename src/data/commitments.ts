import raw from '../../content/archetypes/commitments.json'
import { isRedCommitment, validateCommitments, type CommitmentBook } from '../engine/commitments'
import { ALL_ITEMS } from './items'
import { RED_LINES } from './redlines'
import { CATALOGUE, CATALOGUE_VERSION } from './archetypes'

/** Validated at import: a bad item id or slug throws in tests and at build-time checks. */
export const COMMITMENTS: CommitmentBook = validateCommitments(
  raw,
  ALL_ITEMS,
  CATALOGUE.map(a => a.slug),
  RED_LINES,
)

export const HAS_COMMITMENTS = Object.values(COMMITMENTS).some(l => l.length > 0)
/** Whether any ideology lists a red-line commitment (the matrix shows its Red lines column only then). */
export const HAS_RED_COMMITMENTS = Object.values(COMMITMENTS).some(l => l.some(isRedCommitment))

export const CATALOGUE_SLUGS: readonly string[] = CATALOGUE.map(a => a.slug)

/**
 * Slugs a payload marks as ruled out. Indices are catalogue order for the payload's own
 * catalogue version, so a link from another version yields none ("no rule-outs known").
 */
export function ruledOutSlugs(p: { catalogue: number; ruledOut?: readonly number[] }): ReadonlySet<string> {
  if (!p.ruledOut?.length || p.catalogue !== CATALOGUE_VERSION) return new Set()
  return new Set(p.ruledOut.flatMap(k => (CATALOGUE_SLUGS[k] ? [CATALOGUE_SLUGS[k]!] : [])))
}

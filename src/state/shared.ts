import { decodePayload, type DecodeResult, type Payload } from '../engine/payload'
import { deriveResults, type Results } from '../engine/results'
import { CATALOGUE_VERSION, catalogueFor } from '../data/archetypes'
import { CALIBRATION } from '../data/calibration'
import { ruledOutSlugs } from '../data/commitments'

/** Decodes a result link for viewing; a catalogue newer than this build cannot be interpreted. */
export function decodeShared(s: string): DecodeResult {
  const d = decodePayload(s)
  if (d.ok && d.payload.catalogue > CATALOGUE_VERSION) return { ok: false, error: 'newer-version' }
  return d
}

/** Results as a viewer of this payload sees them: sensitive names only on opt-in, rule-outs from the link. */
export function deriveShared(p: Payload): Results {
  return deriveResults(p, catalogueFor(p), CALIBRATION, ruledOutSlugs(p))
}

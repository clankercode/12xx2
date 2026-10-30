import { decodePayload, type DecodeResult } from '../engine/payload'
import { CATALOGUE_VERSION } from '../data/archetypes'

/** Decodes a result link for viewing; a catalogue newer than this build cannot be interpreted. */
export function decodeShared(s: string): DecodeResult {
  const d = decodePayload(s)
  if (d.ok && d.payload.catalogue > CATALOGUE_VERSION) return { ok: false, error: 'newer-version' }
  return d
}

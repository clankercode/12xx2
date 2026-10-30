import type { Archetype } from '../engine/match'
import raw from '../../content/archetypes/archetypes.json'

interface RawCatalogue {
  version: number
  placeholder?: boolean
  archetypes: Archetype[]
}

const data = raw as unknown as RawCatalogue

/** Catalogue/method version encoded into share links (frozen per release). */
export const CATALOGUE_VERSION = data.version
export const CATALOGUE: readonly Archetype[] = data.archetypes
export const CATALOGUE_IS_PLACEHOLDER = data.placeholder === true

export const archetypeBySlug = (slug: string) => CATALOGUE.find(a => a.slug === slug)

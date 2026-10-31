import raw from './map.json'
import type { Space } from '../engine/mapLayout'

export interface MapLayout {
  coords: number[][]
  /** Kruskal stress-1 against the symmetrised quiz distance. */
  stress: number
  /** Share of each point's 3 true nearest that are also its 3 nearest in the layout. */
  knn3: number
  /** Joint layouts only: stress over ideal–ideal and now–now pairs. */
  stressIdeal?: number
  stressNow?: number
}

export interface MapData {
  version: number
  inputHash: string
  slugs: string[]
  layouts: Record<`${Space}-${2 | 3}`, MapLayout>
}

/** Precomputed layouts (scripts/map-layout.ts): catalogue order; joint = 48 ideal then 48 here-and-now. */
export const MAP = raw as unknown as MapData

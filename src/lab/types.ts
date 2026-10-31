import type { Palette } from './palettes'

/**
 * Contract for a lab prototype. Each prototype lives in
 * src/lab/protos/<id>/index.tsx and is discovered automatically:
 *
 *   export const meta: ProtoMeta = { name, tagline, ideas: [...] }
 *   export const options: ProtoOption[] = [...]   // optional toggles
 *   export default function MyProto(props: ProtoProps) { ... }
 *
 * Folders starting with "_" (e.g. _example) sort last.
 */
export type LabMode = 'hero' | 'answer'

export interface ProtoProps {
  /** "hero": landing-page demo of how the grid works (may animate).
   *  "answer": simulate answering `statement` — click a cell to pick it, show a readout. */
  mode: LabMode
  palette: Palette
  statement: string
  /** "small" is used by the side-by-side comparison view. Default "full". */
  size?: 'full' | 'small'
  /** Current value of each toggle the prototype exports in `options` (absent = no options). */
  options?: Record<string, boolean>
}

/** A per-prototype toggle. The lab renders it as a checkbox and keeps it in the hash (`&o=id` on, `&o=-id` off). */
export interface ProtoOption {
  /** Stable slug, unique within the prototype; used as the hash value. */
  id: string
  label: string
  default: boolean
  /** Tooltip: what the toggle changes. */
  title?: string
}

export interface ProtoIdea {
  /** Stable slug, unique within the prototype. Shown in the lab as "Idea <letter><n>". */
  id: string
  title: string
  detail: string
}

export interface ProtoMeta {
  name: string
  tagline: string
  ideas: ProtoIdea[]
}

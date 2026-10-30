export const AXIS_IDS = ['fed', 'dem', 'lib', 'col', 'pla', 'glo', 'int', 'mil', 'mul', 'rel', 'pro', 'tec'] as const
export type AxisId = (typeof AXIS_IDS)[number]

export const GROUPS = {
  governance: ['fed', 'dem', 'lib'],
  economy: ['col', 'pla', 'glo'],
  world: ['int', 'mil', 'mul'],
  culture: ['rel', 'pro', 'tec'],
} as const satisfies Record<string, readonly AxisId[]>
export type GroupId = keyof typeof GROUPS

export type Key = 1 | -1
export type Tier = 'quick' | 'standard' | 'full'
export type Mode = Tier
export const MODES: readonly Mode[] = ['quick', 'standard', 'full']

export interface Item {
  id: string
  axis: AxisId
  key: Key
  facet: string
  form: 'rule' | 'conditional'
  level: 2 | 3
  text: string
  note?: string
  tier: Tier
}

/** A single-frame answer: −3 (strongly disagree) … +3 (strongly agree), or null = passed. */
export type Answer = -3 | -2 | -1 | 0 | 1 | 2 | 3 | null

export const CHIPS = [
  'crisis',
  'conditions',
  'distrust',
  'past-wrongs',
  'step',
  'abuse',
  'acceptance',
  'culture',
  'afford',
  'not-state',
  'not-apply',
  'other',
] as const
export type ChipId = (typeof CHIPS)[number]

export interface ItemAnswer {
  /** Ideal-system answer. */
  i: Answer
  /** Here-and-now answer. */
  n: Answer
  chip?: ChipId
  input?: 'grid' | 'rows'
}

export type Answers = Record<string, ItemAnswer>
export type Frame = 'I' | 'N'
export type AxisVec = Record<AxisId, number | null>

export interface AxisScore {
  /** −100…+100 toward the + pole, or null when coverage fails. */
  score: number | null
  /** Within-person standard error on the same scale (clamped to 100). */
  se: number | null
  n: number
  nPlus: number
  nMinus: number
}

export interface AxisGap {
  /** Paired-item gap Now − Ideal on the −200…+200 scale, or null. */
  g: number | null
  nPaired: number
  /** Paired items whose keyed Δ has the same sign as g. */
  agree: number
  notable: boolean
}

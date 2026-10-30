import type { ChipId } from '../engine/types'

/** Reason chips (spec §3.4): why an answer differs between the two frames. */
export const CHIP_LABELS: Record<ChipId, string> = {
  crisis: 'Crisis here',
  conditions: 'Conditions here aren’t right',
  distrust: 'Can’t trust those in charge',
  'past-wrongs': 'Fixing past wrongs',
  step: 'A step toward the goal',
  abuse: 'Others would abuse it',
  acceptance: 'People here wouldn’t accept it',
  culture: 'Doesn’t fit our culture',
  afford: 'Can’t afford it here',
  'not-state': 'Not the state’s role here',
  'not-apply': 'Doesn’t apply here',
  other: 'Other',
}

import type { Answer } from '../engine/types'

export const VALUES = [-3, -2, -1, 0, 1, 2, 3] as const

export const LABEL: Record<(typeof VALUES)[number], string> = {
  [-3]: 'Strongly disagree',
  [-2]: 'Disagree',
  [-1]: 'Slightly disagree',
  0: 'Neutral / torn',
  1: 'Slightly agree',
  2: 'Agree',
  3: 'Strongly agree',
}

export const label = (a: Answer) => (a === null ? 'Passed' : LABEL[a])

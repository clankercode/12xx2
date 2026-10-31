import type { Answers } from '../engine/types'

/**
 * Version of the red-line wording a saved run's answers were given to. 1 = as launched on 2026-10-31;
 * 2 = red-10 narrowed to "peaceful political opponents" (docs/content-v2.md). Bump it, and extend
 * `migrateAnswers`, whenever a red line's wording changes what an existing answer means.
 */
export const RED_WORDING = 2

/**
 * Brings answers given to older red-line wording up to date. Red-10 used to say "political opponents
 * … if they threaten the nation", which some read as genuine threats of violence. Disagreeing with that
 * still means disagreeing with the narrower "peaceful" wording, but agreeing with it doesn't mean agreeing
 * with the new one, so agree answers are dropped frame by frame; a statement left with neither frame is
 * removed, so it shows as not answered rather than passed.
 */
export function migrateAnswers(answers: Answers, from: number): Answers {
  if (from >= RED_WORDING) return answers
  const a = answers['red-10']
  if (!a) return answers
  const i = a.i !== null && a.i > 0 ? null : a.i
  const n = a.n !== null && a.n > 0 ? null : a.n
  if (i === a.i && n === a.n) return answers
  const out = { ...answers }
  if (i === null && n === null) delete out['red-10']
  else out['red-10'] = { ...a, i, n }
  return out
}

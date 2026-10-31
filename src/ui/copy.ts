import type { GapType } from '../engine/typology'
import type { MatchLabel, StabilityLabel } from '../engine/match'
import { sameInBothFrames, type FitSet, type Hero, type Results, type RgBand } from '../engine/results'

export const REPO_URL = 'https://github.com/clankercode/12xx2'

/** A prefilled GitHub issue for one statement. Carries the statement only, never the person's answers. */
export function reportStatementUrl(id: string, text: string): string {
  const title = `Statement ${id}: `
  const body = `**Statement ${id}:** ${text}\n\n**What's wrong with it?** (loaded, unclear, assumes something, doesn't fit its axis, other)\n\n`
  return `${REPO_URL}/issues/new?labels=statement&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`
}

/** A prefilled GitHub issue for disputing a core commitment. Carries no answers. */
export const REPORT_COMMITMENT_URL = `${REPO_URL}/issues/new?labels=commitment&title=${encodeURIComponent('Commitment: ')}`

export const MATCH_LABEL: Record<MatchLabel, string> = {
  'very-close': 'Very close',
  close: 'Close',
  loose: 'Loosely similar',
  none: 'No close match — nearest shown',
}

export const STABILITY_LABEL: Record<StabilityLabel, string> = {
  stable: 'stable',
  'fairly-stable': 'fairly stable',
  'toss-up': 'toss-up',
}

export const RG_BAND: Record<RgBand, string> = {
  'very-constant': 'Very constant',
  'mostly-constant': 'Mostly constant',
  'often-splits': 'Often splits',
  'splits-a-lot': 'Splits a lot',
}

export const GAP_TYPE: Record<GapType, { name: string; text: string }> = {
  'away-from-settled': {
    name: 'Away from a settled ideal',
    text: 'You see your country as already near your ideal on this axis, yet here and now you would move it away — the pattern of emergency measures and temporary exceptions.',
  },
  'status-quo': {
    name: 'At the status quo',
    text: 'Your ideal is elsewhere, but here and now you would keep things roughly where they are.',
  },
  partway: {
    name: 'Partway toward your ideal',
    text: 'Here and now you would move from where things are toward your ideal, but not all the way.',
  },
  beyond: {
    name: 'Beyond your ideal',
    text: 'Here and now you would go further than your ideal — a temporary over-correction, as with remedies for past wrongs.',
  },
  opposite: {
    name: 'Opposite direction',
    text: 'Here and now you would move away from your ideal, against the direction it points — the logic of transitional programmes and second-best fixes, such as protecting young industries before opening trade.',
  },
  unclear: {
    name: 'Direction unclear',
    text: 'The gap is real, but where it points relative to your country is within the uncertainty of your answers.',
  },
}

export const MODE_NAME = { quick: 'Quick', standard: 'Standard', full: 'Full' } as const

/** What the distance band means, as a measurement (never a verdict on its own). */
export const DISTANCE_BAND: Record<MatchLabel, string> = {
  'very-close': 'as close as the median simulated adherent',
  close: 'as close as 80% of simulated adherents',
  loose: 'as close as 95% of simulated adherents',
  none: 'further than 95% of simulated adherents',
}

/** Said whenever a fit set holds more than one ideology. */
export const CANT_TELL = 'this test can’t tell them apart'

/** The fit set as names, nearest first: "A", "A and B", "A, B and C", or "A, B, C and 4 more". */
export function fitNames(f: FitSet, max = 3): string {
  const names = f.fits.map(m => m.arch.name)
  if (names.length <= max) return names.length < 2 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
  return `${names.slice(0, max).join(', ')} and ${names.length - max} more`
}

/** One frame's headline: its fit set, or "No close match" when it is empty. */
export function fitTitle(f: FitSet): string {
  return f.fits.length ? fitNames(f) : 'No close match'
}

/** The nearest ideology as a labelled measurement, for a frame that fits nothing (cards, compare, short notes). */
export function nearestNote(f: FitSet): string {
  if (!f.nearest) return 'Every listed ideology is ruled out'
  return `Nearest: ${f.nearest.arch.name}, but ${f.nearest.label === 'none' ? 'not close' : 'not named (sensitive ideologies need to be very close)'}`
}

/** The nearest ideology's distance and band beside the "fits" cut: a measurement, with the breakpoint that decides. */
export function distanceNote(f: FitSet, loose: number): string {
  if (!f.nearest) return 'every listed ideology is ruled out by a core commitment'
  const m = f.nearest
  return `nearest is ${m.arch.name} at distance ${m.d.toFixed(3)} (${DISTANCE_BAND[m.label]}; “fits” means ${loose.toFixed(3)} or less)`
}

/** Why an empty fit set names nobody. */
export function noFitNote(f: FitSet, who = 'You'): string {
  const you = who === 'You'
  if (!f.nearest) return `${you ? 'You contradict' : 'These answers contradict'} a core commitment of every listed ideology.`
  const far = `${you ? 'You sit' : 'These answers sit'} further from every listed ideology than 95% of simulated adherents sit from their own`
  if (f.ruledOutInRange.length)
    return `Every ideology close enough to fit is ruled out by a core commitment; the rest sit further away than 95% of simulated adherents sit from their own. None is named as ${you ? 'your' : 'their'} match.`
  if (f.heldBack.length) return `The only ideologies close enough are sensitive ones, which are named only when very close. None is named as ${you ? 'your' : 'their'} match.`
  return `${far}, so none is named as ${you ? 'your' : 'their'} match.`
}

/** The sentence under a "constant" headline: "the same" only when both frames fit exactly the same ideologies. */
export function constantNote(h: Extract<Hero, { kind: 'constant' }>, who = 'You'): string {
  const you = who === 'You'
  if (!h.now) return 'Not enough here-and-now answers to place that frame.'
  if (!sameInBothFrames(h))
    return `Here and now ${you ? 'you fit' : 'these answers fit'} ${fitNames(h.now)}. The two frames share at least one ideology, so it isn’t a split.`
  return `${you ? 'Your' : 'Their'} ideal and here-and-now answers fit the same ${h.ideal.fits.length > 1 ? 'ideologies' : 'ideology'}.`
}

/** The headline as one line of text, e.g. "Georgism → Social liberalism" or "Anarcho-communism and Anarcho-syndicalism". */
export function heroName(r: Results): string {
  const h = r.hero
  if (h.kind === 'split') return `${fitNames(h.ideal)} → ${fitTitle(h.now)}`
  if (h.kind === 'constant') return fitNames(h.ideal)
  if (h.kind === 'no-fit') return 'No close match'
  return 'No reliable match'
}

import type { GapType } from '../engine/typology'
import type { MatchLabel, StabilityLabel } from '../engine/match'
import { nameable, sameInBothFrames, type Hero, type HeroPick, type Results, type RgBand } from '../engine/results'

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

/** Headline for a pick that fails the naming breakpoint: too far from everything, or a toss-up. */
export function noMatchTitle(p: HeroPick): string {
  return p.match.label === 'none' ? 'No close match' : 'No clear match'
}

/** The nearest ideology as a labelled measurement, for a pick that fails the naming breakpoint. */
export function nearestNote(p: HeroPick): string {
  return `Nearest: ${p.match.arch.name}, but ${p.match.label === 'none' ? 'not close' : 'others are about as close'}`
}

/** Why a no-close headline names nobody. */
export function noCloseNote(p: HeroPick, who = 'You'): string {
  const you = who === 'You'
  return p.match.label === 'none'
    ? `${you ? 'You sit' : 'These answers sit'} further from every listed ideology than 95% of simulated adherents sit from their own, so none is named as ${you ? 'your' : 'their'} match.`
    : `Other ideologies are about as close, and ${you ? 'your' : 'these'} answers can’t separate them, so none is named as ${you ? 'your' : 'their'} match.`
}

/** The sentence under a "Constant" headline: "same ideology" only when both frames' nearest matches are the same. */
export function constantNote(h: Extract<Hero, { kind: 'constant' }>, who = 'You'): string {
  const you = who === 'You'
  if (h.nowMissing) return 'Not enough here-and-now answers to place that frame.'
  if (!sameInBothFrames(h) && h.leaning)
    return `Here and now ${you ? 'you lean' : 'these answers lean'} toward ${h.leaning.match.arch.name}, but not by enough to call it a split.`
  return `${you ? 'Your' : 'Their'} ideal and here-and-now answers sit closest to the same ideology.`
}

/** The ideology's name when it passes the naming breakpoint, otherwise "No close match" or "No clear match". */
export function pickTitle(p: HeroPick): string {
  return nameable(p) ? p.match.arch.name : noMatchTitle(p)
}

/** The headline as one line of text, e.g. "Georgism → Social liberalism". */
export function heroName(r: Results): string {
  const h = r.hero
  if (h.kind === 'split') return `${h.ideal.match.arch.name} → ${pickTitle(h.now)}`
  if (h.kind === 'constant') return h.ideal.match.arch.name
  if (h.kind === 'no-close') return noMatchTitle(h.nearest)
  if (h.kind === 'none-fit') return 'No listed ideology fits'
  return 'No reliable match'
}

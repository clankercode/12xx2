import type { GapType } from '../engine/typology'
import type { MatchLabel, StabilityLabel } from '../engine/match'
import type { RgBand } from '../engine/results'

export const REPO_URL = 'https://github.com/clankercode/12xx2'

/** A prefilled GitHub issue for one statement. Carries the statement only, never the person's answers. */
export function reportStatementUrl(id: string, text: string): string {
  const title = `Statement ${id}: `
  const body = `**Statement ${id}:** ${text}\n\n**What's wrong with it?** (loaded, unclear, assumes something, doesn't fit its axis, other)\n\n`
  return `${REPO_URL}/issues/new?labels=statement&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`
}

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

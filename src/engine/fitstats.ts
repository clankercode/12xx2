import type { Mode } from './types'

/** Fit-set headline diagnostics written by scripts/calibrate.ts (report.fitSet) and quoted on the method page. */
export interface FitStatsRow {
  /** Share of respondents whose ideal-frame fit set contains their own ideology (adherents only). */
  ownInFit?: number
  /** Mean ideal-frame fit-set size, over respondents who get a fit set at all (not careless, enough answers). */
  meanSize: number
  /** Share with an empty ideal-frame fit set ("No close match"). */
  empty: number
  /** Share with exactly one ideology in the ideal-frame fit set. */
  one: number
  /** Share with more than 3 ("A, B, C and N more"). */
  overThree: number
  /** Share whose headline names at least one ideology (constant or split). */
  named: number
  n: number
}

export interface FitStats {
  /** Simulated sincere adherents of every catalogue ideology (coders' sheets, both frames). */
  adherents: Record<Mode, FitStatsRow>
  /** Latent respondents: uniform positions on every axis, uncorrelated (overstates distance). */
  typical: Record<Mode, FitStatsRow>
  /** Uniform random clickers. */
  random: Record<Mode, FitStatsRow>
  perArchetype: number
}

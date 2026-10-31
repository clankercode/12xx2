import { CHIPS, MODES, type Answer, type Answers, type AxisId, type ChipId, type Mode } from '../engine/types'
import { AXIS_IDS } from '../engine/types'
import { FORMAT } from '../engine/payload'
import { ALL_ITEMS, askedIdsForMode } from '../data/items'
import { RED_IDS } from '../data/redlines'
import { SC_ITEMS } from '../data/sc'
import { COUNTRY_CODES } from '../data/countries'
import { CATALOGUE_VERSION } from '../data/archetypes'
import { CALIBRATION } from '../data/calibration'
import { EMPTY, type Session } from './session'

/**
 * Every finished run is kept on this device with its raw answers, so a later visit can show how
 * answers changed and re-score old runs when the method changes. Nothing here is ever sent anywhere.
 */
export interface Run {
  id: string
  /** ISO time the person reached their results (updated if they edit and finish again). */
  finishedAt: string
  mode: Mode
  input: 'grid' | 'rows'
  answers: Answers
  sc: Record<string, Answer>
  country: string | null
  q: Partial<Record<AxisId, number | null>>
  /** Versions the run was first scored with; a mismatch with the current build means it is re-scored. */
  method: { format: number; catalogue: number; calibration: number; headline?: number }
  /** What the results page said when the run finished, kept verbatim for comparison after re-scoring. */
  snapshot: { headline: string }
  /** Set when the run came in through import rather than being taken here. */
  imported?: boolean
}

export const HISTORY_KEY = '12xx2.history.v1'
/** About 4 KB per run, so 200 runs stay well inside the ~5 MB localStorage budget. */
export const MAX_RUNS = 200
export const EXPORT_KIND = '12xx2-export'

/** Axis items and red lines: both are answers a run keeps. */
const ITEM_IDS = new Set([...ALL_ITEMS.map(it => it.id), ...RED_IDS])
const SC_IDS = new Set(SC_ITEMS.map(it => it.id))
const COUNTRIES = new Set<string>(COUNTRY_CODES)

export function newRunId(): string {
  const b = new Uint8Array(8)
  crypto.getRandomValues(b)
  return Array.from(b, x => x.toString(16).padStart(2, '0')).join('')
}

/**
 * The headline rule's version: 1 = nearest ideology behind a margin and stability gate, 2 = fit sets
 * (docs/method/fit-set.md). Bump it whenever the rule that names ideologies changes, so saved runs
 * show "Before the method changed it said" rather than "When you finished it said".
 */
export const HEADLINE_RULE = 2

/** The method versions this build scores with. */
export const CURRENT_METHOD = () => ({ format: FORMAT, catalogue: CATALOGUE_VERSION, calibration: CALIBRATION.version, headline: HEADLINE_RULE })

export const sameMethod = (m: Run['method']) => {
  const c = CURRENT_METHOD()
  // Runs saved before the headline rule was versioned were scored under rule 1.
  return m.format === c.format && m.catalogue === c.catalogue && m.calibration === c.calibration && (m.headline ?? 1) === c.headline
}

/** The run record for a finished session. */
export function buildRun(s: Session, headline: string): Run | null {
  if (s.stage !== 'done' || !s.runId || !s.mode) return null
  // Only the mode's statements (and the red lines): a cancelled extension leaves extra answers in the session.
  const answers: Answers = {}
  for (const id of askedIdsForMode(s.mode)) if (s.answers[id]) answers[id] = s.answers[id]!
  return {
    id: s.runId,
    finishedAt: s.finishedAt ?? new Date().toISOString(),
    mode: s.mode,
    input: s.input,
    answers,
    sc: s.sc,
    country: s.country,
    q: s.q,
    method: CURRENT_METHOD(),
    snapshot: { headline },
  }
}

/** Newest first, one entry per id, capped. */
export function upsertRun(runs: readonly Run[], run: Run): Run[] {
  return [run, ...runs.filter(r => r.id !== run.id)].sort(byNewest).slice(0, MAX_RUNS)
}

const byNewest = (a: Run, b: Run) => b.finishedAt.localeCompare(a.finishedAt) || a.id.localeCompare(b.id)

/** Adds imported runs not already present (by id). */
export function mergeRuns(existing: readonly Run[], incoming: readonly Run[]): { runs: Run[]; added: number; skipped: number } {
  const have = new Set(existing.map(r => r.id))
  const fresh = incoming.filter(r => !have.has(r.id))
  const all = [...existing, ...fresh].sort(byNewest)
  return { runs: all.slice(0, MAX_RUNS), added: fresh.length, skipped: incoming.length - fresh.length }
}

/** A session that reproduces a run, for scoring it with the current method. */
export function runToSession(run: Run): Session {
  return { ...EMPTY, mode: run.mode, input: run.input, answers: run.answers, sc: run.sc, country: run.country, q: run.q, stage: 'done', save: false, runId: run.id }
}

// ---- validation (imports are untrusted files) ----

const isAnswer = (x: unknown): x is Answer => x === null || (Number.isInteger(x) && (x as number) >= -3 && (x as number) <= 3)
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)

function cleanAnswers(x: unknown): Answers | null {
  if (!isObj(x)) return null
  const out: Answers = {}
  for (const [id, a] of Object.entries(x)) {
    if (!ITEM_IDS.has(id) || !isObj(a) || !isAnswer(a.i) || !isAnswer(a.n)) return null
    const chip = typeof a.chip === 'string' && (CHIPS as readonly string[]).includes(a.chip) ? (a.chip as ChipId) : undefined
    const input = a.input === 'rows' ? 'rows' : a.input === 'grid' ? 'grid' : undefined
    out[id] = { i: a.i, n: a.n, ...(chip ? { chip } : {}), ...(input ? { input } : {}) }
  }
  return out
}

function cleanSc(x: unknown): Record<string, Answer> {
  const out: Record<string, Answer> = {}
  if (isObj(x)) for (const [id, v] of Object.entries(x)) if (SC_IDS.has(id) && isAnswer(v)) out[id] = v
  return out
}

function cleanQ(x: unknown): Partial<Record<AxisId, number | null>> {
  const out: Partial<Record<AxisId, number | null>> = {}
  if (isObj(x))
    for (const ax of AXIS_IDS) {
      const v = x[ax]
      if (v === null || (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 100)) out[ax] = v as number | null
    }
  return out
}

const cleanCountry = (x: unknown) => (typeof x === 'string' && COUNTRIES.has(x) ? x : null)
const isMode = (x: unknown): x is Mode => (MODES as readonly unknown[]).includes(x)
const cleanTime = (x: unknown, fallback: string) => (typeof x === 'string' && !Number.isNaN(Date.parse(x)) ? new Date(x).toISOString() : fallback)

export function cleanRun(x: unknown, now: string): Run | null {
  if (!isObj(x) || !isMode(x.mode)) return null
  const answers = cleanAnswers(x.answers)
  if (!answers || Object.keys(answers).length === 0) return null
  const m = isObj(x.method) ? x.method : {}
  const num = (v: unknown) => (Number.isInteger(v) ? (v as number) : 0)
  const snap = isObj(x.snapshot) && typeof x.snapshot.headline === 'string' ? x.snapshot.headline.slice(0, 200) : ''
  return {
    id: typeof x.id === 'string' && /^[0-9a-f]{8,32}$/.test(x.id) ? x.id : newRunId(),
    finishedAt: cleanTime(x.finishedAt, now),
    mode: x.mode,
    input: x.input === 'rows' ? 'rows' : 'grid',
    answers,
    sc: cleanSc(x.sc),
    country: cleanCountry(x.country),
    q: cleanQ(x.q),
    method: { format: num(m.format) || FORMAT, catalogue: num(m.catalogue), calibration: num(m.calibration), headline: num(m.headline) || 1 },
    snapshot: { headline: snap },
    ...(x.imported === true ? { imported: true } : {}),
  }
}

export interface ExportFile {
  tool: '12 Axes²'
  kind: typeof EXPORT_KIND
  v: 1
  exportedAt: string
  note: string
  runs: Run[]
}

export function exportFile(runs: readonly Run[], now: string): ExportFile {
  return {
    tool: '12 Axes²',
    kind: EXPORT_KIND,
    v: 1,
    exportedAt: now,
    note: 'Your 12 Axes² runs, with every answer. This file never leaves your device unless you send it.',
    runs: [...runs],
  }
}

export type ImportResult = { ok: true; runs: Run[] } | { ok: false; error: string }

/** Reads an export file, or the older single-result "Export my answers" file. */
export function parseImport(text: string, now: string): ImportResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'That file isn’t valid JSON.' }
  }
  if (!isObj(data)) return { ok: false, error: 'That file isn’t a 12 Axes² export.' }
  if (data.kind === EXPORT_KIND && Array.isArray(data.runs)) {
    const runs = data.runs.map(r => cleanRun(r, now)).filter((r): r is Run => r !== null)
    if (runs.length === 0 && data.runs.length > 0) return { ok: false, error: 'None of the runs in that file could be read.' }
    return { ok: true, runs: runs.map(r => ({ ...r, imported: true })) }
  }
  // Legacy: { tool, mode, answers, systemConfidence, statusQuo, country } from the first release.
  if (data.tool === '12 Axes²' && isMode(data.mode)) {
    const run = cleanRun({ mode: data.mode, answers: data.answers, sc: data.systemConfidence, q: data.statusQuo, country: data.country }, now)
    return run ? { ok: true, runs: [{ ...run, imported: true }] } : { ok: false, error: 'The answers in that file couldn’t be read.' }
  }
  return { ok: false, error: 'That file isn’t a 12 Axes² export.' }
}

// ---- storage (never let it break the app) ----

export function loadRuns(): Run[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const data = JSON.parse(raw) as { v?: number; runs?: unknown[] }
    if (data?.v !== 1 || !Array.isArray(data.runs)) return []
    const now = new Date().toISOString()
    return data.runs.map(r => cleanRun(r, now)).filter((r): r is Run => r !== null).sort(byNewest)
  } catch {
    return []
  }
}

/** Writes the list; on a full quota drops the oldest runs until it fits. Returns how many were dropped. */
export function storeRuns(runs: readonly Run[]): { ok: boolean; dropped: number } {
  let keep = [...runs]
  for (;;) {
    try {
      if (keep.length === 0) localStorage.removeItem(HISTORY_KEY)
      else localStorage.setItem(HISTORY_KEY, JSON.stringify({ v: 1, runs: keep }))
      return { ok: true, dropped: runs.length - keep.length }
    } catch {
      if (keep.length <= 1) return { ok: false, dropped: 0 }
      keep = keep.slice(0, Math.floor(keep.length * 0.9))
    }
  }
}

export function clearHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY)
  } catch {
    /* ignore */
  }
}

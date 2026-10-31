import type { Answer, Answers, AxisId, ChipId, ItemAnswer, Mode } from '../engine/types'
import { itemsForMode, longerModes } from '../data/items'

export interface Session {
  v: 1
  mode: Mode | null
  answers: Answers
  /** Index into the statements being asked (see quizItems): the whole mode, or only the added ones when extending. */
  index: number
  input: 'grid' | 'rows'
  sc: Record<string, Answer>
  country: string | null
  q: Partial<Record<AxisId, number | null>>
  stage: 'start' | 'quiz' | 'context' | 'place' | 'done'
  /** Persist progress to localStorage on this device. */
  save: boolean
  /** A shared result opened before taking the quiz, kept for the compare offer. */
  incoming: string | null
  /** Identifies this run in the on-device history; set when the run first reaches its results. */
  runId: string | null
  finishedAt: string | null
  /**
   * Set when a finished run is continued into a longer mode: the mode it had before. Only the
   * statements that mode lacked are asked, and the context steps are skipped. Kept after finishing.
   */
  extendFrom: Mode | null
}

export const EMPTY: Session = {
  v: 1,
  mode: null,
  answers: {},
  index: 0,
  input: 'grid',
  sc: {},
  country: null,
  q: {},
  stage: 'start',
  save: true,
  incoming: null,
  runId: null,
  finishedAt: null,
  extendFrom: null,
}

export type Action =
  | { type: 'start'; mode: Mode }
  | { type: 'answer'; id: string; answer: ItemAnswer; advance: boolean }
  | { type: 'chip'; id: string; chip: ChipId | undefined }
  | { type: 'goto'; index: number }
  | { type: 'input'; input: 'grid' | 'rows' }
  | { type: 'stage'; stage: Session['stage'] }
  | { type: 'sc'; id: string; answer: Answer }
  | { type: 'country'; country: string | null }
  | { type: 'q'; axis: AxisId; value: number | null }
  | { type: 'save'; save: boolean }
  | { type: 'incoming'; payload: string | null }
  | { type: 'finish'; at: string; runId: string }
  | { type: 'extend'; mode: Mode }
  | { type: 'cancelExtend' }
  | { type: 'reset' }

export function reduce(s: Session, a: Action): Session {
  switch (a.type) {
    case 'start':
      return { ...EMPTY, save: s.save, input: s.input, incoming: s.incoming, mode: a.mode, stage: 'quiz' }
    case 'answer':
      return { ...s, answers: { ...s.answers, [a.id]: a.answer }, index: a.advance ? s.index + 1 : s.index }
    case 'chip': {
      const prev = s.answers[a.id]
      if (!prev) return s
      return { ...s, answers: { ...s.answers, [a.id]: { ...prev, chip: a.chip } } }
    }
    case 'goto':
      return { ...s, index: Math.max(0, a.index) }
    case 'input':
      return { ...s, input: a.input }
    case 'stage':
      return { ...s, stage: a.stage }
    case 'sc':
      return { ...s, sc: { ...s.sc, [a.id]: a.answer } }
    case 'country':
      return { ...s, country: a.country }
    case 'q':
      return { ...s, q: { ...s.q, [a.axis]: a.value } }
    case 'save':
      return { ...s, save: a.save }
    case 'incoming':
      return { ...s, incoming: a.payload }
    case 'finish':
      // Finishing again after editing answers updates the same run rather than adding one.
      return { ...s, stage: 'done', finishedAt: a.at, runId: s.runId ?? a.runId }
    case 'extend':
      // Same run, same answers: only the statements the longer mode adds are asked.
      if (s.stage !== 'done' || !s.mode || !longerModes(s.mode).includes(a.mode)) return s
      return { ...s, mode: a.mode, extendFrom: s.mode, stage: 'quiz', index: 0 }
    case 'cancelExtend':
      // Back to the results as they were. Answers to added statements stay in the session (they are
      // offered again if the person continues later) but don't count towards the shorter mode.
      if (s.stage !== 'quiz' || !s.extendFrom) return s
      return { ...s, mode: s.extendFrom, extendFrom: null, stage: 'done', index: itemsForMode(s.extendFrom).length }
    case 'reset':
      return { ...EMPTY, input: s.input }
  }
}

/** How long after finishing a run can still be continued; later, views may have moved and a fresh run is better. */
export const EXTEND_WINDOW_MS = 24 * 60 * 60 * 1000

/** The longer modes a finished run can be continued into right now, with how many statements each adds. */
export function extendOptions(s: Session, now: number): { mode: Mode; added: number }[] {
  if (s.stage !== 'done' || !s.mode || !s.finishedAt) return []
  const age = now - Date.parse(s.finishedAt)
  if (!(age >= 0 && age <= EXTEND_WINDOW_MS)) return []
  const base = itemsForMode(s.mode).length
  return longerModes(s.mode).map(mode => ({ mode, added: itemsForMode(mode).length - base }))
}

const KEY = '12xx2.session.v1'
const INCOMING_KEY = '12xx2.incoming'

/** Storage can be missing or throw (private mode, blocked site data); never let it break the app. */
export function loadSession(): Session {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as Session
      if (s && s.v === 1) return { ...EMPTY, ...s, incoming: readIncoming() ?? s.incoming }
    }
  } catch {
    /* ignore */
  }
  return { ...EMPTY, incoming: readIncoming() }
}

export function persistSession(s: Session) {
  try {
    if (s.save) localStorage.setItem(KEY, JSON.stringify(s))
    else localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export function clearAllData() {
  try {
    localStorage.removeItem(KEY)
    localStorage.removeItem('12xx2.history.v1')
    sessionStorage.removeItem(INCOMING_KEY)
  } catch {
    /* ignore */
  }
}

function readIncoming(): string | null {
  try {
    return sessionStorage.getItem(INCOMING_KEY)
  } catch {
    return null
  }
}

export function stashIncoming(payload: string | null) {
  try {
    if (payload) sessionStorage.setItem(INCOMING_KEY, payload)
    else sessionStorage.removeItem(INCOMING_KEY)
  } catch {
    /* ignore */
  }
}

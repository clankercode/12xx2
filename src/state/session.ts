import type { Answer, Answers, AxisId, ChipId, ItemAnswer, Mode, Statement } from '../engine/types'
import { askedIdsForMode, longerModes, quizItems, unansweredRedLines } from '../data/items'

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
  /** 'review': a finished run's answers are being looked over and changed (see `review`). */
  stage: 'start' | 'quiz' | 'context' | 'place' | 'done' | 'review'
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
  /**
   * While extending: the red lines this extension asks, fixed when it starts (those the run had not
   * answered, e.g. a run from before red lines existed), so answering them never shifts `index`.
   */
  extendRed: string[] | null
  /**
   * While reviewing a finished run (stage 'review'): its answers and run id when the review began,
   * so finishing can tell whether anything changed and which run the edit came from.
   */
  review: { base: Answers; from: string | null } | null
  /** Set on a run that came from changing another run's answers after its results: that run's id. */
  editedFrom: string | null
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
  extendRed: null,
  review: null,
  editedFrom: null,
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
  | { type: 'review' }
  | { type: 'finishReview'; at: string; runId: string }
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
      return { ...s, mode: a.mode, extendFrom: s.mode, extendRed: unansweredRedLines(s.answers), stage: 'quiz', index: 0 }
    case 'cancelExtend':
      // Back to the results as they were. Answers to added statements stay in the session (they are
      // offered again if the person continues later) but don't count towards the shorter mode.
      if (s.stage !== 'quiz' || !s.extendFrom) return s
      return { ...s, mode: s.extendFrom, extendFrom: null, extendRed: null, stage: 'done', index: quizItems(s.extendFrom, null).length }
    case 'review':
      // Look over (and change) a finished run's answers; results and history wait until it's finished.
      if (s.stage !== 'done' || !s.mode) return s
      return { ...s, stage: 'review', review: { base: s.answers, from: s.runId }, index: 0 }
    case 'finishReview': {
      if (s.stage !== 'review' || !s.mode || !s.review) return s
      const end = { stage: 'done' as const, review: null, index: quizItems(s.mode, null).length }
      // Nothing changed: the same run as before, untouched (answers as they were, input styles included).
      if (sameAnswers(s.mode, s.review.base, s.answers)) return { ...s, ...end, answers: s.review.base }
      // Changed: a new run, linked to the one it came from, which stays in the history as it was.
      return { ...s, ...end, runId: a.runId, finishedAt: a.at, editedFrom: s.review.from }
    }
    case 'reset':
      return { ...EMPTY, input: s.input }
  }
}

/** Whether two answer sets give a run of `mode` the same answers (both frames and the reason; not how they were entered). */
export function sameAnswers(mode: Mode, a: Answers, b: Answers): boolean {
  return askedIdsForMode(mode).every(id => sameAnswer(a[id], b[id]))
}

/** One statement's answers are the same: both frames and the reason, however they were entered. */
export function sameAnswer(x: ItemAnswer | undefined, y: ItemAnswer | undefined): boolean {
  if (!x || !y) return !x === !y
  return x.i === y.i && x.n === y.n && (x.chip ?? null) === (y.chip ?? null)
}

/** The statements this session's quiz asks, in order (see quizItems); `index` points into it. */
export function sessionStatements(s: Session): Statement[] {
  if (!s.mode) return []
  // Reviewing goes over every statement the run asked, even one that was extended (extendFrom is kept).
  if (s.stage === 'review') return quizItems(s.mode, null)
  return quizItems(s.mode, s.extendFrom, s.extendFrom ? (s.extendRed ?? unansweredRedLines(s.answers)) : undefined)
}

/** How long after finishing a run can still be continued; later, views may have moved and a fresh run is better. */
export const EXTEND_WINDOW_MS = 24 * 60 * 60 * 1000

/** The longer modes a finished run can be continued into right now, with how many statements each adds. */
export function extendOptions(s: Session, now: number): { mode: Mode; added: number }[] {
  if (s.stage !== 'done' || !s.mode || !s.finishedAt) return []
  const age = now - Date.parse(s.finishedAt)
  if (!(age >= 0 && age <= EXTEND_WINDOW_MS)) return []
  const red = unansweredRedLines(s.answers)
  return longerModes(s.mode).map(mode => ({ mode, added: quizItems(mode, s.mode, red).length }))
}

const KEY = '12xx2.session.v1'
const INCOMING_KEY = '12xx2.incoming'

/** Storage can be missing or throw (private mode, blocked site data); never let it break the app. */
export function loadSession(): Session {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as Session
      if (s && s.v === 1) {
        const out: Session = { ...EMPTY, ...s, incoming: readIncoming() ?? s.incoming }
        // An extension saved before red lines existed: fix the red lines it asks now, once.
        if (out.extendFrom && out.stage === 'quiz' && !Array.isArray(s.extendRed)) out.extendRed = unansweredRedLines(out.answers)
        // A review with nothing to compare against can't be finished: back to the results as they are.
        if (out.stage === 'review' && !out.review?.base) out.stage = 'done'
        return out
      }
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

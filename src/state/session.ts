import type { Answer, Answers, AxisId, ChipId, ItemAnswer, Mode } from '../engine/types'

export interface Session {
  v: 1
  mode: Mode | null
  answers: Answers
  /** Index into the ordered item list for the current mode. */
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
    case 'reset':
      return { ...EMPTY, input: s.input }
  }
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

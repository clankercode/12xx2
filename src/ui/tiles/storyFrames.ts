import type { V } from '../answer'

/** Grid index helpers: column k = ideal (−3 → +3), row k = now (+3 → −3). */
export const colOf = (i: V) => i + 3
export const rowOf = (n: V) => 3 - n

export type Half = 'now' | 'ideal'

export interface Persona {
  id: 'a' | 'b'
  /** Short letter drawn on the pin. */
  pin: string
  who: string
  i: V
  n: V
}

export const PERSONAS: Record<'a' | 'b', Persona> = {
  a: { id: 'a', pin: 'A', who: 'Someone in a country where the rich bought the courts', i: 1, n: 3 },
  b: { id: 'b', pin: 'B', who: 'Someone in a well-run democracy', i: 1, n: -1 },
}

/** Where a persona's ring sits in a frame (null = hidden), and whether it is ghosted. */
interface Pin {
  i: V
  n: V
  ghost?: boolean
}

export interface Frame {
  id: string
  ms: number
  kicker: string
  persona?: Persona
  title: string
  body: string
  /** Lit band: a whole column (ideal phase), a row (now phase), or nothing. */
  band?: { kind: 'col'; i: V; half: Half | 'both' } | { kind: 'row'; n: V; half: Half }
  a?: Pin
  b?: Pin
  /** Readout rows shown in the caption card. */
  reading?: { half: Half; v: V }[]
  axes?: boolean
  gap?: boolean
}

const A = PERSONAS.a
const B = PERSONAS.b

export const FRAMES: Frame[] = [
  {
    id: 'intro',
    ms: 4200,
    kicker: 'How answering works',
    title: 'One statement, two answers.',
    body: 'Left to right is your ideal system. Bottom to top is here and now, where you live. One square holds both answers.',
    axes: true,
  },
  {
    id: 'a-ideal',
    ms: 3000,
    kicker: 'Person A',
    persona: A,
    title: 'Ideally: slightly agree.',
    body: 'In a fair system, wealth that was earned honestly is mostly fine. Share out a little, not much.',
    band: { kind: 'col', i: A.i, half: 'ideal' },
    a: { i: A.i, n: 0 },
    reading: [{ half: 'ideal', v: A.i }],
  },
  {
    id: 'a-now',
    ms: 4200,
    kicker: 'Person A',
    persona: A,
    title: 'Here and now: strongly agree.',
    body: 'Where she lives, that wealth bought the judges too. Sharing it out is the only check left.',
    band: { kind: 'row', n: A.n, half: 'now' },
    a: { i: A.i, n: A.n },
    reading: [
      { half: 'now', v: A.n },
      { half: 'ideal', v: A.i },
    ],
  },
  {
    id: 'b-ideal',
    ms: 3200,
    kicker: 'Person B',
    persona: B,
    title: 'Ideally: slightly agree. Same column.',
    body: 'He holds exactly the same ideal she does.',
    band: { kind: 'col', i: B.i, half: 'ideal' },
    a: { i: A.i, n: A.n, ghost: true },
    b: { i: B.i, n: 0 },
    reading: [{ half: 'ideal', v: B.i }],
  },
  {
    id: 'b-now',
    ms: 4200,
    kicker: 'Person B',
    persona: B,
    title: 'Here and now: slightly disagree.',
    body: 'His country already taxes and shares fairly. Pushing harder now would overshoot.',
    band: { kind: 'row', n: B.n, half: 'now' },
    a: { i: A.i, n: A.n, ghost: true },
    b: { i: B.i, n: B.n },
    reading: [
      { half: 'now', v: B.n },
      { half: 'ideal', v: B.i },
    ],
  },
  {
    id: 'gap',
    ms: 6000,
    kicker: 'The gap',
    title: 'Same ideal. Different here and now.',
    body: 'A one-answer quiz would file them on opposite sides. 12 Axes² sees the shared ideal and measures the gap.',
    band: { kind: 'col', i: A.i, half: 'both' },
    a: { i: A.i, n: A.n },
    b: { i: B.i, n: B.n },
    gap: true,
  },
]

export const HALF_NAME: Record<Half, string> = { now: 'Here and now', ideal: 'Ideal system' }

/** Plain-language verdict for any cell, built from the two signs (Max's corner meanings). */
export function verdict(i: V, n: V): { emoji: string; text: string } {
  const si = Math.sign(i)
  const sn = Math.sign(n)
  if (si > 0 && sn > 0) return { emoji: '👍', text: 'Good ideally, and good here and now.' }
  if (si < 0 && sn > 0) return { emoji: '🩹', text: 'An ideal system wouldn’t do it, but it’s needed here and now.' }
  if (si > 0 && sn < 0) return { emoji: '⏳', text: 'Good in an ideal system, but bad for us here and now.' }
  if (si < 0 && sn < 0) return { emoji: '👎', text: 'Bad in every case.' }
  if (si === 0 && sn === 0) return { emoji: '⚖️', text: 'Neutral or torn, both ideally and here and now.' }
  if (si === 0) return { emoji: '⚖️', text: sn > 0 ? 'Needed here and now; torn about the ideal.' : 'Bad for us here and now; torn about the ideal.' }
  return { emoji: '⚖️', text: si > 0 ? 'Good in an ideal system; torn about here and now.' : 'Wrong in an ideal system; torn about here and now.' }
}

/** Corner tags: the four meanings at the four corners, plus the centre. */
export const TAGS = [
  { id: 'tl', emoji: '🩹', text: 'Needed now, not ideally', si: -1, sn: 1 },
  { id: 'tr', emoji: '👍', text: 'Good now, good ideally', si: 1, sn: 1 },
  { id: 'bl', emoji: '👎', text: 'Bad every time', si: -1, sn: -1 },
  { id: 'br', emoji: '⏳', text: 'Ideal, but not for us now', si: 1, sn: -1 },
] as const

export type TagId = (typeof TAGS)[number]['id']

export function quadrant(i: V, n: V): TagId | null {
  if (i === 0 || n === 0) return null
  return `${n > 0 ? 't' : 'b'}${i > 0 ? 'r' : 'l'}` as TagId
}

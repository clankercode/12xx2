import { AXIS_IDS, MODES, type AxisId, type Mode, type RedCode } from './types'
import { fnv1a } from './prng'
import type { Profile } from './score'

/**
 * The shareable result: scores only, never answers (spec §6.1). Both the
 * owner's results page and a shared view are derived from this quantised form,
 * so they always render identically.
 */
export interface Payload {
  format: number
  /** Method/catalogue version the labels were computed with. */
  catalogue: number
  mode: Mode
  input: 'grid' | 'rows'
  careless: boolean
  answered: number
  total: number
  /** −100…100 integers, null = not enough answers. */
  I: (number | null)[]
  N: (number | null)[]
  /** Half-band widths, quantised to steps of SE_STEP. */
  seI: (number | null)[]
  seN: (number | null)[]
  /** Paired gap, −200…200 in steps of 2. */
  G: (number | null)[]
  notable: boolean[]
  rg: number | null
  /** Optional, off by default on share. */
  q?: (number | null)[]
  sc?: { score: number; se: number }
  country?: string
  /** The owner opted in to naming a sensitive ideology when sharing (spec §2.6). */
  sensitiveOk?: boolean
  /**
   * Catalogue-order indices (ascending, for this payload's catalogue version) of ideologies the
   * owner's answers rule out via a core commitment. Absent = no rule-outs known.
   */
  ruledOut?: number[]
  /**
   * Where the owner stands on each red-line statement (red.json order), per frame, as a RedCode.
   * Reveals those answers, so it is only ever shared on an explicit opt-in. Absent = not shared.
   */
  red?: { i: RedCode; n: RedCode }[]
}

/**
 * Newest format this build reads. Format 2 = format 1 plus a ruled-out bitmask. Format 3 = format 2
 * plus a red-line block (where the owner stands on each red line; a ruled-out length of 0 means none).
 * Each is written only when needed, so links without rule-outs stay format 1 and links without the
 * opt-in red-line block stay byte-identical to format 1 or 2.
 */
export const FORMAT = 3
export const SE_STEP = 7
const NULL = 255
const TERMINATOR = 'Z'

const clampInt = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(x)))
const qScore = (x: number | null) => (x === null ? null : clampInt(x, -100, 100))
const qSe = (x: number | null) => (x === null ? null : clampInt(x / SE_STEP, 0, 15) * SE_STEP)
const qGap = (x: number | null) => (x === null ? null : clampInt(x / 2, -100, 100) * 2)
const MAX_RULED_OUT_BYTES = 32
/** Most red lines a link may carry (room to add statements; 10 today). */
export const MAX_RED_LINES = 32

/** The lowest format that can carry this payload. */
export const formatFor = (p: Pick<Payload, 'ruledOut' | 'red'>) => (p.red?.length ? 3 : p.ruledOut?.length ? 2 : 1)

export function profileToPayload(
  p: Profile,
  opts: {
    catalogue: number
    mode: Mode
    input: 'grid' | 'rows'
    q?: (number | null)[]
    sc?: { score: number; se: number }
    country?: string
    ruledOut?: readonly number[]
    red?: readonly { i: RedCode; n: RedCode }[]
  },
): Payload {
  const pick = <T>(f: (ax: AxisId) => T) => AXIS_IDS.map(f)
  const ruledOut = opts.ruledOut?.length ? [...new Set(opts.ruledOut)].sort((a, b) => a - b) : undefined
  const red = opts.red?.length ? opts.red.slice(0, MAX_RED_LINES).map(x => ({ i: x.i, n: x.n })) : undefined
  return {
    format: formatFor({ ruledOut, red }),
    catalogue: opts.catalogue,
    mode: opts.mode,
    input: opts.input,
    careless: p.careless,
    answered: Math.min(255, p.answered),
    total: Math.min(255, p.total),
    I: pick(a => qScore(p.I[a].score)),
    N: pick(a => qScore(p.N[a].score)),
    seI: pick(a => qSe(p.I[a].se)),
    seN: pick(a => qSe(p.N[a].se)),
    G: pick(a => qGap(p.gaps[a].g)),
    notable: pick(a => p.gaps[a].notable),
    rg: p.rg.rg === null ? null : clampInt(p.rg.rg, 0, 100),
    q: opts.q?.map(qScore),
    sc: opts.sc && { score: clampInt(opts.sc.score, 0, 100), se: clampInt(opts.sc.se, 0, 100) },
    country: opts.country,
    ...(ruledOut && { ruledOut }),
    ...(red && { red }),
  }
}

/** Remove optional fields the user has not chosen to share. The red-line block needs `red: true`. */
export function forSharing(p: Payload, include: { q: boolean; sc: boolean; country: boolean; sensitive?: boolean; red?: boolean }): Payload {
  const out: Payload = { ...p }
  if (!include.red) delete out.red
  if (include.sensitive) out.sensitiveOk = true
  else delete out.sensitiveOk
  if (!include.q) delete out.q
  if (!include.sc) delete out.sc
  if (!include.country) delete out.country
  out.format = formatFor(out)
  return out
}

export function payloadBytes(p: Payload): Uint8Array {
  const b: number[] = [formatFor(p), p.catalogue]
  let flags = MODES.indexOf(p.mode) & 0b11
  if (p.input === 'rows') flags |= 1 << 2
  if (p.careless) flags |= 1 << 3
  if (p.q) flags |= 1 << 4
  if (p.sc) flags |= 1 << 5
  if (p.country) flags |= 1 << 6
  if (p.sensitiveOk) flags |= 1 << 7
  b.push(flags, p.answered, p.total)
  for (const v of p.I) b.push(v === null ? NULL : v + 100)
  for (const v of p.N) b.push(v === null ? NULL : v + 100)
  // Two 4-bit SE nibbles per axis byte: high = Ideal, low = Now; 15 + null flag via score null.
  for (let i = 0; i < 12; i++) {
    const a = p.seI[i] === null || p.seI[i] === undefined ? 0 : (p.seI[i] as number) / SE_STEP
    const c = p.seN[i] === null || p.seN[i] === undefined ? 0 : (p.seN[i] as number) / SE_STEP
    b.push(((a & 0xf) << 4) | (c & 0xf))
  }
  for (const v of p.G) b.push(v === null ? NULL : v / 2 + 100)
  let mask = 0
  p.notable.forEach((n, i) => {
    if (n) mask |= 1 << i
  })
  b.push(mask & 0xff, (mask >> 8) & 0xff)
  b.push(p.rg === null ? NULL : p.rg)
  if (p.q) for (const v of p.q) b.push(v === null ? NULL : v + 100)
  if (p.sc) b.push(p.sc.score, p.sc.se)
  if (p.country) b.push(p.country.charCodeAt(0), p.country.charCodeAt(1))
  const format = formatFor(p)
  if (p.ruledOut?.length) {
    // Format 2: [length L][L-byte bitmask], bit k = catalogue index k; minimal length.
    const mask = new Array<number>(Math.floor(Math.max(...p.ruledOut) / 8) + 1).fill(0)
    for (const k of p.ruledOut) mask[k >> 3]! |= 1 << (k & 7)
    b.push(mask.length, ...mask)
  } else if (format === 3) b.push(0)
  if (p.red?.length) {
    // Format 3: [count R][ceil(R/2) bytes]; one nibble per red line (high nibble first), each
    // nibble = ideal code << 2 | here-and-now code. An odd count leaves the last low nibble 0.
    const nib = p.red.map(x => ((x.i & 3) << 2) | (x.n & 3))
    b.push(nib.length)
    for (let k = 0; k < nib.length; k += 2) b.push((nib[k]! << 4) | (nib[k + 1] ?? 0))
  }
  const bytes = new Uint8Array(b)
  const out = new Uint8Array(bytes.length + 1)
  out.set(bytes)
  out[bytes.length] = fnv1a(bytes) & 0xff
  return out
}

function toBase64Url(bytes: Uint8Array): string {
  let s = ''
  for (const x of bytes) s += String.fromCharCode(x)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  return Uint8Array.from(bin, c => c.charCodeAt(0))
}

export function encodePayload(p: Payload): string {
  return toBase64Url(payloadBytes(p)) + TERMINATOR
}

export type DecodeError = 'empty' | 'truncated' | 'corrupt' | 'newer-version'

export type DecodeResult = { ok: true; payload: Payload } | { ok: false; error: DecodeError }

export function decodePayload(s: string): DecodeResult {
  if (!s) return { ok: false, error: 'empty' }
  if (!s.endsWith(TERMINATOR)) return { ok: false, error: 'truncated' }
  let bytes: Uint8Array
  try {
    bytes = fromBase64Url(s.slice(0, -1))
  } catch {
    return { ok: false, error: 'corrupt' }
  }
  if (bytes.length < 2) return { ok: false, error: 'truncated' }
  if (bytes[0]! > FORMAT) return { ok: false, error: 'newer-version' }
  const body = bytes.slice(0, -1)
  if ((fnv1a(body) & 0xff) !== bytes[bytes.length - 1]) return { ok: false, error: 'corrupt' }
  let o = 0
  const next = () => {
    if (o >= body.length) throw new Error('short')
    return body[o++]!
  }
  try {
    const format = next()
    const catalogue = next()
    const flags = next()
    const mode = MODES[flags & 0b11]
    if (!mode) return { ok: false, error: 'corrupt' }
    const answered = next()
    const total = next()
    const score = () => {
      const v = next()
      if (v === NULL) return null
      if (v > 200) throw new Error('range')
      return v - 100
    }
    const I = Array.from({ length: 12 }, score)
    const N = Array.from({ length: 12 }, score)
    const seI: (number | null)[] = []
    const seN: (number | null)[] = []
    for (let i = 0; i < 12; i++) {
      const v = next()
      seI.push(I[i] === null ? null : (v >> 4) * SE_STEP)
      seN.push(N[i] === null ? null : (v & 0xf) * SE_STEP)
    }
    const G = Array.from({ length: 12 }, () => {
      const v = next()
      if (v === NULL) return null
      if (v > 200) throw new Error('range')
      return (v - 100) * 2
    })
    const mask = next() | (next() << 8)
    if (mask >> 12) throw new Error('range')
    const notable = Array.from({ length: 12 }, (_, i) => (mask & (1 << i)) !== 0)
    const rgRaw = next()
    const rg = rgRaw === NULL ? null : rgRaw
    if (rg !== null && rg > 100) throw new Error('range')
    const p: Payload = {
      format,
      catalogue,
      mode,
      input: flags & (1 << 2) ? 'rows' : 'grid',
      careless: (flags & (1 << 3)) !== 0,
      answered,
      total,
      I,
      N,
      seI,
      seN,
      G,
      notable,
      rg,
    }
    if (flags & (1 << 4)) p.q = Array.from({ length: 12 }, score)
    if (flags & (1 << 5)) {
      const scScore = next()
      const scSe = next()
      if (scScore > 100 || scSe > 100) throw new Error('range')
      p.sc = { score: scScore, se: scSe }
    }
    if (flags & (1 << 6)) {
      const c = String.fromCharCode(next(), next())
      if (!/^[A-Z]{2}$/.test(c)) throw new Error('range')
      p.country = c
    }
    if (flags & (1 << 7)) p.sensitiveOk = true
    if (format === 0) throw new Error('range')
    if (format >= 2) {
      const len = next()
      // Format 2 is written only with rule-outs; format 3 writes 0 for "none".
      if ((len === 0 && format === 2) || len > MAX_RULED_OUT_BYTES) throw new Error('range')
      const ruledOut: number[] = []
      for (let j = 0; j < len; j++) {
        const v = next()
        // Canonical: the encoder never writes a trailing empty byte.
        if (j === len - 1 && v === 0) throw new Error('range')
        for (let bit = 0; bit < 8; bit++) if (v & (1 << bit)) ruledOut.push(j * 8 + bit)
      }
      if (len) p.ruledOut = ruledOut
    }
    if (format === 3) {
      const count = next()
      if (count === 0 || count > MAX_RED_LINES) throw new Error('range')
      const red: { i: RedCode; n: RedCode }[] = []
      for (let k = 0; k < count; k += 2) {
        const v = next()
        const both = [v >> 4, v & 0xf]
        // Canonical: an odd count leaves the padding nibble empty.
        if (k + 1 >= count && both[1] !== 0) throw new Error('range')
        for (const x of k + 1 < count ? both : both.slice(0, 1)) red.push({ i: ((x >> 2) & 3) as RedCode, n: (x & 3) as RedCode })
      }
      p.red = red
    }
    if (o !== body.length) return { ok: false, error: 'corrupt' }
    // Semantic invariants: a structurally valid but impossible result is treated as damaged.
    if (answered > total || total === 0) return { ok: false, error: 'corrupt' }
    for (let i = 0; i < 12; i++) {
      if (notable[i] && G[i] === null) return { ok: false, error: 'corrupt' }
    }
    return { ok: true, payload: p }
  } catch (e) {
    return { ok: false, error: (e as Error).message === 'short' ? 'truncated' : 'corrupt' }
  }
}

/** Seed for stability draws: identical for the owner and every viewer of the same link. */
export function payloadSeed(p: Payload): number {
  // Rule-outs are left out too, so adding commitments never reshuffles the draws themselves.
  // So is the red-line block: sharing it (or not) must not change anything else the viewer sees.
  return fnv1a(payloadBytes({ ...p, q: undefined, sc: undefined, country: undefined, ruledOut: undefined, red: undefined }))
}

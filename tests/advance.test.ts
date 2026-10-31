import { afterEach, describe, expect, it, vi } from 'vitest'
import { afterAnswer, nextFor, parseAutoAdvance } from '../src/ui/advance'

describe('auto-advance after an answer', () => {
  it('a fresh answer moves on with the setting on', () => {
    expect(afterAnswer({ auto: true, answeredBefore: false, big: false })).toEqual({ advance: true, afterChip: false })
  })

  it('editing an answered statement never moves on (either input mode)', () => {
    expect(afterAnswer({ auto: true, answeredBefore: true, big: false })).toEqual({ advance: false, afterChip: false })
    expect(afterAnswer({ auto: true, answeredBefore: true, big: true })).toEqual({ advance: false, afterChip: false })
  })

  it('with the setting off nothing moves on, fresh or not', () => {
    for (const answeredBefore of [false, true])
      for (const big of [false, true]) expect(afterAnswer({ auto: false, answeredBefore, big })).toEqual({ advance: false, afterChip: false })
  })

  it('a fresh big split waits for the optional reason chip', () => {
    expect(afterAnswer({ auto: true, answeredBefore: false, big: true })).toEqual({ advance: false, afterChip: true })
  })
})

describe('Next button', () => {
  it('is disabled until the statement is answered; Pass is the way past', () => {
    expect(nextFor(undefined, false, false)).toEqual({ enabled: false })
    expect(nextFor(undefined, true, false)).toEqual({ enabled: false })
  })

  it('is enabled for an answered or passed statement', () => {
    expect(nextFor({ i: 2, n: -1 }, false, false)).toEqual({ enabled: true })
    expect(nextFor({ i: null, n: null }, false, false)).toEqual({ enabled: true })
    expect(nextFor({ i: null, n: 2 }, true, false)).toEqual({ enabled: true })
  })

  it('keeps what is shown when one frame is ticked as passed over a two-frame answer', () => {
    expect(nextFor({ i: 2, n: -1 }, true, false)).toEqual({ enabled: true, commit: { i: null, n: -1 } })
    expect(nextFor({ i: 2, n: -1 }, false, true)).toEqual({ enabled: true, commit: { i: 2, n: null } })
    // Nothing shown in the remaining frame: answer it first.
    expect(nextFor({ i: null, n: null }, true, false)).toEqual({ enabled: false })
  })

  it('a one-frame answer with its pass unticked shows an empty grid, so Next waits', () => {
    expect(nextFor({ i: null, n: 2 }, false, false)).toEqual({ enabled: false })
  })

  it('both frames ticked passes the statement', () => {
    expect(nextFor(undefined, true, true)).toEqual({ enabled: true, pass: true })
  })
})

describe('auto-advance setting', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('defaults to on; only "0" turns it off', () => {
    expect(parseAutoAdvance(null)).toBe(true)
    expect(parseAutoAdvance('1')).toBe(true)
    expect(parseAutoAdvance('junk')).toBe(true)
    expect(parseAutoAdvance('0')).toBe(false)
  })

  it('is stored under 12xx2.autoAdvance and read back by a fresh page', async () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    })
    const first = await import('../src/ui/advance')
    expect(first.readAutoAdvance()).toBe(true)
    first.applyAutoAdvance(false)
    expect(store.get('12xx2.autoAdvance')).toBe('0')
    vi.resetModules()
    const reloaded = await import('../src/ui/advance')
    expect(reloaded.readAutoAdvance()).toBe(false)
  })

  it('blocked storage falls back to the default and keeps the choice for the page', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    })
    const m = await import('../src/ui/advance')
    expect(m.readAutoAdvance()).toBe(true)
    m.applyAutoAdvance(false)
    expect(m.readAutoAdvance()).toBe(false)
  })
})

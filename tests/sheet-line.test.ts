import { describe, expect, it } from 'vitest'
import { parseSheetLine } from '../scripts/sheet-line'

describe('coder sheet lines', () => {
  it('reads every answer form the coders wrote, including a leading +', () => {
    expect(parseSheetLine('Q012: +2, -1')).toEqual({ q: 'Q012', i: 2, n: -1 })
    expect(parseSheetLine('  Q007 | 3 | x ')).toEqual({ q: 'Q007', i: 3, n: null })
    expect(parseSheetLine('Q154 -3 0')).toEqual({ q: 'Q154', i: -3, n: 0 })
    expect(parseSheetLine('Q100: X, +3')).toEqual({ q: 'Q100', i: null, n: 3 })
    expect(parseSheetLine('Q001: 5, -9')).toEqual({ q: 'Q001', i: 3, n: -3 })
  })

  it('ignores anything that is not an answer line', () => {
    for (const l of ['BEGIN social-democracy', 'Q12: 1, 1', 'Q012: 1', 'Q012: 1, 1 because', '']) expect(parseSheetLine(l)).toBeNull()
  })
})

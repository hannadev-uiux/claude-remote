import { describe, expect, test } from 'vitest'
import { formatElapsed } from './timer'

describe('formatElapsed', () => {
  test('formats zero', () => {
    expect(formatElapsed(0)).toBe('0:00')
  })

  test('pads seconds under 10', () => {
    expect(formatElapsed(7_000)).toBe('0:07')
  })

  test('rolls over into minutes', () => {
    expect(formatElapsed(83_000)).toBe('1:23')
  })

  test('truncates partial seconds', () => {
    expect(formatElapsed(7_900)).toBe('0:07')
  })

  test('never goes negative', () => {
    expect(formatElapsed(-500)).toBe('0:00')
  })
})

import { describe, expect, test } from 'vitest'
import { formatElapsed, hasReachedMaxDuration, MAX_RECORDING_MS } from './timer'

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

describe('hasReachedMaxDuration', () => {
  test('false just under the cap, true at and past it', () => {
    expect(hasReachedMaxDuration(MAX_RECORDING_MS - 1)).toBe(false)
    expect(hasReachedMaxDuration(MAX_RECORDING_MS)).toBe(true)
    expect(hasReachedMaxDuration(MAX_RECORDING_MS + 1_000)).toBe(true)
  })
})

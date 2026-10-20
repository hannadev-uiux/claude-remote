import { expect, test } from 'vitest'
import { addStall, EMPTY_STALLS, STALL_MIN_MS, stallMs } from './stalls'

test('a tick that fires a second or more late is a stall', () => {
  expect(stallMs(1_000, 1_200)).toBe(0)
  expect(stallMs(1_000, 1_000 + STALL_MIN_MS - 1)).toBe(0)
  expect(stallMs(1_000, 2_000)).toBe(1_000)
  // A clock that jumps back never counts.
  expect(stallMs(1_000, 500)).toBe(0)
})

test('the summary counts stalls, long ones, the longest and the total', () => {
  let summary = addStall(EMPTY_STALLS, 0)
  expect(summary).toEqual(EMPTY_STALLS)
  summary = addStall(summary, 1_500)
  summary = addStall(summary, 6_000)
  expect(summary).toEqual({ stalls: 2, long_stalls: 1, stall_max_ms: 6_000, stall_total_ms: 7_500 })
})

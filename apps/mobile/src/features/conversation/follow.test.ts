import { describe, expect, test } from 'vitest'
import { distanceFromEnd, isAtEnd, newAtEnd, shouldFollow } from './follow'

const metrics = (content: number, viewport: number, offset: number) => ({
  contentSize: { height: content },
  layoutMeasurement: { height: viewport },
  contentOffset: { y: offset },
})

describe('distanceFromEnd / isAtEnd', () => {
  test('at the very end', () => {
    expect(distanceFromEnd(metrics(2000, 800, 1200))).toBe(0)
    expect(isAtEnd(0)).toBe(true)
  })

  test('a little above the end still counts, a screen above does not', () => {
    expect(isAtEnd(distanceFromEnd(metrics(2000, 800, 1130)))).toBe(true)
    expect(isAtEnd(distanceFromEnd(metrics(2000, 800, 1120)))).toBe(false)
    expect(isAtEnd(distanceFromEnd(metrics(2000, 800, 400)))).toBe(false)
  })

  test('content shorter than the viewport is at the end', () => {
    expect(isAtEnd(distanceFromEnd(metrics(300, 800, 0)))).toBe(true)
  })
})

describe('shouldFollow', () => {
  const base = { follow: true, atEnd: true, scrolling: false, settling: false }

  test('follows at the end with following on', () => {
    expect(shouldFollow(base)).toBe(true)
  })

  test('does not follow when the user scrolled up', () => {
    expect(shouldFollow({ ...base, atEnd: false })).toBe(false)
  })

  test('does not follow while the user scrolls, even at the end', () => {
    expect(shouldFollow({ ...base, scrolling: true })).toBe(false)
  })

  test('does not follow with following off', () => {
    expect(shouldFollow({ ...base, follow: false })).toBe(false)
  })

  test('while settling it keeps the end, even off or away from it, unless the user scrolls', () => {
    expect(shouldFollow({ ...base, follow: false, settling: true })).toBe(true)
    expect(shouldFollow({ ...base, atEnd: false, settling: true })).toBe(true)
    expect(shouldFollow({ ...base, follow: false, settling: true, scrolling: true })).toBe(false)
  })
})

describe('newAtEnd', () => {
  test('a new last item is new at the end', () => {
    expect(newAtEnd('a', 'b')).toBe(true)
  })

  test('older pages prepended keep the last key', () => {
    expect(newAtEnd('b', 'b')).toBe(false)
  })

  test('first load and an emptied list are not new messages', () => {
    expect(newAtEnd(null, 'b')).toBe(false)
    expect(newAtEnd('b', null)).toBe(false)
  })
})

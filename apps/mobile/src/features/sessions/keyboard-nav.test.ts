import { describe, expect, test } from 'vitest'
import { moveCursor } from './keyboard-nav'

describe('moveCursor', () => {
  test('empty list has no cursor', () => {
    expect(moveCursor([], null, 1)).toBeNull()
  })

  test('no cursor, moving down enters at the top', () => {
    expect(moveCursor(['a', 'b', 'c'], null, 1)).toBe('a')
  })

  test('no cursor, moving up enters at the bottom', () => {
    expect(moveCursor(['a', 'b', 'c'], null, -1)).toBe('c')
  })

  test('moves down from the middle', () => {
    expect(moveCursor(['a', 'b', 'c'], 'a', 1)).toBe('b')
  })

  test('moves up from the middle', () => {
    expect(moveCursor(['a', 'b', 'c'], 'c', -1)).toBe('b')
  })

  test('clamps at the bottom', () => {
    expect(moveCursor(['a', 'b', 'c'], 'c', 1)).toBe('c')
  })

  test('clamps at the top', () => {
    expect(moveCursor(['a', 'b', 'c'], 'a', -1)).toBe('a')
  })
})

import { describe, expect, test } from 'vitest'
import { suggestionListHeight } from './list-height'

describe('suggestionListHeight', () => {
  test('follows the space above the keyboard within bounds', () => {
    expect(suggestionListHeight(844, 336)).toBe(203)
    expect(suggestionListHeight(844, 0)).toBe(338)
    expect(suggestionListHeight(1366, 0)).toBe(360)
    expect(suggestionListHeight(400, 300)).toBe(160)
  })
})

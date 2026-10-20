import { describe, expect, test } from 'vitest'
import { liveTranscript, mergeSegments } from './segments'

describe('mergeSegments', () => {
  test('joins trimmed, non-empty segments with a single space', () => {
    expect(mergeSegments(['hello ', ' world'])).toBe('hello world')
    expect(mergeSegments(['one', '', '  ', 'two'])).toBe('one two')
    expect(mergeSegments([])).toBe('')
  })
})

describe('liveTranscript', () => {
  test('appends the interim text to the merged segments', () => {
    expect(liveTranscript(['hello'], 'wor')).toBe('hello wor')
    expect(liveTranscript([], 'hello')).toBe('hello')
    expect(liveTranscript(['hello'], '')).toBe('hello')
    expect(liveTranscript([], '')).toBe('')
  })
})

import { describe, expect, test } from 'vitest'
import { insertTranscriptAtCursor } from './insert-at-cursor'

describe('insertTranscriptAtCursor', () => {
  test('inserts into an empty field with no leading space', () => {
    expect(insertTranscriptAtCursor('', 0, 'continue the tests')).toEqual({
      text: 'continue the tests',
      cursor: 18,
    })
  })

  test('adds a separating space after existing text', () => {
    expect(insertTranscriptAtCursor('please', 6, 'continue')).toEqual({
      text: 'please continue',
      cursor: 15,
    })
  })

  test('does not double a trailing space', () => {
    expect(insertTranscriptAtCursor('please ', 7, 'continue')).toEqual({
      text: 'please continue',
      cursor: 15,
    })
  })

  test('inserts mid-text at the cursor, keeping the rest', () => {
    expect(insertTranscriptAtCursor('please and thanks', 6, 'continue')).toEqual({
      text: 'please continue and thanks',
      cursor: 15,
    })
  })
})

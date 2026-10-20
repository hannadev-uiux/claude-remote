import { expect, test } from 'vitest'
import { insertAtSelection, returnAction } from './return-key'

test('insertAtSelection inserts at the cursor', () => {
  expect(insertAtSelection('ab', { start: 1, end: 1 }, '\n')).toEqual({ text: 'a\nb', cursor: 2 })
  expect(insertAtSelection('', { start: 0, end: 0 }, '\n')).toEqual({ text: '\n', cursor: 1 })
  expect(insertAtSelection('ab', { start: 2, end: 2 }, '\n')).toEqual({ text: 'ab\n', cursor: 3 })
})

test('insertAtSelection replaces a selection, whichever way it was made', () => {
  expect(insertAtSelection('hello', { start: 1, end: 4 }, '\n')).toEqual({ text: 'h\no', cursor: 2 })
  expect(insertAtSelection('hello', { start: 4, end: 1 }, '\n')).toEqual({ text: 'h\no', cursor: 2 })
})

test('insertAtSelection clamps a stale selection to the text', () => {
  expect(insertAtSelection('ab', { start: 9, end: 9 }, '\n')).toEqual({ text: 'ab\n', cursor: 3 })
})

test('returnAction accepts a suggestion before sending', () => {
  expect(returnAction({ suggestionRows: 3, canSend: true })).toBe('accept')
  expect(returnAction({ suggestionRows: 0, canSend: true })).toBe('send')
  expect(returnAction({ suggestionRows: 0, canSend: false })).toBeNull()
})

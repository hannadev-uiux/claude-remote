import { expect, test } from 'vitest'
import { composerAutocorrect, DEFAULT_KEYBOARD_OFFSET, keyboardOffset } from './autocorrect'

test('autocorrect follows the setting, off for commands and mentions', () => {
  const on = { enabled: true, text: 'voce pode revisar', triggerActive: false }
  expect(composerAutocorrect(on)).toBe(true)
  expect(composerAutocorrect({ ...on, enabled: false })).toBe(false)
  expect(composerAutocorrect({ ...on, text: '  /compact' })).toBe(false)
  expect(composerAutocorrect({ ...on, text: 'olha @src/ap', triggerActive: true })).toBe(false)
  expect(composerAutocorrect({ ...on, text: 'a/b path is fine' })).toBe(true)
})

test('the keyboard offset is where the conversation starts on screen', () => {
  expect(keyboardOffset(106.4)).toBe(106)
  expect(keyboardOffset(null)).toBe(DEFAULT_KEYBOARD_OFFSET)
  expect(keyboardOffset(Number.NaN)).toBe(DEFAULT_KEYBOARD_OFFSET)
})

import { expect, test } from 'vitest'
import { createI18n } from '@/core/i18n/create'
import { keyboardHints } from './keyboard-hints'
import { hardwareKeyboard, SOFT_KEYBOARD_MIN_HEIGHT } from './keyboard-toolbar'

const en = createI18n('en-US').t

test('hints list the real shortcuts, the permission pair only while one waits', () => {
  const quiet = keyboardHints({ pendingPermission: false }, en)
  expect(quiet.map((h) => h.keys)).toEqual(['⏎', '⌘⏎', '⌘1–9', '⌘K', '⌘T', '⌘.', '⌘⇧M'])
  expect(quiet[0]).toEqual({ keys: '⏎', label: 'queue' })
  const waiting = keyboardHints({ pendingPermission: true }, en)
  expect(waiting.at(-1)).toEqual({ keys: '⌘A / ⌘D', label: 'answer' })
})

test('a hardware keyboard is a focused field with no software keyboard on screen', () => {
  expect(hardwareKeyboard({ focused: true, keyboardHeight: 0 })).toBe(true)
  expect(hardwareKeyboard({ focused: true, keyboardHeight: SOFT_KEYBOARD_MIN_HEIGHT - 1 })).toBe(true)
  expect(hardwareKeyboard({ focused: true, keyboardHeight: 320 })).toBe(false)
  expect(hardwareKeyboard({ focused: false, keyboardHeight: 0 })).toBe(false)
})

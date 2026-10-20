import { expect, test } from 'vitest'
import { createI18n } from '@/core/i18n/create'
import { keyboardHints } from './keyboard-hints'
import { hardwareKeyboard, SOFT_KEYBOARD_MIN_HEIGHT } from './keyboard-toolbar'

const en = createI18n('en-US').t

test('tablet hints list the real shortcuts, the permission pair only while one waits', () => {
  const quiet = keyboardHints({ pendingPermission: false, tablet: true, os: 'ios' }, en)
  expect(quiet.map((h) => h.keys)).toEqual(['⏎', '⌘⏎', '⇧⏎', '⌘1–9', '⌘K', '⌘T', '⌘.', '⌘⇧M', '⌘/'])
  expect(quiet[0]).toEqual({ keys: '⏎', label: 'queue' })
  expect(quiet[2]).toEqual({ keys: '⇧⏎', label: 'new line' })
  const waiting = keyboardHints({ pendingPermission: true, tablet: true, os: 'ios' }, en)
  expect(waiting.at(-1)).toEqual({ keys: '⌘A / ⌘D', label: 'answer' })
})

test('phones get the short row; Android has no ⇧⏎', () => {
  const phone = keyboardHints({ pendingPermission: true, tablet: false, os: 'ios' }, en)
  expect(phone.map((h) => h.keys)).toEqual(['⏎', '⇧⏎', '⌘⏎', '⌘/'])
  const androidTablet = keyboardHints({ pendingPermission: false, tablet: true, os: 'android' }, en)
  expect(androidTablet.map((h) => h.keys)).not.toContain('⇧⏎')
})

test('a hardware keyboard is a focused field with no software keyboard on screen', () => {
  const ipad = { os: 'ios', tablet: true }
  expect(hardwareKeyboard({ ...ipad, focused: true, keyboardHeight: 0 })).toBe(true)
  expect(hardwareKeyboard({ ...ipad, focused: true, keyboardHeight: SOFT_KEYBOARD_MIN_HEIGHT - 1 })).toBe(
    true,
  )
  expect(hardwareKeyboard({ ...ipad, focused: true, keyboardHeight: 320 })).toBe(false)
  expect(hardwareKeyboard({ ...ipad, focused: false, keyboardHeight: 0 })).toBe(false)
})

test('iPhones count, Android phones do not', () => {
  expect(hardwareKeyboard({ os: 'ios', tablet: false, focused: true, keyboardHeight: 0 })).toBe(true)
  expect(hardwareKeyboard({ os: 'android', tablet: false, focused: true, keyboardHeight: 0 })).toBe(false)
  expect(hardwareKeyboard({ os: 'android', tablet: true, focused: true, keyboardHeight: 0 })).toBe(true)
})

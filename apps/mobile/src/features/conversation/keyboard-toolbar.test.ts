import { describe, expect, test } from 'vitest'
import { keyboardToolbar } from './keyboard-toolbar'

const hidden = { visible: false, canDismiss: false, hideKeyBar: false }

describe('keyboardToolbar', () => {
  test('hidden without focus', () => {
    for (const os of ['ios', 'android']) {
      expect(keyboardToolbar({ os, focused: false, keyboardHeight: 300, expanded: true })).toEqual(hidden)
    }
  })

  test('Android: hidden when focused but the keyboard is down (back button)', () => {
    expect(keyboardToolbar({ os: 'android', focused: true, keyboardHeight: 0, expanded: true })).toEqual(
      hidden,
    )
  })

  test('iOS: shown when focused with no docked keyboard (floating, split, hardware without bar)', () => {
    expect(keyboardToolbar({ os: 'ios', focused: true, keyboardHeight: 0, expanded: false })).toEqual({
      visible: true,
      canDismiss: true,
      hideKeyBar: false,
    })
  })

  test('software keyboard: toolbar with the hide button', () => {
    for (const os of ['ios', 'android']) {
      expect(keyboardToolbar({ os, focused: true, keyboardHeight: 291, expanded: false })).toEqual({
        visible: true,
        canDismiss: true,
        hideKeyBar: false,
      })
    }
  })

  test('hardware keyboard shortcut bar: keys only', () => {
    expect(keyboardToolbar({ os: 'ios', focused: true, keyboardHeight: 55, expanded: false })).toEqual({
      visible: true,
      canDismiss: false,
      hideKeyBar: false,
    })
  })

  test('the threshold counts as a software keyboard', () => {
    const at = (keyboardHeight: number) =>
      keyboardToolbar({ os: 'ios', focused: true, keyboardHeight, expanded: false }).canDismiss
    expect(at(120)).toBe(true)
    expect(at(119)).toBe(false)
  })

  test('expanded keys hide the key bar only while the toolbar is shown', () => {
    const hide = (focused: boolean, expanded: boolean) =>
      keyboardToolbar({ os: 'android', focused, keyboardHeight: 300, expanded }).hideKeyBar
    expect(hide(true, true)).toBe(true)
    expect(hide(true, false)).toBe(false)
    expect(hide(false, true)).toBe(false)
  })
})

/**
 * Below this height only a hardware keyboard's shortcut bar is up (iPad); software keyboards are
 * over 200 pt.
 */
export const SOFT_KEYBOARD_MIN_HEIGHT = 120

export type KeyboardToolbarState = {
  /** The toolbar is shown above the keyboard. */
  visible: boolean
  /** The "hide keyboard" button is shown (not with a hardware keyboard's shortcut bar). */
  canDismiss: boolean
  /** The key bar under the conversation is hidden: the toolbar already shows the same keys. */
  hideKeyBar: boolean
}

/**
 * Rules of the toolbar attached to the keyboard.
 *
 * - Android: it needs a keyboard on screen, not just focus, because the field stays focused after
 *   the back button hides the keyboard.
 * - iOS: focus is enough. A hidden keyboard always blurs the field there, and iPad reports a height
 *   of 0 for floating or split keyboards (and for a hardware keyboard without the shortcut bar). The
 *   hide button stays in that case: dismissing just blurs the field.
 */
export function keyboardToolbar({
  os,
  focused,
  keyboardHeight,
  expanded,
}: {
  os: string
  focused: boolean
  keyboardHeight: number
  expanded: boolean
}): KeyboardToolbarState {
  const visible = focused && (os === 'ios' || keyboardHeight > 0)
  const shortcutBarOnly = keyboardHeight > 0 && keyboardHeight < SOFT_KEYBOARD_MIN_HEIGHT
  return {
    visible,
    canDismiss: visible && !shortcutBarOnly,
    hideKeyBar: visible && expanded,
  }
}

/**
 * A hardware keyboard is in use: the field is focused but no software keyboard is on screen (iPad
 * reports 0, or only the shortcut bar's height). Drives the hints row and Return-to-send on tablets.
 */
export function hardwareKeyboard({
  focused,
  keyboardHeight,
}: {
  focused: boolean
  keyboardHeight: number
}): boolean {
  return focused && keyboardHeight < SOFT_KEYBOARD_MIN_HEIGHT
}

/**
 * Whether the message input autocorrects (accents, typos): on with the setting, except while a
 * slash command or a `@` mention is being typed, where a correction would break it.
 */
export function composerAutocorrect(state: {
  enabled: boolean
  text: string
  /** An `@` or `/` autocomplete trigger is under the cursor. */
  triggerActive: boolean
}): boolean {
  if (!state.enabled || state.triggerActive) return false
  return !state.text.trimStart().startsWith('/')
}

/** Default `keyboardVerticalOffset` until the conversation measured where it starts on screen. */
export const DEFAULT_KEYBOARD_OFFSET = 90

/**
 * `KeyboardAvoidingView` compares its frame (relative to its parent) with the keyboard's screen
 * position, so its offset must be where the parent starts in the window. A fixed guess shorter than
 * the real header lets the keyboard (and its suggestions bar) cover the bottom of the composer.
 */
export function keyboardOffset(parentWindowY: number | null): number {
  return parentWindowY !== null && Number.isFinite(parentWindowY) && parentWindowY >= 0
    ? Math.round(parentWindowY)
    : DEFAULT_KEYBOARD_OFFSET
}

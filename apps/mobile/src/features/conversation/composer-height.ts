/** One line of the prompt field, padding included. */
export const COMPOSER_MIN_HEIGHT = 36
/** The field stops growing here and scrolls its content. */
export const COMPOSER_MAX_HEIGHT = 140

/**
 * Height of the prompt field. React Native's multiline input keeps its last height when the value is
 * cleared from code (after a send), so an empty field always gets one line instead of trusting the
 * stale content size. `extra` is what the reported content height leaves out: on iOS it includes the
 * padding but not the borders; on Android it includes both.
 */
export function composerHeight(value: string, contentHeight: number | null, extra = 0): number {
  const min = COMPOSER_MIN_HEIGHT + extra
  if (value.length === 0 || contentHeight === null || contentHeight <= 0) return min
  return Math.min(COMPOSER_MAX_HEIGHT, Math.max(min, Math.ceil(contentHeight) + extra))
}

const MIN = 160
const MAX = 360

/** Max height of the suggestion list: 40% of the space above the keyboard, kept between 160 and 360 pt. */
export function suggestionListHeight(windowHeight: number, keyboardHeight: number): number {
  return Math.round(Math.min(MAX, Math.max(MIN, (windowHeight - keyboardHeight) * 0.4)))
}

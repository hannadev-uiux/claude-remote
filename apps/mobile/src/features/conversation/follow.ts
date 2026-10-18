/** Closer than this to the end of the list counts as "at the end" (pt). */
export const AT_END_DISTANCE = 80

/** How long after the first content arrives the list keeps its end in view, whatever the toggle (ms). */
export const SETTLE_MS = 1000

type ScrollMetrics = {
  contentSize: { height: number }
  layoutMeasurement: { height: number }
  contentOffset: { y: number }
}

/** Distance between the bottom of the viewport and the end of the content. */
export function distanceFromEnd({ contentSize, layoutMeasurement, contentOffset }: ScrollMetrics): number {
  return contentSize.height - layoutMeasurement.height - contentOffset.y
}

export function isAtEnd(distance: number): boolean {
  return distance < AT_END_DISTANCE
}

/**
 * Whether new content should scroll the list to the end. Never while the user scrolls (drag or the
 * fling after it). Right after opening (`settling`) always, so a tall last message still ends up
 * fully in view; afterwards only with following on and the user at the end.
 */
export function shouldFollow({
  follow,
  atEnd,
  scrolling,
  settling,
}: {
  follow: boolean
  atEnd: boolean
  scrolling: boolean
  settling: boolean
}): boolean {
  return !scrolling && (settling || (follow && atEnd))
}

/**
 * Whether a new item arrived at the end of the timeline. Older pages are prepended and keep the last
 * key, so they do not count; nor does the first load (no previous key).
 */
export function newAtEnd(previousLastKey: string | null, lastKey: string | null): boolean {
  return previousLastKey !== null && lastKey !== null && previousLastKey !== lastKey
}

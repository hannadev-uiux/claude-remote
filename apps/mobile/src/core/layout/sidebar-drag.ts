import type { PaneMode } from './width-class'

/** Width of the invisible strip at the left edge that starts the swipe (points). */
export const EDGE_SWIPE_WIDTH = 20
/** A release faster than this (points per second) decides the direction on its own. */
export const SETTLE_VELOCITY = 500

/** Sidebar progress (0 hidden, 1 open) while dragging: from where the drag started, clamped. */
export function dragProgress(start: number, translationX: number, width: number): number {
  'worklet'
  if (width <= 0) return start
  return Math.min(1, Math.max(0, start + translationX / width))
}

/** Whether a released drag leaves the sidebar open: a flick decides, otherwise half its width. */
export function settlesOpen(progress: number, velocityX: number): boolean {
  'worklet'
  if (velocityX > SETTLE_VELOCITY) return true
  if (velocityX < -SETTLE_VELOCITY) return false
  return progress >= 0.5
}

/**
 * The edge swipe exists only for the overlay sidebar, while it is closed, on the list and on a
 * session's conversation: there ☰ replaces the back button, so the stack's back swipe is off.
 * Deeper screens (terminal, subagent, settings) keep their back swipe.
 */
export function edgeSwipeEnabled(mode: PaneMode, open: boolean, pathname: string): boolean {
  if (mode !== 'overlay' || open) return false
  return pathname === '/' || /^\/session\/[^/]+\/?$/.test(pathname)
}

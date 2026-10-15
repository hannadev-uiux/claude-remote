export type WidthClass = 'compact' | 'regular'

/** Below this, list and detail don't comfortably fit side by side (iPhone, narrow Split View). */
export const REGULAR_WIDTH_BREAKPOINT = 680

export function getWidthClass(width: number): WidthClass {
  return width >= REGULAR_WIDTH_BREAKPOINT ? 'regular' : 'compact'
}

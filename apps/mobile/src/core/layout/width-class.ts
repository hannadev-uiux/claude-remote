export type WidthClass = 'compact' | 'regular'

/** One pane (phone, Split View one third, Slide Over), two columns, or three with the inspector. */
export type LayoutClass = 'compact' | 'regular' | 'wide'

export type PaneMode = 'none' | 'inline' | 'overlay'

/** Below this, list and detail don't comfortably fit side by side (iPhone, narrow Split View). */
export const REGULAR_WIDTH_BREAKPOINT = 700
/** From this width three columns fit: list 340 · conversation · inspector 320. */
export const WIDE_WIDTH_BREAKPOINT = 1100

export function getWidthClass(width: number): WidthClass {
  return width >= REGULAR_WIDTH_BREAKPOINT ? 'regular' : 'compact'
}

export function getLayoutClass(width: number): LayoutClass {
  if (width >= WIDE_WIDTH_BREAKPOINT) return 'wide'
  return width >= REGULAR_WIDTH_BREAKPOINT ? 'regular' : 'compact'
}

/** Two-column tablets in portrait show the list over the dimmed conversation instead of beside it. */
export function sidebarMode(layout: LayoutClass, portrait: boolean): PaneMode {
  if (layout === 'compact') return 'none'
  return layout === 'regular' && portrait ? 'overlay' : 'inline'
}

/** The inspector is a third column when it fits, a side sheet on two columns, absent on phones. */
export function inspectorMode(layout: LayoutClass): PaneMode {
  return layout === 'wide' ? 'inline' : layout === 'regular' ? 'overlay' : 'none'
}

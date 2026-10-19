import type { TFunction } from '@/core/i18n/create'

export type InspectorTab = 'terminal' | 'subagents' | 'details'

export const INSPECTOR_TABS: readonly InspectorTab[] = ['terminal', 'subagents', 'details']
export const INSPECTOR_MIN_WIDTH = 280
export const INSPECTOR_MAX_WIDTH = 420
export const INSPECTOR_DEFAULT_WIDTH = 320

/** The inspector never gets narrower than its content needs nor wider than a third column should be. */
export function clampInspectorWidth(width: number): number {
  return Math.min(INSPECTOR_MAX_WIDTH, Math.max(INSPECTOR_MIN_WIDTH, Math.round(width)))
}

/** The pane is on the right: dragging its edge to the left widens it. */
export function resizedInspectorWidth(startWidth: number, dx: number): number {
  return clampInspectorWidth(startWidth - dx)
}

/** Tab labels; Subagents carries the count. */
export function inspectorTabLabel(tab: InspectorTab, subagents: number, t: TFunction): string {
  if (tab === 'subagents' && subagents > 0) return t('tablet.subagentsCount', { n: subagents })
  return t(`tablet.${tab}`)
}

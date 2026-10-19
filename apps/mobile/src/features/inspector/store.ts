import { create } from 'zustand'
import { clampInspectorWidth, INSPECTOR_DEFAULT_WIDTH, type InspectorTab } from './logic'

type InspectorState = { open: boolean; tab: InspectorTab; width: number }

/** Tablet inspector: whether the side sheet is open (two columns), the tab and the width. */
export const useInspectorStore = create<InspectorState>(() => ({
  open: false,
  tab: 'terminal',
  width: INSPECTOR_DEFAULT_WIDTH,
}))

export function setInspectorOpen(open: boolean): void {
  useInspectorStore.setState({ open })
}

export function toggleInspector(): void {
  useInspectorStore.setState((s) => ({ open: !s.open }))
}

export function setInspectorTab(tab: InspectorTab): void {
  useInspectorStore.setState({ tab })
}

export function setInspectorWidth(width: number): void {
  useInspectorStore.setState({ width: clampInspectorWidth(width) })
}

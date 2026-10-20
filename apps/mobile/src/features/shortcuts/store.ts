import { create } from 'zustand'

/**
 * Keyboard requests to the screens that own the target: focus the composer (⌘L) and open the
 * session's More options menu (⌘⇧O), as counters so each press counts; plus whether the Keyboard
 * shortcuts sheet (⌘/) is open.
 */
export const useShortcutsStore = create<{ composerFocus: number; sessionMenu: number; sheetOpen: boolean }>(
  () => ({ composerFocus: 0, sessionMenu: 0, sheetOpen: false }),
)

export function requestComposerFocus(): void {
  useShortcutsStore.setState((s) => ({ composerFocus: s.composerFocus + 1 }))
}

export function requestSessionMenu(): void {
  useShortcutsStore.setState((s) => ({ sessionMenu: s.sessionMenu + 1 }))
}

export function setShortcutsSheetOpen(open: boolean): void {
  useShortcutsStore.setState({ sheetOpen: open })
}

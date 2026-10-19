import { create } from 'zustand'

/** Counts requests to focus the session search (⌘K); the field focuses whenever it changes. */
export const useSearchFocus = create<{ requests: number }>(() => ({ requests: 0 }))

export function requestSearchFocus(): void {
  useSearchFocus.setState((s) => ({ requests: s.requests + 1 }))
}

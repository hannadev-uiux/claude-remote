import { useEffect, useRef } from 'react'
import { useShortcutsStore } from './store'

/**
 * Runs `onRequest` on each ⌘L / ⌘⇧O press while `enabled` (the screen is the focused one: the stack
 * keeps other sessions mounted underneath).
 */
export function useShortcutRequest(
  kind: 'composerFocus' | 'sessionMenu',
  onRequest: () => void,
  enabled: boolean,
): void {
  const latest = useRef(onRequest)
  latest.current = onRequest
  useEffect(() => {
    if (!enabled) return
    return useShortcutsStore.subscribe((state, previous) => {
      if (state[kind] !== previous[kind]) latest.current()
    })
  }, [kind, enabled])
}

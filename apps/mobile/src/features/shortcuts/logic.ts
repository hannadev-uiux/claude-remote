import type { PermissionMode, SelectableMode } from '@remote-harness/protocol'

/** ⌘⇧M: default → accept edits → plan → default. `auto` needs its confirmation, so it is never reached. */
export function cycleMode(current: PermissionMode | null): SelectableMode {
  switch (current) {
    case 'default':
      return 'acceptEdits'
    case 'acceptEdits':
      return 'plan'
    default:
      return 'default'
  }
}

/** ⌘1–9: the session at that position of the list (1-based), or `null` past its end. */
export function nthSessionId(ids: readonly string[], n: number): string | null {
  if (!Number.isInteger(n) || n < 1) return null
  return ids[n - 1] ?? null
}

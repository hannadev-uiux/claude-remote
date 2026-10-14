import type { PermissionOutcome, PermissionRequestInfo } from '@claude-remote/protocol'
import { create } from 'zustand'
import type { DaemonClient } from '@/core/connection/daemon-client'

type Resolved = { requestId: string; sessionId: string; outcome: PermissionOutcome; at: number }

type PermissionsState = {
  pending: Record<string, PermissionRequestInfo>
  lastResolved: Resolved | null
}

export const usePermissionsStore = create<PermissionsState>(() => ({ pending: {}, lastResolved: null }))

export function selectPendingFor(sessionId: string) {
  return (s: PermissionsState) => Object.values(s.pending).filter((p) => p.sessionId === sessionId)
}

export function selectPendingCounts(s: PermissionsState): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const p of Object.values(s.pending)) counts[p.sessionId] = (counts[p.sessionId] ?? 0) + 1
  return counts
}

/** Mirrors pending permission requests. The daemon replays pending ones on every (re)connect. */
export function bindPermissions(
  client: DaemonClient,
  onNewRequest?: (info: PermissionRequestInfo) => void,
): () => void {
  const offs = [
    client.onReady(() => usePermissionsStore.setState({ pending: {} })),
    client.on('permission.request', ({ request }) => {
      usePermissionsStore.setState((s) => ({ pending: { ...s.pending, [request.requestId]: request } }))
      onNewRequest?.(request)
    }),
    client.on('permission.resolved', ({ requestId, sessionId, outcome }) => {
      usePermissionsStore.setState((s) => {
        const { [requestId]: _done, ...rest } = s.pending
        return { pending: rest, lastResolved: { requestId, sessionId, outcome, at: Date.now() } }
      })
    }),
  ]
  return () => {
    for (const off of offs) off()
  }
}

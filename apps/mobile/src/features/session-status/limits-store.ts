import type { AccountLimits } from '@remote-harness/protocol'
import { create } from 'zustand'
import type { DaemonClient } from '@/core/connection/daemon-client'

/** Usage limits per profile, as last reported by the daemon (it resends them on every connection). */
export const useLimitsStore = create<{ byProfile: Record<string, AccountLimits> }>(() => ({ byProfile: {} }))

export function bindLimits(client: DaemonClient): () => void {
  return client.on('limits.updated', (m) =>
    useLimitsStore.setState((state) => ({
      byProfile: { ...state.byProfile, [m.limits.profileId]: m.limits },
    })),
  )
}

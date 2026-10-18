import * as Haptics from 'expo-haptics'
import { useEffect } from 'react'
import { useDaemonClient } from '@/core/connection'
import { bindMute } from '@/features/mute/store'
import { bindPermissions } from '@/features/permissions/store'
import { bindQueue } from '@/features/queue/store'
import { bindLimits } from '@/features/session-status/limits-store'
import { bindSessions } from '@/features/sessions/store'

/** Binds every feature store to the current daemon client (re-binds when credentials change). */
export function useDaemonSync() {
  const client = useDaemonClient()
  useEffect(() => {
    if (!client) return
    const unbinders = [
      bindSessions(client),
      bindMute(client),
      bindLimits(client),
      bindQueue(client),
      bindPermissions(client, () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
    ]
    return () => {
      for (const unbind of unbinders) unbind()
    }
  }, [client])
}

import type { LiveStatusProps, Session, SessionState } from '@remote-harness/protocol'
import { after, type LiveActivity } from 'expo-widgets'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { AppState, Platform } from 'react-native'
import { useConnectionStore } from '@/core/connection'
import { DaemonRequestError } from '@/core/connection/daemon-client'
import type { TFunction } from '@/core/i18n/create'
import { devicePlatform } from '@/core/platform/platform'
import { useMuteStore } from '../mute/store'
import { loadMessaging } from '../push/firebase'
import { relayFor } from '../push/push-relay'
import { useSessionsStore } from '../sessions/store'
import { DONE_DISMISS_MS, isMutedSession, localLiveProps, sessionsToStart } from './logic'
import { SessionActivity } from './SessionActivity'
import { useLiveStatusSettings } from './settings-store'

type Tracked = {
  /** iOS Live Activity; null on Android, where the daemon owns the notification. */
  instance: LiveActivity<LiveStatusProps> | null
  title: string
  startedAt: number
  state: SessionState
  subscription: { remove(): void } | null
}

/**
 * Starts the live status of sessions that begin working while the app is open, registers it with
 * the daemon (which keeps it updated through FCM) and, on iOS, updates or ends the activity locally
 * while the app is active.
 */
export function useLiveStatus() {
  const client = useConnectionStore((s) => s.client)
  const { t } = useTranslation()
  const tRef = useRef<TFunction>(t)
  tRef.current = t

  useEffect(() => {
    if (!client) return
    const tracked = new Map<string, Tracked>()
    const platform = devicePlatform(Platform.OS)
    // Daemons older than the live status answer `unknown_type`: then keep only the local updates.
    let daemonSupportsLive = true

    const profileName = (profileId: string) =>
      client.hello?.profiles.find((p) => p.id === profileId)?.name ?? profileId

    const register = async (sessionId: string, activityToken?: string) => {
      const messaging = loadMessaging()
      if (!daemonSupportsLive || !messaging || !platform) return
      try {
        const fcmToken = await messaging.getToken(messaging.getMessaging())
        const relay = await relayFor({ fcmToken, platform, ...(activityToken ? { activityToken } : {}) })
        await client.request({
          type: 'live.register',
          sessionId,
          platform,
          fcmToken,
          ...(activityToken ? { activityToken } : {}),
          ...(relay ? { relay } : {}),
        })
      } catch (error) {
        if (error instanceof DaemonRequestError && error.code === 'unknown_type') daemonSupportsLive = false
      }
    }

    const stop = (sessionId: string, props?: LiveStatusProps) => {
      const entry = tracked.get(sessionId)
      if (!entry) return
      tracked.delete(sessionId)
      entry.subscription?.remove()
      const policy = props?.state === 'done' ? after(new Date(Date.now() + DONE_DISMISS_MS)) : 'immediate'
      void entry.instance?.end(policy, props).catch(() => undefined)
    }

    const unregister = (sessionId: string) => {
      stop(sessionId)
      if (daemonSupportsLive) client.send({ type: 'live.unregister', sessionId })
    }

    const start = (session: Session) => {
      stop(session.id)
      const title = profileName(session.profileId)
      const startedAt = Date.now()
      const entry: Tracked = { instance: null, title, startedAt, state: session.state, subscription: null }
      if (Platform.OS === 'ios') {
        try {
          const instance = SessionActivity.start(
            localLiveProps(session, title, startedAt, tRef.current),
            `claude-remote://session/${session.id}`,
          )
          entry.instance = instance
          entry.subscription = instance.addPushTokenListener(
            ({ pushToken }) => void register(session.id, pushToken),
          )
          void instance.getPushToken().then((token) => {
            if (token) void register(session.id, token)
          })
        } catch {
          // Live Activities turned off for the app in iOS Settings.
          return
        }
      } else {
        void register(session.id)
      }
      tracked.set(session.id, entry)
    }

    const sync = (current: Record<string, Session>, previous: Record<string, Session>) => {
      const { enabled } = useLiveStatusSettings.getState()
      const muted = useMuteStore.getState()
      for (const [id, entry] of tracked) {
        const session = current[id]
        if (!session || !enabled || isMutedSession(session, muted)) {
          unregister(id)
          continue
        }
        if (session.state === entry.state) continue
        entry.state = session.state
        const props = localLiveProps(session, entry.title, entry.startedAt, tRef.current)
        if (props.state === 'done' || props.state === 'closed') stop(id, props)
        else void entry.instance?.update(props).catch(() => undefined)
      }
      if (AppState.currentState !== 'active') return
      for (const id of sessionsToStart(previous, current, { enabled, muted })) {
        const session = current[id]
        if (session) start(session)
      }
    }

    const offSessions = useSessionsStore.subscribe((state, prev) => sync(state.sessions, prev.sessions))
    const resync = () => {
      const { sessions } = useSessionsStore.getState()
      sync(sessions, sessions)
    }
    const offMute = useMuteStore.subscribe(resync)
    const offSettings = useLiveStatusSettings.subscribe(resync)
    return () => {
      offSessions()
      offMute()
      offSettings()
      for (const entry of tracked.values()) entry.subscription?.remove()
    }
  }, [client])
}

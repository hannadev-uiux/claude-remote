import type { LivePalette, LiveStatusProps, Session, SessionState } from '@remote-harness/protocol'
import { addUserInteractionListener, after, type LiveActivity } from 'expo-widgets'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { AppState, Platform } from 'react-native'
import { useConnectionStore } from '@/core/connection'
import { DaemonRequestError } from '@/core/connection/daemon-client'
import type { TFunction } from '@/core/i18n/create'
import { devicePlatform } from '@/core/platform/platform'
import { currentTheme } from '@/core/theme'
import { useMuteStore } from '../mute/store'
import { loadMessaging } from '../push/firebase'
import { relayFor } from '../push/push-relay'
import { respondInBackground } from '../push/respond-in-background'
import { useSessionsStore } from '../sessions/store'
import {
  DONE_DISMISS_MS,
  isMutedSession,
  type LocalLiveInfo,
  liveAction,
  livePalette,
  localLiveProps,
  sessionsToStart,
} from './logic'
import { SessionActivity } from './SessionActivity'
import { useLiveStatusSettings } from './settings-store'

type Tracked = LocalLiveInfo & {
  /** iOS Live Activity; null on Android, where the daemon owns the notification. */
  instance: LiveActivity<LiveStatusProps> | null
  state: SessionState
  /**
   * The daemon accepted the registration and keeps the activity updated: local updates would wipe
   * what only it knows (the latest steps), so the app leaves the activity alone.
   */
  remote: boolean
  subscription: { remove(): void } | null
}

/**
 * Starts the live status of sessions that begin working while the app is open, registers it with
 * the daemon (which keeps it updated through FCM) and, on iOS, updates or ends the activity locally
 * while the app is active and the daemon does not. The theme colors travel with the registration
 * and the local props, since the widget cannot read the app theme.
 */
export function useLiveStatus() {
  const client = useConnectionStore((s) => s.client)
  const { t } = useTranslation()
  const tRef = useRef<TFunction>(t)
  tRef.current = t

  // Deny / Allow tapped on the activity (lock screen or Dynamic Island): answered like a
  // notification action, over a short-lived connection, whether or not the app is in front.
  useEffect(() => {
    const subscription = addUserInteractionListener((event) => {
      const action = liveAction(event.target)
      if (action) void respondInBackground(action.requestId, action.decision)
    })
    return () => subscription.remove()
  }, [])

  useEffect(() => {
    if (!client) return
    const tracked = new Map<string, Tracked>()
    const platform = devicePlatform(Platform.OS)
    // Daemons older than the live status answer `unknown_type`: then keep only the local updates.
    let daemonSupportsLive = true

    const profileName = (profileId: string) =>
      client.hello?.profiles.find((p) => p.id === profileId)?.name ?? profileId

    const register = async (sessionId: string, palette: LivePalette, activityToken?: string) => {
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
          palette,
          ...(activityToken ? { activityToken } : {}),
          ...(relay ? { relay } : {}),
        })
        const entry = tracked.get(sessionId)
        // Only an activity token lets the daemon update an iOS activity.
        if (entry && (activityToken || !entry.instance)) entry.remote = true
      } catch (error) {
        if (error instanceof DaemonRequestError && error.code === 'unknown_type') daemonSupportsLive = false
      }
    }

    /** Stops tracking a session; ends its activity unless the daemon is the one ending it. */
    const stop = (sessionId: string, props?: LiveStatusProps, { leaveToDaemon = false } = {}) => {
      const entry = tracked.get(sessionId)
      if (!entry) return
      tracked.delete(sessionId)
      entry.subscription?.remove()
      if (leaveToDaemon && entry.remote) return
      const policy = props?.state === 'done' ? after(new Date(Date.now() + DONE_DISMISS_MS)) : 'immediate'
      void entry.instance?.end(policy, props).catch(() => undefined)
    }

    const unregister = (sessionId: string) => {
      stop(sessionId)
      if (daemonSupportsLive) client.send({ type: 'live.unregister', sessionId })
    }

    const start = (session: Session) => {
      stop(session.id)
      const now = Date.now()
      const palette = livePalette(currentTheme())
      const entry: Tracked = {
        instance: null,
        title: profileName(session.profileId),
        host: client.hello?.host ?? '',
        startedAt: now,
        changedAt: now,
        endedAt: null,
        palette,
        state: session.state,
        remote: false,
        subscription: null,
      }
      if (Platform.OS === 'ios') {
        try {
          const instance = SessionActivity.start(
            localLiveProps(session, entry, tRef.current),
            `claude-remote://session/${session.id}`,
          )
          entry.instance = instance
          entry.subscription = instance.addPushTokenListener(
            ({ pushToken }) => void register(session.id, palette, pushToken),
          )
          void instance.getPushToken().then((token) => {
            if (token) void register(session.id, palette, token)
          })
        } catch {
          // Live Activities turned off for the app in iOS Settings.
          return
        }
      } else {
        void register(session.id, palette)
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
        const now = Date.now()
        entry.state = session.state
        entry.changedAt = now
        const props = localLiveProps(session, entry, tRef.current)
        if (props.state === 'done' || props.state === 'closed') {
          entry.endedAt = now
          stop(id, { ...props, endedAt: now }, { leaveToDaemon: true })
        } else if (!entry.remote) {
          void entry.instance?.update(props).catch(() => undefined)
        }
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

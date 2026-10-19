import type { LivePalette, LiveStatusProps, Session, SessionState } from '@remote-harness/protocol'
import { addUserInteractionListener, type LiveActivity } from 'expo-widgets'
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
import { loadActivityMap, saveActivityMap } from './activity-store'
import {
  type ActivityMap,
  DONE_DISMISS_MS,
  isMutedSession,
  type LocalLiveInfo,
  liveAction,
  livePalette,
  localLiveProps,
  reconcileActivities,
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
  /** Start of the done window (the turn finished), null while working. */
  doneAt: number | null
  /** Ends the activity when the done window passes while the app is in front. */
  endTimer: ReturnType<typeof setTimeout> | null
}

/** The activities iOS still has for this app (none on Android, or with Live Activities off). */
function aliveActivities(): LiveActivity<LiveStatusProps>[] {
  if (Platform.OS !== 'ios') return []
  try {
    return SessionActivity.getInstances()
  } catch {
    return []
  }
}

/**
 * The live status of working sessions: one per session, whatever restarts in between. Sessions
 * that begin working while the app is open get one (reusing the session's activity when it still
 * exists), registered with the daemon, which keeps it updated through FCM. On iOS the app also
 * updates it locally while it is in front and the daemon does not. The activity each session has is
 * saved, so after a restart, a reconnect or an over-the-air reload the app adopts it again and ends
 * any activity it cannot match. A finished turn keeps its activity ("done") for DONE_DISMISS_MS, so
 * the next turn updates it instead of adding another. The theme colors travel with the registration
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
    let disposed = false
    // Daemons older than the live status answer `unknown_type`: then keep only the local updates.
    let daemonSupportsLive = true

    const profileName = (profileId: string) =>
      client.hello?.profiles.find((p) => p.id === profileId)?.name ?? profileId

    /** What is saved: the activity of every tracked session and when its done window started. */
    const persist = () => {
      const map: ActivityMap = {}
      for (const [sessionId, entry] of tracked) {
        if (entry.instance) map[sessionId] = { activityId: entry.instance.getId(), doneAt: entry.doneAt }
      }
      void saveActivityMap(map)
    }

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

    /** Registers an iOS activity with its push token, now and whenever the token changes. */
    const registerActivity = (sessionId: string, entry: Tracked) => {
      const { instance, palette } = entry
      if (!instance || !palette) return
      entry.subscription?.remove()
      entry.subscription = instance.addPushTokenListener(
        ({ pushToken }) => void register(sessionId, palette, pushToken),
      )
      void instance.getPushToken().then((token) => {
        if (token) void register(sessionId, palette, token)
      })
    }

    const clearEndTimer = (entry: Tracked) => {
      if (entry.endTimer) clearTimeout(entry.endTimer)
      entry.endTimer = null
    }

    /** Stops tracking a session and ends its activity, unless the daemon is the one ending it. */
    const stop = (sessionId: string, props?: LiveStatusProps, { leaveToDaemon = false } = {}) => {
      const entry = tracked.get(sessionId)
      if (!entry) return
      tracked.delete(sessionId)
      entry.subscription?.remove()
      clearEndTimer(entry)
      persist()
      if (leaveToDaemon && entry.remote) return
      void entry.instance?.end('immediate', props).catch(() => undefined)
    }

    const unregister = (sessionId: string) => {
      stop(sessionId)
      if (daemonSupportsLive) client.send({ type: 'live.unregister', sessionId })
    }

    /** Ends the activity once the done window passes, if the app is still running then. */
    const scheduleEnd = (sessionId: string, entry: Tracked) => {
      clearEndTimer(entry)
      if (entry.doneAt === null) return
      const left = Math.max(0, entry.doneAt + DONE_DISMISS_MS - Date.now())
      entry.endTimer = setTimeout(() => {
        if (tracked.get(sessionId) === entry && entry.doneAt !== null) stop(sessionId)
      }, left)
    }

    const start = (session: Session) => {
      const now = Date.now()
      const existing = tracked.get(session.id)
      if (existing?.instance || (existing && Platform.OS !== 'ios')) {
        // A new turn in the session's live status (also one in its done window): same activity.
        clearEndTimer(existing)
        Object.assign(existing, {
          title: profileName(session.profileId),
          startedAt: now,
          changedAt: now,
          endedAt: null,
          doneAt: null,
          state: session.state,
        })
        persist()
        if (!existing.remote) {
          void existing.instance
            ?.update(localLiveProps(session, existing, tRef.current))
            .catch(() => undefined)
        }
        if (existing.instance) registerActivity(session.id, existing)
        else void register(session.id, existing.palette ?? livePalette(currentTheme()))
        return
      }
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
        doneAt: null,
        endTimer: null,
      }
      if (Platform.OS === 'ios') {
        try {
          entry.instance = SessionActivity.start(
            localLiveProps(session, entry, tRef.current),
            `claude-remote://session/${session.id}`,
          )
        } catch {
          // Live Activities turned off for the app in iOS Settings.
          return
        }
        tracked.set(session.id, entry)
        persist()
        registerActivity(session.id, entry)
      } else {
        tracked.set(session.id, entry)
        void register(session.id, palette)
      }
    }

    /**
     * Matches the activities iOS still has with the saved record: adopts the one of each live
     * session (or of a finished turn in its window) and ends the rest. Runs on connect and when the
     * app comes back to the foreground.
     */
    const reconcile = async () => {
      if (Platform.OS !== 'ios') return
      const saved = await loadActivityMap()
      if (disposed) return
      const record: ActivityMap = { ...saved }
      for (const [sessionId, entry] of tracked) {
        if (entry.instance) record[sessionId] = { activityId: entry.instance.getId(), doneAt: entry.doneAt }
      }
      const alive = aliveActivities()
      const byId = new Map(alive.map((instance) => [instance.getId(), instance]))
      const { sessions } = useSessionsStore.getState()
      const { enabled } = useLiveStatusSettings.getState()
      const muted = useMuteStore.getState()
      const result = reconcileActivities(record, [...byId.keys()], sessions, Date.now())
      for (const id of result.end)
        void byId
          .get(id)
          ?.end('immediate')
          .catch(() => undefined)
      // Tracked sessions whose activity is gone (ended by the daemon or by iOS) stop here.
      for (const [sessionId, entry] of tracked) {
        if (result.adopt[sessionId] !== entry.instance?.getId()) {
          entry.subscription?.remove()
          clearEndTimer(entry)
          tracked.delete(sessionId)
        }
      }
      for (const [sessionId, activityId] of Object.entries(result.adopt)) {
        const session = sessions[sessionId]
        const instance = byId.get(activityId)
        if (!session || !instance || tracked.has(sessionId)) continue
        if (!enabled || isMutedSession(session, muted)) {
          void instance.end('immediate').catch(() => undefined)
          continue
        }
        const now = Date.now()
        const doneAt = result.map[sessionId]?.doneAt ?? null
        const entry: Tracked = {
          instance,
          title: profileName(session.profileId),
          host: client.hello?.host ?? '',
          startedAt: now,
          changedAt: now,
          endedAt: doneAt,
          palette: livePalette(currentTheme()),
          state: session.state,
          remote: false,
          subscription: null,
          doneAt,
          endTimer: null,
        }
        tracked.set(sessionId, entry)
        if (doneAt === null) {
          // The daemon keeps what it knows about the turn (steps, timer) when the same session
          // registers again, and it may have restarted: register the activity's token again.
          registerActivity(sessionId, entry)
        } else {
          scheduleEnd(sessionId, entry)
        }
      }
      persist()
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
        if (props.state === 'closed') {
          entry.endedAt = now
          stop(id, { ...props, endedAt: now }, { leaveToDaemon: true })
          continue
        }
        if (props.state === 'done') {
          // Done is an update: the activity stays for the next turn until the window passes.
          entry.endedAt = now
          entry.doneAt = now
          persist()
          scheduleEnd(id, entry)
          if (!entry.remote) void entry.instance?.update({ ...props, endedAt: now }).catch(() => undefined)
          continue
        }
        if (entry.doneAt !== null) {
          entry.doneAt = null
          clearEndTimer(entry)
          persist()
        }
        if (!entry.remote) void entry.instance?.update(props).catch(() => undefined)
      }
      if (AppState.currentState !== 'active') return
      for (const id of sessionsToStart(previous, current, { enabled, muted })) {
        const session = current[id]
        if (session) start(session)
      }
    }

    // Nothing starts before the saved activities are adopted, so a restart never adds a second one;
    // sessions that turned running meanwhile are caught up from this snapshot.
    const before = useSessionsStore.getState().sessions
    let ready = false
    const offSessions = useSessionsStore.subscribe((state, prev) => {
      if (ready) sync(state.sessions, prev.sessions)
    })
    const resync = () => {
      if (!ready) return
      const { sessions } = useSessionsStore.getState()
      sync(sessions, sessions)
    }
    const offMute = useMuteStore.subscribe(resync)
    const offSettings = useLiveStatusSettings.subscribe(resync)
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active' && ready) void reconcile()
    })
    void reconcile().finally(() => {
      if (disposed) return
      ready = true
      sync(useSessionsStore.getState().sessions, before)
    })
    return () => {
      disposed = true
      offSessions()
      offMute()
      offSettings()
      appState.remove()
      for (const entry of tracked.values()) {
        entry.subscription?.remove()
        clearEndTimer(entry)
      }
    }
  }, [client])
}

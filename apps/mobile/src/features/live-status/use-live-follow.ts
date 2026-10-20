import type { LiveFollowDevice } from '@remote-harness/protocol'
import { addPushToStartTokenListener } from 'expo-widgets'
import { useEffect } from 'react'
import { Platform } from 'react-native'
import { useConnectionStore } from '@/core/connection'
import type { Hello } from '@/core/connection/daemon-client'
import { devicePlatform } from '@/core/platform/platform'
import { currentTheme } from '@/core/theme'
import { loadMessaging } from '../push/firebase'
import { relayFor } from '../push/push-relay'
import { setFollowed, useLiveFollowStore } from './follow-store'
import { livePalette } from './logic'
import { useLiveStatusSettings } from './settings-store'

/** How the daemon reaches this phone: FCM token, relay grants, push-to-start token, colors. */
async function followDevice(): Promise<LiveFollowDevice | null> {
  const messaging = loadMessaging()
  const platform = devicePlatform(Platform.OS)
  if (!messaging || !platform) return null
  const fcmToken = await messaging.getToken(messaging.getMessaging())
  const { startToken } = useLiveFollowStore.getState()
  const relay = await relayFor({ fcmToken, platform })
  const startRelay = startToken
    ? await relayFor({ fcmToken, platform, activityToken: startToken })
    : undefined
  return {
    platform,
    fcmToken,
    palette: livePalette(currentTheme()),
    ...(relay ? { relay } : {}),
    ...(startToken ? { startToken } : {}),
    ...(startRelay ? { startRelay } : {}),
    ...(platform === 'android' ? { androidDataMessages: true } : {}),
  }
}

type FollowRequest =
  | { type: 'live.follow'; sessionId: string }
  | { type: 'live.unfollow'; sessionId: string }
  | { type: 'live.autoFollow'; profileId: string; enabled: boolean }
  | { type: 'live.follows' }

/** Sends one follow message with this phone's data and keeps what the daemon answers. */
async function request(message: FollowRequest): Promise<void> {
  const client = useConnectionStore.getState().client
  if (!client || !useLiveFollowStore.getState().supported) return
  const device = await followDevice()
  if (!device) return
  const reply = await client.request(
    message.type === 'live.unfollow' ? { ...message, fcmToken: device.fcmToken } : { ...message, device },
  )
  if (reply.type === 'live.followed') setFollowed(reply)
}

/** Follow a session: later turns start its live status even with the app closed. */
export function followSession(sessionId: string): Promise<void> {
  return request({ type: 'live.follow', sessionId })
}

export function unfollowSession(sessionId: string): Promise<void> {
  return request({ type: 'live.unfollow', sessionId })
}

/** Follow every new session of a profile on this phone (or stop). */
export function setAutoFollow(profileId: string, enabled: boolean): Promise<void> {
  return request({ type: 'live.autoFollow', profileId, enabled })
}

/**
 * Keeps the follows of this phone in sync with the connected daemon: on connect (refreshing the
 * tokens), when iOS hands a new push-to-start token, and when "Live status" is turned off (then
 * nothing stays followed).
 */
export function useLiveFollow() {
  const client = useConnectionStore((s) => s.client)

  // iOS 17.2+: the token that lets the daemon start a Live Activity while the app is closed.
  useEffect(() => {
    if (Platform.OS !== 'ios') return
    try {
      const subscription = addPushToStartTokenListener(({ activityPushToStartToken }) => {
        if (useLiveFollowStore.getState().startToken === activityPushToStartToken) return
        useLiveFollowStore.setState({ startToken: activityPushToStartToken })
        void request({ type: 'live.follows' }).catch(() => undefined)
      })
      return () => subscription.remove()
    } catch {
      return
    }
  }, [])

  useEffect(() => {
    if (!client) return
    // Every (re)connect: what the daemon supports, fresh tokens and the follows it kept.
    const ready = (hello: Hello) => {
      const supported = hello.live?.follow === true
      useLiveFollowStore.setState(
        supported ? { supported } : { supported, loaded: true, sessionIds: [], autoFollowProfiles: [] },
      )
      if (supported) void request({ type: 'live.follows' }).catch(() => undefined)
    }
    if (client.hello) ready(client.hello)
    const offReady = client.onReady(ready)
    // Live status off: stop following everything, auto-follow included.
    const offSettings = useLiveStatusSettings.subscribe((settings, previous) => {
      if (settings.enabled || !previous.enabled) return
      const { sessionIds, autoFollowProfiles } = useLiveFollowStore.getState()
      for (const sessionId of sessionIds) void unfollowSession(sessionId).catch(() => undefined)
      for (const profileId of autoFollowProfiles) void setAutoFollow(profileId, false).catch(() => undefined)
    })
    return () => {
      offReady()
      offSettings()
    }
  }, [client])
}

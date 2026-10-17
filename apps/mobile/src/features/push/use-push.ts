import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AppState, Platform } from 'react-native'
import { useConnectionStore } from '@/core/connection'
import type { TFunction } from '@/core/i18n/create'
import { devicePlatform } from '@/core/platform/platform'
import { loadMessaging } from './firebase'
import { ACTION_ALLOW, ACTION_DENY, extractPushData, PERMISSION_CATEGORY, type PushData } from './payload'
import { createTapDeduper, LIVE_STATUS_CHANNEL_ID, NOTIFICATION_CHANNEL_ID } from './platform'
import { respondInBackground } from './respond-in-background'

Notifications.setNotificationHandler({
  // In the foreground the app shows the event itself (and the daemon skips push anyway).
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

const isAndroid = Platform.OS === 'android'
const firstTap = createTapDeduper()

async function registerCategory(t: TFunction) {
  await Notifications.setNotificationCategoryAsync(PERMISSION_CATEGORY, [
    {
      identifier: ACTION_ALLOW,
      buttonTitle: t('permissions.allow'),
      options: { opensAppToForeground: false, isAuthenticationRequired: true },
    },
    {
      identifier: ACTION_DENY,
      buttonTitle: t('permissions.deny'),
      options: { opensAppToForeground: false, isDestructive: true },
    },
  ])
}

/** High-importance channel the daemon targets; Android 13+ only asks for permission once one exists. */
async function registerChannel(t: TFunction) {
  if (!isAndroid) return
  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
    name: t('push.channelName'),
    description: t('push.channelDescription'),
    importance: Notifications.AndroidImportance.HIGH,
  })
  // Live status: silent, no heads-up, replaced in place on each update.
  await Notifications.setNotificationChannelAsync(LIVE_STATUS_CHANNEL_ID, {
    name: t('liveStatus.channelName'),
    description: t('liveStatus.channelDescription'),
    importance: Notifications.AndroidImportance.LOW,
    sound: null,
    enableVibrate: false,
  })
}

/** Notification permission: RN Firebase on iOS; on Android (where it always answers "authorized") the system prompt of Android 13+. */
async function requestPermission(messaging: NonNullable<ReturnType<typeof loadMessaging>>): Promise<boolean> {
  if (isAndroid) {
    const current = await Notifications.getPermissionsAsync()
    if (current.granted) return true
    if (!current.canAskAgain) return false
    return (await Notifications.requestPermissionsAsync()).granted
  }
  const status = await messaging.requestPermission(messaging.getMessaging())
  return (
    status === messaging.AuthorizationStatus.AUTHORIZED ||
    status === messaging.AuthorizationStatus.PROVISIONAL
  )
}

function openSession(data: PushData) {
  if (!firstTap(data.requestId ?? `${data.sessionId}:${data.event ?? ''}`, Date.now())) return
  router.push({ pathname: '/session/[id]', params: { id: data.sessionId } })
}

async function handleResponse(response: Notifications.NotificationResponse) {
  const data = extractPushData(response.notification.request)
  if (!data) return
  const action = response.actionIdentifier
  if ((action === ACTION_ALLOW || action === ACTION_DENY) && data.requestId) {
    const ok = await respondInBackground(data.requestId, action === ACTION_ALLOW ? 'allow' : 'deny')
    if (!ok) openSession(data)
    return
  }
  openSession(data)
}

/** Android: taps on notifications shown by FCM while the app was in the background or closed. */
function listenToFcmTaps(): () => void {
  const messaging = isAndroid ? loadMessaging() : null
  if (!messaging) return () => {}
  const m = messaging.getMessaging()
  const open = (message: { data?: unknown } | null) => {
    const data = message ? extractPushData({ content: { data: message.data } }) : null
    if (data) openSession(data)
  }
  void messaging.getInitialNotification(m).then(open)
  return messaging.onNotificationOpenedApp(m, open)
}

/** Registers the FCM token with the daemon, reports foreground state and routes notification taps. */
export function usePush() {
  const client = useConnectionStore((s) => s.client)
  const { t } = useTranslation()

  // Notification buttons and the Android channel follow the app language.
  useEffect(() => {
    void registerCategory(t)
    void registerChannel(t).catch(() => undefined)
  }, [t])

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((r) => void handleResponse(r))
    void Notifications.getLastNotificationResponseAsync().then((r) => {
      if (r) void handleResponse(r)
    })
    const offFcm = listenToFcmTaps()
    return () => {
      sub.remove()
      offFcm()
    }
  }, [])

  useEffect(() => {
    if (!client) return
    const report = () =>
      client.send({ type: 'app.visibility', foreground: AppState.currentState === 'active' })
    const appState = AppState.addEventListener('change', report)
    const offReady = client.onReady(report)

    const messaging = loadMessaging()
    const platform = devicePlatform(Platform.OS)
    let offToken: (() => void) | undefined
    if (messaging) {
      const m = messaging.getMessaging()
      const register = async () => {
        try {
          if (!(await requestPermission(messaging))) return
          const token = await messaging.getToken(m)
          client.send({ type: 'device.register', fcmToken: token, platform })
        } catch {
          // Push is optional: the app keeps working without it.
        }
      }
      const offReadyToken = client.onReady(() => void register())
      const offRefresh = messaging.onTokenRefresh(m, (token) =>
        client.send({ type: 'device.register', fcmToken: token, platform }),
      )
      offToken = () => {
        offReadyToken()
        offRefresh()
      }
    }
    return () => {
      appState.remove()
      offReady()
      offToken?.()
    }
  }, [client])
}

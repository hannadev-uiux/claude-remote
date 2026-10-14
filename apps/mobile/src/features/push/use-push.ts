import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'
import { useEffect } from 'react'
import { AppState } from 'react-native'
import { useConnectionStore } from '@/core/connection'
import { loadMessaging } from './firebase'
import { ACTION_ALLOW, ACTION_DENY, extractPushData, PERMISSION_CATEGORY, type PushData } from './payload'
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

async function registerCategory() {
  await Notifications.setNotificationCategoryAsync(PERMISSION_CATEGORY, [
    {
      identifier: ACTION_ALLOW,
      buttonTitle: 'Permitir',
      options: { opensAppToForeground: false, isAuthenticationRequired: true },
    },
    {
      identifier: ACTION_DENY,
      buttonTitle: 'Negar',
      options: { opensAppToForeground: false, isDestructive: true },
    },
  ])
}

function openSession(data: PushData) {
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

/** Registers the FCM token with the daemon, reports foreground state and routes notification taps. */
export function usePush() {
  const client = useConnectionStore((s) => s.client)

  useEffect(() => {
    void registerCategory()
    const sub = Notifications.addNotificationResponseReceivedListener((r) => void handleResponse(r))
    void Notifications.getLastNotificationResponseAsync().then((r) => {
      if (r) void handleResponse(r)
    })
    return () => sub.remove()
  }, [])

  useEffect(() => {
    if (!client) return
    const report = () =>
      client.send({ type: 'app.visibility', foreground: AppState.currentState === 'active' })
    const appState = AppState.addEventListener('change', report)
    const offReady = client.onReady(report)

    const messaging = loadMessaging()
    let offToken: (() => void) | undefined
    if (messaging) {
      const m = messaging.getMessaging()
      const register = async () => {
        try {
          const status = await messaging.requestPermission(m)
          if (
            status !== messaging.AuthorizationStatus.AUTHORIZED &&
            status !== messaging.AuthorizationStatus.PROVISIONAL
          )
            return
          const token = await messaging.getToken(m)
          client.send({ type: 'device.register', fcmToken: token })
        } catch {
          // Push is optional: the app keeps working without it.
        }
      }
      const offReadyToken = client.onReady(() => void register())
      const offRefresh = messaging.onTokenRefresh(m, (token) =>
        client.send({ type: 'device.register', fcmToken: token }),
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

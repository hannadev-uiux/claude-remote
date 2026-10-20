import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import {
  answeredLiveNotification,
  isLiveNotificationId,
  liveNotification,
  parseLiveData,
} from '../live-status/android-notification'
import { presentLiveNotification } from '../live-status/android-renderer'
import { loadMessaging } from './firebase'
import { ACTION_ALLOW, ACTION_DENY, extractPushData } from './payload'
import { respondInBackground } from './respond-in-background'

/**
 * Loaded by the entry file (`index.ts`) before Expo Router: headless JS (an FCM message or a
 * notification action with the app closed) never mounts the router, so these handlers must be set at
 * module scope. Android only; nothing happens on iOS.
 */

/** Background task (expo-task-manager) that gets Allow / Deny tapped with the app in the background or closed. */
export const LIVE_ACTION_TASK = 'live-status-action'

const isAndroid = Platform.OS === 'android'

type TaskManagerModule = typeof import('expo-task-manager')

/** `null` on binaries built before expo-task-manager (an over-the-air update): actions then open the app. */
function loadTaskManager(): TaskManagerModule | null {
  try {
    return require('expo-task-manager') as TaskManagerModule
  } catch {
    return null
  }
}

let backgroundActions = false

/** Draws the live status of an FCM data message; `false` when the push is not one. */
export async function showLiveMessage(data: unknown): Promise<boolean> {
  const push = parseLiveData(data)
  if (!push) return false
  await presentLiveNotification(liveNotification(push), backgroundActions)
  return true
}

/**
 * Answers in progress or done, by request: with the app in the background Android hands the same tap
 * to the background task and to the app's listener, and the request must be answered once.
 */
const answers = new Map<string, Promise<boolean>>()

/**
 * Allow / Deny tapped on a notification: answers the request over a short-lived connection and, on a
 * live status, drops the buttons until the daemon's next update. `null` = not an Allow / Deny action.
 */
export function answerAction(response: Notifications.NotificationResponse): Promise<boolean> | null {
  const action = response.actionIdentifier
  if (action !== ACTION_ALLOW && action !== ACTION_DENY) return null
  const { request } = response.notification
  const data = extractPushData(request)
  if (!data?.requestId) return null
  const { requestId, sessionId } = data
  const running = answers.get(requestId)
  if (running) return running
  const answer = respondInBackground(requestId, action === ACTION_ALLOW ? 'allow' : 'deny').then(
    async (ok) => {
      // A failed answer can be tried again.
      if (!ok) answers.delete(requestId)
      if (ok && isAndroid && isLiveNotificationId(request.identifier, sessionId)) {
        const { title, body } = request.content
        await presentLiveNotification(
          answeredLiveNotification({ identifier: request.identifier, title, body, sessionId }),
          backgroundActions,
        ).catch(() => undefined)
      }
      return ok
    },
  )
  answers.set(requestId, answer)
  return answer
}

if (isAndroid) {
  const messaging = loadMessaging()
  // RN Firebase's FCM service wins over expo-notifications' one, so data messages arrive here.
  messaging?.setBackgroundMessageHandler(messaging.getMessaging(), async (message) => {
    await showLiveMessage(message.data).catch(() => undefined)
  })
  const TaskManager = loadTaskManager()
  if (TaskManager) {
    TaskManager.defineTask<Notifications.NotificationTaskPayload>(LIVE_ACTION_TASK, async ({ data }) => {
      if (!data) return
      if ('actionIdentifier' in data) await answerAction(data)
      else await showLiveMessage(data.data).catch(() => undefined)
    })
    backgroundActions = true
    Notifications.registerTaskAsync(LIVE_ACTION_TASK).catch(() => {
      backgroundActions = false
    })
  }
}

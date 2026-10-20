import * as Notifications from 'expo-notifications'
import { ACTION_ALLOW, ACTION_DENY } from '../push/payload'
import { LIVE_STATUS_CHANNEL_ID } from '../push/platform'
import { LIVE_PERMISSION_CATEGORY, type LiveNotification } from './android-notification'

/**
 * Draws (or replaces) the Android live status notification. The Allow / Deny category is set again
 * with the labels of this update (the daemon's language). `backgroundActions` = the binary can answer
 * them without opening the app; otherwise the buttons open it and it answers from there.
 */
export async function presentLiveNotification(
  notification: LiveNotification,
  backgroundActions: boolean,
): Promise<void> {
  const { actions } = notification
  if (actions) {
    const options = { opensAppToForeground: !backgroundActions }
    await Notifications.setNotificationCategoryAsync(LIVE_PERMISSION_CATEGORY, [
      { identifier: ACTION_ALLOW, buttonTitle: actions.allow, options },
      { identifier: ACTION_DENY, buttonTitle: actions.deny, options: { ...options, isDestructive: true } },
    ])
  }
  await Notifications.scheduleNotificationAsync({
    identifier: notification.identifier,
    content: {
      title: notification.title,
      body: notification.body,
      data: notification.data,
      sticky: notification.sticky,
      autoDismiss: !notification.sticky,
      priority: Notifications.AndroidNotificationPriority.LOW,
      ...(actions ? { categoryIdentifier: LIVE_PERMISSION_CATEGORY } : {}),
    },
    trigger: { channelId: LIVE_STATUS_CHANNEL_ID },
  })
}

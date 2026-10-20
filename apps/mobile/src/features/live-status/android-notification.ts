import { type LiveDataMessage, LiveDataMessageSchema, liveNotificationText } from '@remote-harness/protocol'

/** Category of the Android live status while a permission waits (Allow / Deny). */
export const LIVE_PERMISSION_CATEGORY = 'LIVE_PERMISSION'

/** Same id for every update of a session, so each one replaces the last (the Android tag). */
export function liveNotificationId(sessionId: string): string {
  return `live-${sessionId}`
}

/** What the app draws for one Android live status update. */
export type LiveNotification = {
  identifier: string
  title: string
  body: string
  /** Ongoing (cannot be swiped away) while the turn runs or waits. */
  sticky: boolean
  /** Translated Allow / Deny labels when a permission waits; `null` = no buttons. */
  actions: { allow: string; deny: string } | null
  /** Identifiers only: a tap opens the session, an action answers the request. */
  data: { sessionId: string; event: 'live'; requestId?: string }
}

export type LiveDataPush = LiveDataMessage & { sessionId: string }

/** The live status in an FCM data message (`data.live`), `null` for any other push. */
export function parseLiveData(data: unknown): LiveDataPush | null {
  if (!data || typeof data !== 'object') return null
  const { sessionId, event, live } = data as Record<string, unknown>
  if (typeof sessionId !== 'string' || !sessionId || event !== 'live' || typeof live !== 'string') return null
  let json: unknown
  try {
    json = JSON.parse(live)
  } catch {
    return null
  }
  const parsed = LiveDataMessageSchema.safeParse(json)
  return parsed.success ? { ...parsed.data, sessionId } : null
}

/** The notification of an update: buttons only while a permission waits and the turn is not over. */
export function liveNotification(push: LiveDataPush): LiveNotification {
  const { props, event, sessionId } = push
  const open = event === 'update' && (props.state === 'working' || props.state === 'waiting')
  const pending = event === 'update' && props.state === 'waiting' ? props.pending : null
  return {
    identifier: liveNotificationId(sessionId),
    ...liveNotificationText(props),
    sticky: open,
    actions: pending ? { allow: pending.allow, deny: pending.deny } : null,
    data: { sessionId, event: 'live', ...(pending ? { requestId: pending.requestId } : {}) },
  }
}

/**
 * The notification right after Allow / Deny answered it: same text, no buttons, until the daemon's
 * next update shows the resolved state.
 */
export function answeredLiveNotification(shown: {
  identifier: string
  title: string | null
  body: string | null
  sessionId: string
}): LiveNotification {
  return {
    identifier: shown.identifier,
    title: shown.title ?? '',
    body: shown.body ?? '',
    sticky: true,
    actions: null,
    data: { sessionId: shown.sessionId, event: 'live' },
  }
}

/** Whether a notification the app drew is a live status (its id is the per-session one). */
export function isLiveNotificationId(identifier: string, sessionId: string): boolean {
  return identifier === liveNotificationId(sessionId)
}

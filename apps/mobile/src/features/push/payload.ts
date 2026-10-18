/** Data the daemon puts in every push (identifiers only). */
export type PushData = { sessionId: string; profileId?: string; event?: string; requestId?: string }

export const PERMISSION_CATEGORY = 'PERMISSION'
export const ACTION_ALLOW = 'ALLOW'
export const ACTION_DENY = 'DENY'

function pick(source: unknown): PushData | null {
  if (!source || typeof source !== 'object') return null
  const record = source as Record<string, unknown>
  if (typeof record.sessionId !== 'string' || !record.sessionId) return null
  const str = (k: string) => (typeof record[k] === 'string' ? (record[k] as string) : undefined)
  return {
    sessionId: record.sessionId,
    profileId: str('profileId'),
    event: str('event'),
    requestId: str('requestId'),
  }
}

/**
 * FCM data keys land in different places depending on how iOS delivered the notification, so look
 * in the content data first and then in the raw remote payload.
 */
export function extractPushData(request: {
  content?: { data?: unknown }
  trigger?: unknown
}): PushData | null {
  const fromContent = pick(request.content?.data)
  if (fromContent) return fromContent
  const trigger = request.trigger as { payload?: unknown } | null | undefined
  return pick(trigger?.payload)
}

/** The test push the user asked for: shown as a banner even with the app in the foreground. */
export function isTestPush(request: { content?: { data?: unknown }; trigger?: unknown }): boolean {
  const event = (source: unknown) =>
    source && typeof source === 'object' ? (source as Record<string, unknown>).event : undefined
  const trigger = request.trigger as { payload?: unknown } | null | undefined
  return event(request.content?.data) === 'test' || event(trigger?.payload) === 'test'
}

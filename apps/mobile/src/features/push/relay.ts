import type { DevicePlatform, PushRelay } from '@remote-harness/protocol'

export type GrantRequest = { fcmToken: string; platform: DevicePlatform; activityToken?: string }
export type GrantFetch = (url: string, init: RequestInit) => Promise<Pick<Response, 'ok' | 'json'>>

/** Push relay URL baked into this build (`extra.pushRelay`), when it is an HTTPS URL. */
export function pushRelayUrl(extra: unknown): string | null {
  if (!extra || typeof extra !== 'object') return null
  const url = (extra as { pushRelay?: unknown }).pushRelay
  return typeof url === 'string' && url.startsWith('https://') ? url.replace(/\/+$/, '') : null
}

/**
 * Asks the relay for a grant (the tokens sealed by the relay) to give the daemon. Null when the
 * relay refuses or is unreachable: the registration then goes without it.
 */
export async function requestGrant(
  url: string,
  request: GrantRequest,
  appCheckToken: string | null,
  fetchImpl: GrantFetch = fetch,
): Promise<PushRelay | null> {
  try {
    const response = await fetchImpl(`${url}/grant`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(appCheckToken ? { 'x-firebase-appcheck': appCheckToken } : {}),
      },
      body: JSON.stringify(request),
    })
    if (!response.ok) return null
    const body = (await response.json()) as { grant?: unknown }
    return typeof body.grant === 'string' && body.grant ? { url, grant: body.grant } : null
  } catch {
    return null
  }
}

/** Remembers the last grant per request so reconnects do not ask the relay again. */
export function createGrantCache() {
  const cache = new Map<string, PushRelay>()
  const key = (r: GrantRequest) => `${r.platform}|${r.fcmToken}|${r.activityToken ?? ''}`
  return {
    get: (request: GrantRequest) => cache.get(key(request)),
    set: (request: GrantRequest, relay: PushRelay) => {
      if (cache.size > 20) cache.clear()
      cache.set(key(request), relay)
    },
  }
}

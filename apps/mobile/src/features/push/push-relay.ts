import type { PushRelay } from '@remote-harness/protocol'
import Constants from 'expo-constants'
import { appCheckToken } from './app-check'
import { createGrantCache, type GrantRequest, pushRelayUrl, requestGrant } from './relay'

const cache = createGrantCache()

/** Relay data to send with a registration, or undefined when this build has no relay or it failed. */
export async function relayFor(request: GrantRequest): Promise<PushRelay | undefined> {
  const url = pushRelayUrl(Constants.expoConfig?.extra)
  if (!url) return undefined
  const cached = cache.get(request)
  if (cached) return cached
  const relay = await requestGrant(url, request, await appCheckToken())
  if (relay) cache.set(request, relay)
  return relay ?? undefined
}

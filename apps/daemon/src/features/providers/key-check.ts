import type { Provider, ProviderCredits } from '@remote-harness/protocol'
import { parseCredits, providerBaseUrl } from './openrouter.ts'
import type { ProviderFetch } from './service.ts'

export type KeyCheck =
  | { status: 'valid'; credits: ProviderCredits | null }
  | { status: 'invalid' }
  | { status: 'unknown'; reason: string }

/**
 * Asks the gateway whether it accepts the key. `/v1/credits` gives the credits but OpenRouter only
 * answers it for management keys (403 for regular ones), so `/v1/key` confirms a regular key. The key
 * only travels to the gateway, in the `Authorization` header.
 */
export async function checkProviderKey(
  fetch: ProviderFetch,
  provider: Pick<Provider, 'baseUrl'>,
  key: string,
): Promise<KeyCheck> {
  const baseUrl = providerBaseUrl(provider)
  const headers = { Accept: 'application/json', Authorization: `Bearer ${key}` }
  try {
    const credits = await fetch(`${baseUrl}/v1/credits`, { headers })
    if (credits.ok) return { status: 'valid', credits: parseCredits(await credits.json()) }
    if (credits.status === 401) return { status: 'invalid' }
    const info = await fetch(`${baseUrl}/v1/key`, { headers })
    if (info.ok) return { status: 'valid', credits: null }
    if (info.status === 401) return { status: 'invalid' }
    return { status: 'unknown', reason: `HTTP ${info.status}` }
  } catch (error) {
    return { status: 'unknown', reason: error instanceof Error ? error.message : String(error) }
  }
}

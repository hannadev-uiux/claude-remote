/**
 * Expo Updates protocol 1 (https://docs.expo.dev/technical-specs/expo-updates-1/) for the app's
 * updates server. Pure: request parsing and response pieces, no I/O.
 */

export const PLATFORMS = ['ios', 'android'] as const
export type Platform = (typeof PLATFORMS)[number]

/** SHA-256 in base64url without padding: 43 characters, also the storage key, so no traversal. */
export const ASSET_HASH = /^[A-Za-z0-9_-]{43}$/
export const RUNTIME_VERSION = /^[\w.-]{1,128}$/
/** Path every asset URL signed into a manifest must end with (then the asset's hash). */
export const ASSETS_PATH = '/api/updates/assets/'

/** Update channel (`expo-channel-name`); builds without the header follow `production`. */
export const DEFAULT_CHANNEL = 'production'
export const DEVELOPMENT_CHANNEL = 'development'
const CHANNEL = /^[a-z][a-z0-9-]{0,31}$/

export function isPlatform(value: unknown): value is Platform {
  return (PLATFORMS as readonly unknown[]).includes(value)
}

/** Platform names were path segments on the first server, so they are never channels. */
export function isChannel(value: string): boolean {
  return CHANNEL.test(value) && !isPlatform(value)
}

export type ManifestRequest =
  | { ok: true; platform: Platform; runtimeVersion: string; channel: string; multipart: boolean }
  | { ok: false; status: 400 | 406; error: string }

export function parseManifestRequest(headers: Headers): ManifestRequest {
  const protocol = headers.get('expo-protocol-version')
  if (protocol !== null && protocol !== '1')
    return { ok: false, status: 406, error: 'unsupported_protocol_version' }
  const platform = headers.get('expo-platform')
  if (!isPlatform(platform)) return { ok: false, status: 400, error: 'invalid_platform' }
  const runtimeVersion = headers.get('expo-runtime-version') ?? ''
  if (!RUNTIME_VERSION.test(runtimeVersion))
    return { ok: false, status: 400, error: 'invalid_runtime_version' }
  const channel = headers.get('expo-channel-name') ?? DEFAULT_CHANNEL
  if (!isChannel(channel)) return { ok: false, status: 400, error: 'invalid_channel' }
  const accept = headers.get('accept') ?? ''
  // The client prefers multipart; plain JSON only when that is all it accepts.
  const multipart = accept === '' || accept.includes('multipart/mixed') || accept.includes('*/*')
  return { ok: true, platform, runtimeVersion, channel, multipart }
}

/** Headers of every manifest answer (protocol 1, never cached by intermediaries). */
export const PROTOCOL_HEADERS = {
  'expo-protocol-version': '1',
  'expo-sfv-version': '0',
  'cache-control': 'private, max-age=0',
} as const

/**
 * `expo-manifest-filters` for a channel: the app sets aside stored updates whose signed
 * `metadata.channel` differs, so switching channels never keeps the other channel's newer update.
 */
export function manifestFilters(channel: string): string {
  return `channel="${channel}"`
}

/** `multipart/mixed` body with one signed `manifest` part, byte-exact (the signature covers it). */
export function multipartManifest(
  manifest: string,
  signature: string,
  boundary: string,
): { body: string; contentType: string } {
  const body = [
    `--${boundary}`,
    'content-disposition: form-data; name="manifest"',
    'content-type: application/json; charset=utf-8',
    `expo-signature: ${signature}`,
    '',
    manifest,
    `--${boundary}--`,
    '',
  ].join('\r\n')
  return { body, contentType: `multipart/mixed; boundary=${boundary}` }
}

/** SHA-256 of `data` in base64url without padding, the asset hash format. */
export async function sha256Base64Url(data: ArrayBuffer | Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', data))
  let binary = ''
  for (const byte of digest) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

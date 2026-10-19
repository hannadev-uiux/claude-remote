import { DEVELOPMENT_CHANNEL } from './protocol.ts'

/** The Worker's publish secrets; either may be unset. */
export type PublishTokens = { token?: string | undefined; devToken?: string | undefined }

/** Publishing is off (404) without any publish token. */
export function publishEnabled(tokens: PublishTokens): boolean {
  return Boolean(tokens.token || tokens.devToken)
}

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))
}

/** Constant time over SHA-256 digests (always 32 bytes, whatever the token lengths). */
async function matches(expected: string | undefined, presented: string): Promise<boolean> {
  if (!expected) return false
  const [a, b] = await Promise.all([digest(expected), digest(presented)])
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0)
  return diff === 0
}

/**
 * `Authorization: Bearer <token>`. The production token publishes to any channel; the development
 * token (the one CI holds) only to `development`. Assets are shared and content-addressed, so
 * `channel` null (an asset upload, or the first check before the body is read) accepts either.
 */
export async function authorized(
  authorization: string | null,
  tokens: PublishTokens,
  channel: string | null = null,
): Promise<boolean> {
  const presented = /^Bearer (.+)$/.exec(authorization ?? '')?.[1]
  if (!presented) return false
  if (await matches(tokens.token, presented)) return true
  return (channel === null || channel === DEVELOPMENT_CHANNEL) && (await matches(tokens.devToken, presented))
}

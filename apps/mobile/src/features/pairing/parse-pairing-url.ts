import { z } from 'zod'
import type { Credentials } from '@/core/storage/credentials'

const CredentialsSchema = z.object({
  host: z.string().trim().min(1),
  port: z.coerce.number().int().min(1).max(65535),
  token: z.string().trim().min(16),
})

/** Validates manually typed or scanned pairing data. */
export function parseCredentials(input: {
  host?: unknown
  port?: unknown
  token?: unknown
}): Credentials | null {
  const parsed = CredentialsSchema.safeParse(input)
  return parsed.success ? parsed.data : null
}

/** Parses `claude-remote://pair?host=…&port=…&token=…` as printed by `remote-harness pair`. */
export function parsePairingUrl(raw: string): Credentials | null {
  const text = raw.trim()
  const match = /^claude-remote:\/\/pair\/?\?(.*)$/i.exec(text)
  if (!match?.[1]) return null
  const params = new URLSearchParams(match[1])
  return parseCredentials({
    host: params.get('host') ?? '',
    port: params.get('port') ?? '',
    token: params.get('token') ?? '',
  })
}

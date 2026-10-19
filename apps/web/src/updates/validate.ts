import { z } from 'zod'
import {
  ASSET_HASH,
  ASSETS_PATH,
  DEFAULT_CHANNEL,
  isChannel,
  PLATFORMS,
  RUNTIME_VERSION,
} from './protocol.ts'

export const MAX_MANIFEST_BYTES = 1024 * 1024
export const MAX_ASSET_BYTES = 50 * 1024 * 1024

const Asset = z.object({
  hash: z.string().regex(ASSET_HASH),
  key: z.string().min(1).max(256),
  contentType: z.string().min(1).max(128),
  fileExtension: z.string().startsWith('.').max(16).optional(),
  url: z.url(),
})

const Manifest = z.object({
  id: z.uuid(),
  createdAt: z.iso.datetime({ offset: true }),
  runtimeVersion: z.string().regex(RUNTIME_VERSION),
  launchAsset: Asset,
  assets: z.array(Asset).max(2000),
  metadata: z.record(z.string(), z.string()),
  extra: z.unknown().optional(),
})
export type ParsedManifest = z.infer<typeof Manifest>

export const PublishBody = z.object({
  platform: z.enum(PLATFORMS),
  channel: z.string().refine(isChannel).default(DEFAULT_CHANNEL),
  runtimeVersion: z.string().regex(RUNTIME_VERSION),
  /** The exact JSON string that was signed; stored and served as is. */
  manifest: z.string().min(2).max(MAX_MANIFEST_BYTES),
  /** SFV dictionary for the `expo-signature` part header, e.g. `sig="…", keyid="main"`. */
  signature: z
    .string()
    .regex(/(^|,\s*)sig="[A-Za-z0-9+/=]+"/)
    .max(4096),
})
export type PublishBody = z.infer<typeof PublishBody>

export type CheckedManifest =
  | { ok: true; manifest: ParsedManifest; hashes: string[] }
  | { ok: false; error: string }

/**
 * Checks a signed manifest before it is stored. The signature itself is not verified here (the
 * server has no certificate to trust); the app verifies it against the one embedded in its build.
 */
export function checkManifest(body: PublishBody): CheckedManifest {
  let json: unknown
  try {
    json = JSON.parse(body.manifest)
  } catch {
    return { ok: false, error: 'manifest_not_json' }
  }
  const parsed = Manifest.safeParse(json)
  if (!parsed.success) return { ok: false, error: 'manifest_invalid' }
  const manifest = parsed.data
  if (manifest.runtimeVersion !== body.runtimeVersion) return { ok: false, error: 'runtime_version_mismatch' }
  const all = [manifest.launchAsset, ...manifest.assets]
  for (const asset of all) {
    if (!new URL(asset.url).pathname.endsWith(`${ASSETS_PATH}${asset.hash}`)) {
      return { ok: false, error: 'asset_url_mismatch' }
    }
  }
  return { ok: true, manifest, hashes: [...new Set(all.map((asset) => asset.hash))] }
}

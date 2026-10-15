/**
 * Pure part of the OTA publisher: turns an `expo export` into Expo Updates manifests (protocol 1)
 * and signs them. Used by scripts/publish-update.mts; tested with Vitest.
 */
import { createHash, type KeyObject, sign } from 'node:crypto'

export const ASSETS_PATH = '/api/claude-remote/updates/assets/'

const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  ttf: 'font/ttf',
  otf: 'font/otf',
  woff: 'font/woff',
  woff2: 'font/woff2',
  json: 'application/json',
  html: 'text/html',
  js: 'application/javascript',
}

export function contentTypeFor(ext: string): string {
  return CONTENT_TYPES[ext.toLowerCase()] ?? 'application/octet-stream'
}

/** `dist/metadata.json` written by `expo export`. */
export type ExportMetadata = {
  fileMetadata: Partial<
    Record<'ios' | 'android', { bundle: string; assets: Array<{ path: string; ext: string }> }>
  >
}

export type ManifestAsset = {
  hash: string
  key: string
  contentType: string
  fileExtension?: string
  url: string
}

export type UpdateFile = { path: string; data: Uint8Array; contentType: string; hash: string }

export function sha256(data: Uint8Array): string {
  return createHash('sha256').update(data).digest('base64url')
}

/** Expo looks assets up by the md5 Metro gives them, which is also their file name. */
function md5(data: Uint8Array): string {
  return createHash('md5').update(data).digest('hex')
}

export function buildManifest(o: {
  id: string
  createdAt: string
  runtimeVersion: string
  server: string
  bundle: { data: Uint8Array }
  assets: Array<{ data: Uint8Array; ext: string }>
  expoClient: unknown
}): { manifest: string; files: UpdateFile[] } {
  const base = `${o.server.replace(/\/+$/, '')}${ASSETS_PATH}`
  const files: UpdateFile[] = []
  const entry = (data: Uint8Array, contentType: string, ext?: string): ManifestAsset => {
    const hash = sha256(data)
    files.push({ path: hash, data, contentType, hash })
    return {
      hash,
      key: md5(data),
      contentType,
      ...(ext ? { fileExtension: `.${ext}` } : {}),
      url: `${base}${hash}`,
    }
  }
  const manifest = {
    id: o.id,
    createdAt: o.createdAt,
    runtimeVersion: o.runtimeVersion,
    launchAsset: entry(o.bundle.data, 'application/javascript'),
    assets: o.assets.map((a) => entry(a.data, contentTypeFor(a.ext), a.ext)),
    metadata: {},
    // Constants.expoConfig of the running update comes from here.
    extra: { expoClient: o.expoClient },
  }
  const unique = [...new Map(files.map((f) => [f.hash, f])).values()]
  return { manifest: JSON.stringify(manifest), files: unique }
}

/** `expo-signature` value: RSA-SHA256 over the exact manifest string (`keyid` matches app.config). */
export function signatureHeader(manifest: string, privateKey: KeyObject, keyid = 'main'): string {
  const sig = sign('sha256', Buffer.from(manifest, 'utf8'), privateKey).toString('base64')
  return `sig="${sig}", keyid="${keyid}"`
}

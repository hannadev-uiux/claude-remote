/**
 * The updates server behind `/api/updates/<path>`: the manifest the app asks for, the assets it
 * downloads and the two publish endpoints `scripts/publish-update.mts` calls. Storage and secrets
 * are injected, so every route is tested with an in-memory store.
 */
import { authorized, type PublishTokens, publishEnabled } from './auth.ts'
import {
  ASSET_HASH,
  manifestFilters,
  multipartManifest,
  PROTOCOL_HEADERS,
  parseManifestRequest,
  sha256Base64Url,
} from './protocol.ts'
import type { UpdatesStore } from './store.ts'
import { checkManifest, MAX_ASSET_BYTES, MAX_MANIFEST_BYTES, PublishBody } from './validate.ts'

const json = (body: unknown, status: number, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers })
const notFound = () => new Response('Not found', { status: 404 })
const notAllowed = (allow: string) => new Response(null, { status: 405, headers: { allow } })
const unauthorized = () => new Response('Unauthorized', { status: 401 })

/** Latest signed update for the app's channel, platform and runtime version. */
async function manifest(request: Request, store: UpdatesStore): Promise<Response> {
  const parsed = parseManifestRequest(request.headers)
  if (!parsed.ok) return json({ error: parsed.error }, parsed.status, PROTOCOL_HEADERS)
  const stored = await store.latestManifest(parsed.channel, parsed.platform, parsed.runtimeVersion)
  const headers = { ...PROTOCOL_HEADERS, 'expo-manifest-filters': manifestFilters(parsed.channel) }
  if (!stored) return new Response(null, { status: 204, headers })
  if (!parsed.multipart) {
    return new Response(stored.manifest, {
      headers: { ...headers, 'content-type': 'application/expo+json', 'expo-signature': stored.signature },
    })
  }
  const { body, contentType } = multipartManifest(stored.manifest, stored.signature, crypto.randomUUID())
  return new Response(body, { headers: { ...headers, 'content-type': contentType } })
}

/** Content-addressed asset: its URL never changes meaning, so it is cached forever. */
async function asset(
  request: Request,
  hash: string,
  store: UpdatesStore,
  tokens: PublishTokens,
): Promise<Response> {
  if (request.method === 'GET') {
    if (!ASSET_HASH.test(hash)) return notFound()
    const stored = await store.getAsset(hash)
    if (!stored) return notFound()
    return new Response(stored.body, {
      headers: {
        'content-type': stored.contentType,
        'content-length': String(stored.size),
        'cache-control': 'public, max-age=31536000, immutable',
      },
    })
  }
  if (request.method === 'HEAD') {
    if (!ASSET_HASH.test(hash)) return notFound()
    return new Response(null, { status: (await store.hasAsset(hash)) ? 200 : 404 })
  }
  if (request.method !== 'PUT') return notAllowed('GET, HEAD, PUT')
  if (!publishEnabled(tokens)) return notFound()
  if (!(await authorized(request.headers.get('authorization'), tokens))) return unauthorized()
  if (!ASSET_HASH.test(hash)) return json({ error: 'invalid_hash' }, 400)
  if (Number(request.headers.get('content-length') ?? 0) > MAX_ASSET_BYTES)
    return json({ error: 'too_large' }, 413)
  const data = new Uint8Array(await request.arrayBuffer())
  if (data.byteLength > MAX_ASSET_BYTES) return json({ error: 'too_large' }, 413)
  if ((await sha256Base64Url(data)) !== hash) return json({ error: 'hash_mismatch' }, 400)
  const contentType = (request.headers.get('content-type') || 'application/octet-stream').slice(0, 128)
  await store.putAsset(hash, data, contentType)
  return new Response(null, { status: 201 })
}

/** Stores a manifest signed by the publisher in its channel; its assets must already be uploaded. */
async function publish(request: Request, store: UpdatesStore, tokens: PublishTokens): Promise<Response> {
  if (request.method !== 'POST') return notAllowed('POST')
  if (!publishEnabled(tokens)) return notFound()
  // Any publish token gets this far; the channel check comes once the body names the channel.
  if (!(await authorized(request.headers.get('authorization'), tokens))) return unauthorized()
  const text = await request.text()
  if (text.length > MAX_MANIFEST_BYTES * 2) return json({ error: 'too_large' }, 413)
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return json({ error: 'body_not_json' }, 400)
  }
  const body = PublishBody.safeParse(raw)
  if (!body.success) return json({ error: 'body_invalid' }, 400)
  if (!(await authorized(request.headers.get('authorization'), tokens, body.data.channel))) {
    return json({ error: 'channel_not_allowed' }, 403)
  }
  const checked = checkManifest(body.data)
  if (!checked.ok) return json({ error: checked.error }, 400)
  for (const hash of checked.hashes) {
    if (!(await store.hasAsset(hash))) return json({ error: 'asset_missing', hash }, 409)
  }
  const { channel, platform, runtimeVersion, manifest: signed, signature } = body.data
  await store.putManifest(channel, platform, runtimeVersion, checked.manifest, {
    manifest: signed,
    signature,
  })
  return json({ id: checked.manifest.id }, 201)
}

/** `path` is what follows `/api/updates/` (no `..`, never empty: the router checks). */
export async function handleUpdates(
  request: Request,
  path: string,
  store: UpdatesStore,
  tokens: PublishTokens,
): Promise<Response> {
  if (path === 'manifest') {
    return request.method === 'GET' ? manifest(request, store) : notAllowed('GET')
  }
  if (path === 'manifests') return publish(request, store, tokens)
  const assetPath = /^assets\/([^/]+)$/.exec(path)
  if (assetPath) return asset(request, assetPath[1] ?? '', store, tokens)
  return notFound()
}

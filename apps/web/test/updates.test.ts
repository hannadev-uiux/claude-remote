import { describe, expect, test } from 'vitest'
import { authorized } from '../src/updates/auth.ts'
import { handleUpdates } from '../src/updates/handler.ts'
import {
  isChannel,
  manifestFilters,
  multipartManifest,
  type Platform,
  parseManifestRequest,
  sha256Base64Url,
} from '../src/updates/protocol.ts'
import { keys, type StoredAsset, type StoredManifest, type UpdatesStore } from '../src/updates/store.ts'
import { checkManifest, PublishBody } from '../src/updates/validate.ts'

class MemoryStore implements UpdatesStore {
  assets = new Map<string, { data: Uint8Array; contentType: string }>()
  objects = new Map<string, StoredManifest>()

  async hasAsset(hash: string) {
    return this.assets.has(hash)
  }
  async getAsset(hash: string): Promise<StoredAsset | null> {
    const a = this.assets.get(hash)
    return a ? { body: a.data, contentType: a.contentType, size: a.data.byteLength } : null
  }
  async putAsset(hash: string, data: Uint8Array, contentType: string) {
    this.assets.set(hash, { data, contentType })
  }
  async putManifest(
    channel: string,
    platform: Platform,
    runtime: string,
    meta: { id: string; createdAt: string },
    stored: StoredManifest,
  ) {
    this.objects.set(keys.history(channel, platform, runtime, meta), stored)
    this.objects.set(keys.latest(channel, platform, runtime), stored)
  }
  async latestManifest(channel: string, platform: Platform, runtime: string) {
    return this.objects.get(keys.latest(channel, platform, runtime)) ?? null
  }
}

const BASE = 'https://remoteharness.app/api/updates'
const TOKENS = { token: 'prod-token', devToken: 'dev-token' }
const SIGNATURE = 'sig="c2lnbmF0dXJl", keyid="main"'
const bundle = new TextEncoder().encode('console.log("bundle")')

function request(path: string, init: RequestInit = {}): Request {
  return new Request(`${BASE}/${path}`, init)
}

async function manifestFor(hash: string, over: Record<string, unknown> = {}) {
  return JSON.stringify({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    runtimeVersion: 'abc',
    launchAsset: { hash, key: 'k', contentType: 'application/javascript', url: `${BASE}/assets/${hash}` },
    assets: [],
    metadata: { channel: 'production' },
    ...over,
  })
}

async function publish(store: MemoryStore, body: Record<string, unknown>, token = TOKENS.token) {
  return handleUpdates(
    request('manifests', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    'manifests',
    store,
    TOKENS,
  )
}

async function uploadBundle(
  store: MemoryStore,
  token = TOKENS.token,
): Promise<{ hash: string; res: Response }> {
  const hash = await sha256Base64Url(bundle)
  const res = await handleUpdates(
    request(`assets/${hash}`, {
      method: 'PUT',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/javascript' },
      body: bundle,
    }),
    `assets/${hash}`,
    store,
    TOKENS,
  )
  return { hash, res }
}

const ask = (store: MemoryStore, headers: Record<string, string>) =>
  handleUpdates(request('manifest', { headers }), 'manifest', store, TOKENS)

describe('protocol', () => {
  test('parses the manifest request', () => {
    const ok = parseManifestRequest(new Headers({ 'expo-platform': 'ios', 'expo-runtime-version': 'abc' }))
    expect(ok).toEqual({
      ok: true,
      platform: 'ios',
      runtimeVersion: 'abc',
      channel: 'production',
      multipart: true,
    })
    expect(
      parseManifestRequest(new Headers({ 'expo-platform': 'web', 'expo-runtime-version': 'a' })),
    ).toMatchObject({
      status: 400,
    })
    expect(
      parseManifestRequest(new Headers({ 'expo-platform': 'ios', 'expo-runtime-version': 'a b' })),
    ).toMatchObject({
      status: 400,
    })
    expect(
      parseManifestRequest(
        new Headers({ 'expo-platform': 'ios', 'expo-runtime-version': 'a', 'expo-protocol-version': '0' }),
      ),
    ).toMatchObject({ status: 406 })
    expect(
      parseManifestRequest(
        new Headers({ 'expo-platform': 'ios', 'expo-runtime-version': 'a', accept: 'application/expo+json' }),
      ),
    ).toMatchObject({ multipart: false })
    expect(isChannel('development')).toBe(true)
    expect(isChannel('ios')).toBe(false)
    expect(isChannel('Dev')).toBe(false)
    expect(manifestFilters('development')).toBe('channel="development"')
  })

  test('multipart body is byte-exact', () => {
    const { body, contentType } = multipartManifest('{"a":1}', SIGNATURE, 'b')
    expect(contentType).toBe('multipart/mixed; boundary=b')
    expect(body).toBe(
      `--b\r\ncontent-disposition: form-data; name="manifest"\r\ncontent-type: application/json; charset=utf-8\r\nexpo-signature: ${SIGNATURE}\r\n\r\n{"a":1}\r\n--b--\r\n`,
    )
  })

  test('sha256 in base64url, 43 characters', async () => {
    expect(await sha256Base64Url(new TextEncoder().encode(''))).toBe(
      '47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU',
    )
  })
})

describe('validation and auth', () => {
  test('a manifest must point its assets at this server and match the runtime', async () => {
    const hash = await sha256Base64Url(bundle)
    const body = (manifest: string, runtimeVersion = 'abc') =>
      PublishBody.parse({ platform: 'ios', runtimeVersion, manifest, signature: SIGNATURE })
    expect(checkManifest(body(await manifestFor(hash)))).toMatchObject({ ok: true, hashes: [hash] })
    expect(checkManifest(body(await manifestFor(hash), 'other'))).toEqual({
      ok: false,
      error: 'runtime_version_mismatch',
    })
    const foreign = await manifestFor(hash, {
      launchAsset: {
        hash,
        key: 'k',
        contentType: 'x',
        url: `https://maarkn.dev/api/claude-remote/updates/assets/${hash}`,
      },
    })
    expect(checkManifest(body(foreign))).toEqual({ ok: false, error: 'asset_url_mismatch' })
    expect(checkManifest(body('{"not":"a manifest"}'))).toEqual({ ok: false, error: 'manifest_invalid' })
    expect(
      PublishBody.safeParse({ platform: 'ios', runtimeVersion: 'a', manifest: '{}', signature: 'x' }).success,
    ).toBe(false)
  })

  test('the development token only reaches development and assets', async () => {
    expect(await authorized('Bearer prod-token', TOKENS, 'production')).toBe(true)
    expect(await authorized('Bearer dev-token', TOKENS, 'development')).toBe(true)
    expect(await authorized('Bearer dev-token', TOKENS, null)).toBe(true)
    expect(await authorized('Bearer dev-token', TOKENS, 'production')).toBe(false)
    expect(await authorized('Bearer nope', TOKENS)).toBe(false)
    expect(await authorized(null, TOKENS)).toBe(false)
    expect(await authorized('Bearer dev-token', { token: 'prod-token' })).toBe(false)
  })
})

describe('updates server', () => {
  test('nothing published: 204 with the protocol and filter headers', async () => {
    const res = await ask(new MemoryStore(), { 'expo-platform': 'ios', 'expo-runtime-version': 'abc' })
    expect(res.status).toBe(204)
    expect(res.headers.get('expo-protocol-version')).toBe('1')
    expect(res.headers.get('expo-manifest-filters')).toBe('channel="production"')
    expect(res.headers.get('cache-control')).toBe('private, max-age=0')
  })

  test('publish, then the app gets the newest signed manifest as multipart', async () => {
    const store = new MemoryStore()
    const { hash, res: put } = await uploadBundle(store)
    expect(put.status).toBe(201)
    const first = await manifestFor(hash)
    const second = await manifestFor(hash, { createdAt: new Date(Date.now() + 1000).toISOString() })
    for (const manifest of [first, second]) {
      const res = await publish(store, {
        platform: 'ios',
        runtimeVersion: 'abc',
        manifest,
        signature: SIGNATURE,
      })
      expect(res.status).toBe(201)
    }
    const res = await ask(store, { 'expo-platform': 'ios', 'expo-runtime-version': 'abc' })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/^multipart\/mixed; boundary=/)
    const text = await res.text()
    expect(text).toContain(`expo-signature: ${SIGNATURE}`)
    expect(text).toContain(second)
    expect(text).not.toContain(first)
    const plain = await ask(store, {
      'expo-platform': 'ios',
      'expo-runtime-version': 'abc',
      accept: 'application/expo+json',
    })
    expect(plain.headers.get('expo-signature')).toBe(SIGNATURE)
    expect(await plain.text()).toBe(second)
    expect((await ask(store, { 'expo-platform': 'android', 'expo-runtime-version': 'abc' })).status).toBe(204)
  })

  test('channels are separate; the filter names the asked channel', async () => {
    const store = new MemoryStore()
    const { hash } = await uploadBundle(store, TOKENS.devToken)
    const manifest = await manifestFor(hash, { metadata: { channel: 'development' } })
    const res = await publish(
      store,
      { platform: 'ios', channel: 'development', runtimeVersion: 'abc', manifest, signature: SIGNATURE },
      TOKENS.devToken,
    )
    expect(res.status).toBe(201)
    expect((await ask(store, { 'expo-platform': 'ios', 'expo-runtime-version': 'abc' })).status).toBe(204)
    const dev = await ask(store, {
      'expo-platform': 'ios',
      'expo-runtime-version': 'abc',
      'expo-channel-name': 'development',
    })
    expect(dev.status).toBe(200)
    expect(dev.headers.get('expo-manifest-filters')).toBe('channel="development"')
  })

  test('the development token cannot publish to production', async () => {
    const store = new MemoryStore()
    const { hash } = await uploadBundle(store)
    const res = await publish(
      store,
      { platform: 'ios', runtimeVersion: 'abc', manifest: await manifestFor(hash), signature: SIGNATURE },
      TOKENS.devToken,
    )
    expect(res.status).toBe(403)
    expect(store.objects.size).toBe(0)
  })

  test('wrong token, hash mismatch, missing asset, publishing off', async () => {
    const store = new MemoryStore()
    const { res: wrong } = await uploadBundle(store, 'nope')
    expect(wrong.status).toBe(401)
    expect(store.assets.size).toBe(0)

    const other = 'A'.repeat(43)
    const mismatch = await handleUpdates(
      request(`assets/${other}`, {
        method: 'PUT',
        headers: { authorization: 'Bearer prod-token' },
        body: bundle,
      }),
      `assets/${other}`,
      store,
      TOKENS,
    )
    expect(mismatch.status).toBe(400)
    expect(store.assets.size).toBe(0)

    const missing = await publish(store, {
      platform: 'ios',
      runtimeVersion: 'abc',
      manifest: await manifestFor(other),
      signature: SIGNATURE,
    })
    expect(missing.status).toBe(409)
    expect(await missing.json()).toEqual({ error: 'asset_missing', hash: other })

    const off = await handleUpdates(
      request('manifests', { method: 'POST', body: '{}' }),
      'manifests',
      store,
      {},
    )
    expect(off.status).toBe(404)
  })

  test('assets: immutable GET, HEAD for the publisher, 404 for bad hashes', async () => {
    const store = new MemoryStore()
    const { hash } = await uploadBundle(store)
    const get = await handleUpdates(request(`assets/${hash}`), `assets/${hash}`, store, TOKENS)
    expect(get.status).toBe(200)
    expect(get.headers.get('content-type')).toBe('application/javascript')
    expect(get.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
    expect(new Uint8Array(await get.arrayBuffer())).toEqual(bundle)
    const head = await handleUpdates(
      request(`assets/${hash}`, { method: 'HEAD' }),
      `assets/${hash}`,
      store,
      TOKENS,
    )
    expect(head.status).toBe(200)
    const absent = 'B'.repeat(43)
    expect(
      (
        await handleUpdates(
          request(`assets/${absent}`, { method: 'HEAD' }),
          `assets/${absent}`,
          store,
          TOKENS,
        )
      ).status,
    ).toBe(404)
    expect((await handleUpdates(request('assets/short'), 'assets/short', store, TOKENS)).status).toBe(404)
    expect((await handleUpdates(request('other'), 'other', store, TOKENS)).status).toBe(404)
  })

  test('bad manifest requests', async () => {
    const store = new MemoryStore()
    expect((await ask(store, { 'expo-runtime-version': 'abc' })).status).toBe(400)
    expect(
      (
        await ask(store, {
          'expo-platform': 'ios',
          'expo-runtime-version': 'abc',
          'expo-channel-name': 'ios',
        })
      ).status,
    ).toBe(400)
    const post = await handleUpdates(request('manifest', { method: 'POST' }), 'manifest', store, TOKENS)
    expect(post.status).toBe(405)
  })
})

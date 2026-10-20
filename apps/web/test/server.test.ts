import { mkdtemp, rm } from 'node:fs/promises'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { fsStores, writeAtomic } from '../src/fs-stores.ts'
import { closeServer, createSiteServer, requestUrl } from '../src/server.ts'
import { sha256Base64Url } from '../src/updates/protocol.ts'

const TOKEN = 'tok_aaaaaaaaaaaaaaaaaaaaaaaa'
const PUBLISH = 'prod-token'
let dir = ''
let server: Server
let base = ''

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'rh-server-'))
  server = createSiteServer({ ...fsStores(dir), tokens: { token: PUBLISH } }, () => {})
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})
afterAll(async () => {
  await closeServer(server)
  await rm(dir, { recursive: true, force: true })
})

describe('requestUrl', () => {
  test('takes the scheme from Traefik and the host from the request', () => {
    expect(requestUrl({ host: 'remoteharness.app', 'x-forwarded-proto': 'https' }, '/app/x/')).toBe(
      'https://remoteharness.app/app/x/',
    )
    expect(requestUrl({ host: 'localhost:8080' }, undefined)).toBe('http://localhost:8080/')
    expect(requestUrl({ host: 'h', 'x-forwarded-proto': 'https, http' }, '/')).toBe('https://h/')
  })
})

describe('site server', () => {
  test('pages and installers', async () => {
    const landing = await fetch(`${base}/pt-br/`)
    expect(landing.status).toBe(200)
    expect(landing.headers.get('content-language')).toBe('pt-BR')
    const script = await fetch(`${base}/install`, { headers: { 'user-agent': 'curl/8.7.1' } })
    expect(script.headers.get('content-type')).toBe('text/plain; charset=utf-8')
    expect(await script.text()).toMatch(/^#!\/usr\/bin\/env bash/)
    expect((await fetch(`${base}/install?ref=../x`)).status).toBe(400)
    const head = await fetch(`${base}/`, { method: 'HEAD' })
    expect(head.status).toBe(200)
    expect(await head.text()).toBe('')
  })

  test('updates round trip: upload, publish, manifest, asset', async () => {
    const bundle = new TextEncoder().encode('console.log(1)')
    const hash = await sha256Base64Url(bundle)
    const auth = { authorization: `Bearer ${PUBLISH}` }
    const put = await fetch(`${base}/api/updates/assets/${hash}`, {
      method: 'PUT',
      headers: { ...auth, 'content-type': 'application/javascript' },
      body: bundle,
    })
    expect(put.status).toBe(201)
    expect((await fetch(`${base}/api/updates/assets/${hash}`, { method: 'HEAD' })).status).toBe(200)
    const manifest = JSON.stringify({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      runtimeVersion: 'abc',
      launchAsset: {
        hash,
        key: 'k',
        contentType: 'application/javascript',
        url: `${base}/api/updates/assets/${hash}`,
      },
      assets: [],
      metadata: { channel: 'production' },
    })
    const signature = 'sig="c2ln", keyid="main"'
    const publish = await fetch(`${base}/api/updates/manifests`, {
      method: 'POST',
      headers: { ...auth, 'content-type': 'application/json' },
      body: JSON.stringify({ platform: 'ios', runtimeVersion: 'abc', manifest, signature }),
    })
    expect(publish.status).toBe(201)
    const latest = await fetch(`${base}/api/updates/manifest`, {
      headers: { 'expo-platform': 'ios', 'expo-runtime-version': 'abc', accept: 'application/expo+json' },
    })
    expect(latest.headers.get('expo-signature')).toBe(signature)
    expect(await latest.text()).toBe(manifest)
    const asset = await fetch(`${base}/api/updates/assets/${hash}`)
    expect(asset.headers.get('content-type')).toBe('application/javascript')
    expect(new Uint8Array(await asset.arrayBuffer())).toEqual(bundle)
    expect((await fetch(`${base}/api/updates/manifests`, { method: 'POST', body: '{}' })).status).toBe(401)
  })

  test('install link folder', async () => {
    const builds = { ios: { version: '0.14.0', build: '42', builtAt: '2026-10-19T12:00:00Z' } }
    await writeAtomic(join(dir, 'app', TOKEN, 'builds.json'), JSON.stringify(builds))
    await writeAtomic(join(dir, 'app', TOKEN, 'RemoteHarness.ipa'), 'ipa-bytes')
    const page = await fetch(`${base}/app/${TOKEN}/`, {
      headers: { 'x-forwarded-proto': 'https', 'user-agent': 'Mozilla/5.0 (iPhone)' },
    })
    expect(page.status).toBe(200)
    expect(page.headers.get('referrer-policy')).toBe('no-referrer')
    expect(await page.text()).toContain('0.14.0')
    const ipa = await fetch(`${base}/ios/${TOKEN}/RemoteHarness.ipa`)
    expect(ipa.headers.get('content-type')).toBe('application/octet-stream')
    expect(ipa.headers.get('content-length')).toBe('9')
    expect(await ipa.text()).toBe('ipa-bytes')
    expect((await fetch(`${base}/app/${TOKEN}/RemoteHarness.apk`)).status).toBe(404)
    expect((await fetch(`${base}/app/${TOKEN}/builds.json`)).status).toBe(404)
    expect((await fetch(`${base}/app/tok_bbbbbbbbbbbbbbbbbbbbbbbb/`)).status).toBe(404)
  })
})

import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { FsBuildsStore, FsUpdatesStore, pathIn, writeAtomic } from '../src/fs-stores.ts'
import { keys } from '../src/updates/store.ts'

let dir = ''
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'rh-web-'))
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

const HASH = 'a'.repeat(43)
const meta = { id: '7f827422-39a6-48ef-bf33-5e4532f0d10d', createdAt: '2026-10-19T23:51:47.676Z' }

describe('pathIn', () => {
  test('keeps keys inside the root and refuses the rest', () => {
    expect(pathIn('/data/app', 'tok/RemoteHarness.ipa')).toBe('/data/app/tok/RemoteHarness.ipa')
    expect(pathIn('/data/app', '../updates/x')).toBeNull()
    expect(pathIn('/data/app', '/etc/passwd')).toBeNull()
    expect(pathIn('/data/app', '')).toBeNull()
  })
})

describe('FsUpdatesStore', () => {
  test('assets keep their content type and stream back', async () => {
    const store = new FsUpdatesStore(dir)
    expect(await store.hasAsset(HASH)).toBe(false)
    expect(await store.getAsset(HASH)).toBeNull()
    await store.putAsset(HASH, new TextEncoder().encode('bundle'), 'application/javascript')
    expect(await store.hasAsset(HASH)).toBe(true)
    const asset = await store.getAsset(HASH)
    expect(asset).toMatchObject({ contentType: 'application/javascript', size: 6 })
    expect(await new Response(asset?.body).text()).toBe('bundle')
  })

  test('a publish writes the history entry and the latest pointer in the R2 layout', async () => {
    const store = new FsUpdatesStore(dir)
    expect(await store.latestManifest('production', 'ios', 'abc')).toBeNull()
    await store.putManifest('production', 'ios', 'abc', meta, { manifest: '{"a":1}', signature: 'sig' })
    expect(await store.latestManifest('production', 'ios', 'abc')).toEqual({
      manifest: '{"a":1}',
      signature: 'sig',
    })
    const history = await readFile(join(dir, keys.history('production', 'ios', 'abc', meta)), 'utf8')
    expect(JSON.parse(history)).toEqual({ manifest: '{"a":1}', signature: 'sig' })
  })

  test('a broken pointer reads as no update', async () => {
    const store = new FsUpdatesStore(dir)
    await writeAtomic(join(dir, keys.latest('production', 'ios', 'abc')), 'not json')
    expect(await store.latestManifest('production', 'ios', 'abc')).toBeNull()
  })

  test('writes leave no temporary files behind', async () => {
    const store = new FsUpdatesStore(dir)
    await store.putAsset(HASH, new Uint8Array([1, 2, 3]), 'image/png')
    expect((await readdir(join(dir, 'assets'))).sort()).toEqual([HASH, `${HASH}.type`])
  })
})

describe('FsBuildsStore', () => {
  test('serves files of a token folder with size, etag and text', async () => {
    await writeAtomic(join(dir, 'tok', 'builds.json'), '{"ios":{}}')
    const store = new FsBuildsStore(dir)
    const file = await store.get('tok/builds.json')
    expect(file?.size).toBe(10)
    expect(file?.etag).toMatch(/^"[0-9a-f]+-[0-9a-f]+"$/)
    expect(await file?.text()).toBe('{"ios":{}}')
    expect(await new Response(file?.stream()).text()).toBe('{"ios":{}}')
  })

  test('missing files, folders and keys outside the root are not found', async () => {
    await writeFile(join(dir, 'secret'), 'x')
    const store = new FsBuildsStore(join(dir, 'app'))
    expect(await store.get('tok/RemoteHarness.ipa')).toBeNull()
    expect(await store.get('../secret')).toBeNull()
    expect(await new FsBuildsStore(dir).get('')).toBeNull()
  })
})

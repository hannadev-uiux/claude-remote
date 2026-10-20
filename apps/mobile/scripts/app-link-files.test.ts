import { describe, expect, test } from 'vitest'
import { androidVersion, mergeBuilds, WEB_BASE, WEB_DIR, WEB_TOKEN, webHost, webPath } from './app-link-files'

const ios = {
  version: '0.14.0',
  build: '3',
  builtAt: '2026-10-19T21:00:00.000Z',
  title: 'Remote Harness',
  bundleId: 'x.y',
}
const android = { version: '0.14.0', versionCode: '3', builtAt: '2026-10-19T22:00:00.000Z', size: 1 }

describe('web install link', () => {
  test('one link for both phones, under /app/', () => {
    expect(WEB_BASE).toBe('https://remoteharness.app/app')
    expect(WEB_TOKEN.test('aB3_x-9aB3_x-9aB3_x-9aB3_x')).toBe(true)
  })

  test('the site server comes from the environment', () => {
    expect(webHost({ REMOTE_HARNESS_WEB_SSH: 'root@203.0.113.7' })).toEqual({
      host: 'root@203.0.113.7',
      dir: WEB_DIR,
    })
    expect(webHost({ REMOTE_HARNESS_WEB_SSH: 'site', REMOTE_HARNESS_WEB_DIR: '/srv/rh/' })).toEqual({
      host: 'site',
      dir: '/srv/rh',
    })
    expect(webHost({})).toEqual({ error: 'REMOTE_HARNESS_WEB_SSH' })
    expect(webHost({ REMOTE_HARNESS_WEB_SSH: 'a b' })).toEqual({ error: 'REMOTE_HARNESS_WEB_SSH' })
    expect(webHost({ REMOTE_HARNESS_WEB_SSH: 'h', REMOTE_HARNESS_WEB_DIR: "/srv/x'; rm -rf /" })).toEqual({
      error: 'REMOTE_HARNESS_WEB_DIR',
    })
    expect(webHost({ REMOTE_HARNESS_WEB_SSH: 'h', REMOTE_HARNESS_WEB_DIR: '/srv/../etc' })).toEqual({
      error: 'REMOTE_HARNESS_WEB_DIR',
    })
    expect(webPath({ host: 'h', dir: '/srv/rh' }, 'tok', 'builds.json')).toBe(
      '/srv/rh/data/app/tok/builds.json',
    )
  })

  test('each platform replaces its own entry and keeps the other', () => {
    expect(mergeBuilds(null, { ios })).toEqual({ ios })
    expect(mergeBuilds({ ios }, { android })).toEqual({ ios, android })
    const newer = { ...android, versionCode: '4' }
    expect(mergeBuilds({ ios, android }, { android: newer })).toEqual({ ios, android: newer })
    expect(mergeBuilds('broken', { android })).toEqual({ android })
  })

  test('the Android version comes from the app config', () => {
    expect(androidVersion({ version: '0.14.0', android: { versionCode: 12 } })).toEqual({
      version: '0.14.0',
      versionCode: '12',
    })
    expect(androidVersion({})).toEqual({ version: '0', versionCode: '1' })
  })
})

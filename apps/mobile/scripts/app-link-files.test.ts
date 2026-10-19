import { describe, expect, test } from 'vitest'
import { androidVersion, BUILDS_FILE, mergeBuilds, WEB_BASE, WEB_TOKEN, WEB_TYPES } from './app-link-files'

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
    expect(WEB_TYPES['RemoteHarness.apk']).toBe('application/vnd.android.package-archive')
    expect(WEB_TYPES[BUILDS_FILE]).toBe('application/json')
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

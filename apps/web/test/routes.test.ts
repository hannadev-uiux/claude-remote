import { describe, expect, test } from 'vitest'
import { route } from '../src/routes.ts'

const token = 'aB3_x-9aB3_x-9aB3_x-9aB3_x'

describe('route', () => {
  test('forwards the updates API with the query string', () => {
    expect(route('/api/updates/manifest', '?a=1')).toEqual({
      kind: 'updates',
      url: 'https://maarkn.dev/api/claude-remote/updates/manifest?a=1',
    })
    expect(route('/api/updates/assets/abc')).toMatchObject({
      url: 'https://maarkn.dev/api/claude-remote/updates/assets/abc',
    })
    expect(route('/api/updates/')).toEqual({ kind: 'not-found' })
    expect(route('/api/updates/../secret')).toEqual({ kind: 'not-found' })
  })

  test('serves only the three install files under a token', () => {
    expect(route(`/ios/${token}/`)).toEqual({ kind: 'ios', key: `${token}/index.html` })
    expect(route(`/ios/${token}/manifest.plist`)).toEqual({ kind: 'ios', key: `${token}/manifest.plist` })
    expect(route(`/ios/${token}/RemoteHarness.ipa`)).toEqual({
      kind: 'ios',
      key: `${token}/RemoteHarness.ipa`,
    })
    expect(route(`/ios/${token}/other.txt`)).toEqual({ kind: 'not-found' })
    expect(route(`/ios/${token}`)).toEqual({ kind: 'not-found' })
    expect(route('/ios/short/')).toEqual({ kind: 'not-found' })
    expect(route('/ios/')).toEqual({ kind: 'not-found' })
    expect(route('/')).toEqual({ kind: 'not-found' })
  })
})

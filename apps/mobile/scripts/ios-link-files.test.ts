import { describe, expect, test } from 'vitest'
import { buildManifest, buildPage, servedFile, tailnetHost } from './ios-link-files'

const app = { bundleId: 'tech.doctorx.clauderemote', version: '0.6.0', build: '7', title: 'Remote & Harness' }

describe('tailnetHost', () => {
  const status = (extra: object) => ({
    BackendState: 'Running',
    Self: { DNSName: 'mac.tail1.ts.net.' },
    CertDomains: ['mac.tail1.ts.net'],
    ...extra,
  })

  test('returns the MagicDNS name without the trailing dot', () => {
    expect(tailnetHost(status({}))).toEqual({ ok: true, host: 'mac.tail1.ts.net' })
  })

  test('needs Tailscale running and HTTPS certificates for this Mac', () => {
    expect(tailnetHost(status({ BackendState: 'Stopped' }))).toEqual({ ok: false, reason: 'not-running' })
    expect(tailnetHost(status({ CertDomains: null }))).toEqual({ ok: false, reason: 'https-off' })
    expect(tailnetHost(status({ CertDomains: ['other.tail1.ts.net'] }))).toEqual({
      ok: false,
      reason: 'https-off',
    })
    expect(tailnetHost(undefined)).toEqual({ ok: false, reason: 'not-running' })
  })
})

describe('buildManifest', () => {
  test('points at the IPA and escapes the values', () => {
    const manifest = buildManifest(app, 'https://mac.tail1.ts.net/x/RemoteHarness.ipa?v=1&b=2')
    expect(manifest).toContain('<string>https://mac.tail1.ts.net/x/RemoteHarness.ipa?v=1&amp;b=2</string>')
    expect(manifest).toContain('<string>tech.doctorx.clauderemote</string>')
    expect(manifest).toContain('<string>Remote &amp; Harness</string>')
    expect(manifest).toContain('<string>software-package</string>')
  })
})

describe('buildPage', () => {
  test('links to the manifest through itms-services with the URL encoded', () => {
    const page = buildPage(
      app,
      'https://mac.tail1.ts.net/x/manifest.plist?v=1',
      new Date('2026-10-17T12:34:56Z'),
    )
    expect(page).toContain(
      'href="itms-services://?action=download-manifest&amp;url=https%3A%2F%2Fmac.tail1.ts.net%2Fx%2Fmanifest.plist%3Fv%3D1"',
    )
    expect(page).toContain('0.6.0 (7) · built 2026-10-17 12:34 UTC')
    expect(page).toContain('<h1>Remote &amp; Harness</h1>')
  })
})

describe('servedFile', () => {
  test('serves only the page, the manifest and the IPA', () => {
    expect(servedFile('/')).toEqual({ name: 'index.html', type: 'text/html; charset=utf-8' })
    expect(servedFile('/remote-harness')?.name).toBe('index.html')
    expect(servedFile('/remote-harness/')?.name).toBe('index.html')
    expect(servedFile('/manifest.plist?v=1')?.name).toBe('manifest.plist')
    expect(servedFile('/remote-harness/RemoteHarness.ipa?v=1')).toEqual({
      name: 'RemoteHarness.ipa',
      type: 'application/octet-stream',
    })
    expect(servedFile('/../.env.local')).toBeUndefined()
    expect(servedFile('/remote-harness/other.txt')).toBeUndefined()
  })
})

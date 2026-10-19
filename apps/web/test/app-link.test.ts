import { describe, expect, test } from 'vitest'
import { classifyDevice, type LinkBuilds, parseBuilds, renderAppLinkPage } from '../src/app-link.ts'
import { CATALOGS, WEB_LOCALES } from '../src/i18n/index.ts'

const UA = {
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
  // iPadOS Safari in its default desktop mode: the same as macOS Safari.
  ipadDesktop:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  androidPhone:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  androidTablet:
    'Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  windows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
  linux: 'Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0',
}

const BUILDS: LinkBuilds = {
  ios: {
    version: '0.14.0',
    build: '7',
    builtAt: '2026-10-19T21:30:00.000Z',
    title: 'Remote Harness',
    bundleId: 'tech.doctorx.clauderemote',
  },
  android: { version: '0.14.0', versionCode: '7', builtAt: '2026-10-19T22:00:00.000Z', size: 61_400_000 },
}
const PAGE = 'https://remoteharness.app/app/aB3_x-9aB3_x-9aB3_x-9aB3_x/'

describe('classifyDevice', () => {
  test('phones, tablets and desktops', () => {
    expect(classifyDevice(UA.iphone)).toBe('ios')
    expect(classifyDevice(UA.ipad)).toBe('ios')
    expect(classifyDevice(UA.androidPhone)).toBe('android')
    expect(classifyDevice(UA.androidTablet)).toBe('android')
    expect(classifyDevice(UA.mac)).toBe('desktop')
    expect(classifyDevice(UA.windows)).toBe('desktop')
    expect(classifyDevice(UA.linux)).toBe('desktop')
    expect(classifyDevice(null)).toBe('desktop')
  })

  test('desktop-mode iPadOS is a desktop for the server; the page script moves it to iOS', () => {
    expect(classifyDevice(UA.ipadDesktop)).toBe('desktop')
    const html = renderAppLinkPage({ locale: 'en-US', device: 'desktop', builds: BUILDS, pageUrl: PAGE })
    expect(html).toContain('navigator.maxTouchPoints>1')
  })
})

describe('parseBuilds', () => {
  test('keeps valid entries, drops malformed ones, ignores unknown fields', () => {
    expect(parseBuilds(BUILDS)).toEqual(BUILDS)
    expect(parseBuilds({ ...BUILDS, extra: 1, android: { ...BUILDS.android, versionCode: 7 } })).toEqual(
      BUILDS,
    )
    expect(parseBuilds({ ios: { version: '1', build: '1', builtAt: 'yesterday' } })).toEqual({})
    expect(parseBuilds({ android: { version: '', versionCode: '1', builtAt: BUILDS.ios?.builtAt } })).toEqual(
      {},
    )
    expect(parseBuilds(null)).toEqual({})
    expect(parseBuilds('x')).toEqual({})
    expect(
      parseBuilds({ ios: { version: '1', build: 2, builtAt: '2026-10-19T00:00:00Z' } }).ios,
    ).toMatchObject({
      build: '2',
      title: 'Remote Harness',
    })
  })
})

describe('renderAppLinkPage', () => {
  test.each(WEB_LOCALES)('%s: both cards, versions, buttons, hints and the QR code', (locale) => {
    const a = CATALOGS[locale].appLink
    const html = renderAppLinkPage({ locale, device: 'desktop', builds: BUILDS, pageUrl: PAGE })
    expect(html).toContain(`<html lang="${locale}">`)
    expect(html).toContain('<body data-device="desktop">')
    expect(html).toContain(a.ios.install)
    expect(html).toContain(a.android.download)
    expect(html).toContain('2026-10-19 21:30 UTC')
    expect(html).toContain(
      `itms-services://?action=download-manifest&amp;url=${encodeURIComponent(`${PAGE}manifest.plist?v=${Date.parse('2026-10-19T21:30:00.000Z')}`)}`,
    )
    expect(html).toContain(
      `href="${PAGE}RemoteHarness.apk?v=${Date.parse('2026-10-19T22:00:00.000Z')}" download`,
    )
    expect(html).toContain('61 MB')
    expect(html).toContain('<svg')
    expect(html).toContain(a.qrLabel)
    expect(html).not.toMatch(/undefined|\[object Object\]|\{\{/)
  })

  test('private: no external resources, noindex, no referrer', () => {
    const html = renderAppLinkPage({ locale: 'en-US', device: 'ios', builds: BUILDS, pageUrl: PAGE })
    expect(html).toContain('<meta name="robots" content="noindex">')
    expect(html).toContain('<meta name="referrer" content="no-referrer">')
    expect(html).not.toMatch(/(?:src|href)="https?:\/\/(?!remoteharness\.app\/app\/)/)
    expect(html).not.toContain('<link')
  })

  test('the device decides which card comes first and what CSS hides', () => {
    const iphone = renderAppLinkPage({ locale: 'en-US', device: 'ios', builds: BUILDS, pageUrl: PAGE })
    expect(iphone).toContain('<body data-device="ios">')
    expect(iphone.indexOf('class="card ios"')).toBeLessThan(iphone.indexOf('class="card android"'))
    expect(iphone).toContain('[data-device="ios"] .android')
    expect(iphone).toContain('href="?all=1"')
    const android = renderAppLinkPage({ locale: 'en-US', device: 'android', builds: BUILDS, pageUrl: PAGE })
    expect(android.indexOf('class="card android"')).toBeLessThan(android.indexOf('class="card ios"'))
    const all = renderAppLinkPage({ locale: 'en-US', device: 'all', builds: BUILDS, pageUrl: PAGE })
    expect(all).toContain('<body data-device="all">')
  })

  test('a platform that was never published says so, without a button', () => {
    const a = CATALOGS['pt-BR'].appLink
    const html = renderAppLinkPage({
      locale: 'pt-BR',
      device: 'android',
      builds: { ios: BUILDS.ios },
      pageUrl: PAGE,
    })
    expect(html).toContain(a.notPublished)
    expect(html).not.toContain('RemoteHarness.apk')
    expect(html).toContain(a.ios.install)
  })
})

/**
 * The app install link (`/app/<token>/`, also `/ios/<token>/`): which device asks, the builds the
 * publishers described in `builds.json`, and the page. Pure; the Worker reads R2 and wires it up.
 */
import { renderSVG } from 'uqr'
import { esc, inline } from './html.ts'
import { type Locale, messagesFor } from './i18n/index.ts'
import { MARK_REGULAR } from './site.ts'

export const IPA = 'RemoteHarness.ipa'
export const APK = 'RemoteHarness.apk'
export const MANIFEST = 'manifest.plist'
/** Written by the publishers next to the binaries; read by the Worker, never served. */
export const BUILDS = 'builds.json'
/** Page uploaded by publishers before builds.json existed; served when a folder has nothing else. */
export const LEGACY_PAGE = 'index.html'

/** The only files served under a token, with their content types. */
export const APP_FILES: Record<string, string> = {
  [IPA]: 'application/octet-stream',
  [APK]: 'application/vnd.android.package-archive',
  [MANIFEST]: 'text/xml; charset=utf-8',
}

export type Device = 'ios' | 'android' | 'desktop'

/**
 * A hint from the user agent. iPadOS Safari reports a Mac, so it lands on `desktop` here and the
 * page's script moves it to `ios` (touch points); the "show all" link is always there.
 */
export function classifyDevice(userAgent: string | null): Device {
  const ua = userAgent ?? ''
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

export type IosBuild = { version: string; build: string; builtAt: string; title: string; bundleId: string }
export type AndroidBuild = { version: string; versionCode: string; builtAt: string; size: number }
export type LinkBuilds = { ios?: IosBuild; android?: AndroidBuild }

const text = (value: unknown, max = 200): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= max
const date = (value: unknown): value is string => text(value, 40) && !Number.isNaN(Date.parse(value))
const code = (value: unknown): string | undefined =>
  typeof value === 'number' && Number.isInteger(value) ? String(value) : text(value, 40) ? value : undefined

/** `builds.json` as the publishers wrote it; a malformed entry is dropped, unknown fields ignored. */
export function parseBuilds(json: unknown): LinkBuilds {
  const raw = (json && typeof json === 'object' ? json : {}) as Record<string, Record<string, unknown>>
  const builds: LinkBuilds = {}
  const ios = raw.ios
  if (ios && text(ios.version, 40) && code(ios.build) && date(ios.builtAt)) {
    builds.ios = {
      version: ios.version,
      build: code(ios.build) ?? '',
      builtAt: ios.builtAt,
      title: text(ios.title) ? ios.title : 'Remote Harness',
      bundleId: text(ios.bundleId) ? ios.bundleId : '',
    }
  }
  const android = raw.android
  if (android && text(android.version, 40) && code(android.versionCode) && date(android.builtAt)) {
    builds.android = {
      version: android.version,
      versionCode: code(android.versionCode) ?? '',
      builtAt: android.builtAt,
      size: typeof android.size === 'number' && android.size > 0 ? android.size : 0,
    }
  }
  return builds
}

/** UTC, the same in every language, like the build logs. */
function when(iso: string): string {
  return `${new Date(iso).toISOString().replace('T', ' ').slice(0, 16)} UTC`
}

const STYLE = `
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; background: #0d0d0d; color: #e8e6e3; font: 16px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
main { max-width: 640px; margin: 0 auto; padding: 40px 20px 56px; display: flex; flex-direction: column; gap: 18px; }
.brand { display: flex; align-items: center; gap: 10px; font-weight: 700; }
.brand svg { width: 26px; height: 26px; color: #e8a33d; }
h1 { font-size: 26px; line-height: 1.2; margin: 8px 0 0; }
p { margin: 0; }
.muted, .hint { color: #8a8784; font-size: 14px; }
.card { border: 1px solid #2a2a2a; background: #161616; border-radius: 14px; padding: 18px; display: flex; flex-direction: column; gap: 10px; }
.card h2 { margin: 0; font-size: 17px; }
.btn { display: inline-block; align-self: flex-start; padding: 12px 22px; border-radius: 10px; background: #e8a33d; color: #0d0d0d; font-weight: 700; text-decoration: none; }
.qr { display: flex; gap: 16px; align-items: center; }
.qr .code { width: 148px; flex: none; background: #fff; border-radius: 10px; padding: 6px; }
.qr svg { display: block; width: 100%; height: auto; }
a { color: #e8a33d; }
[data-device="ios"] .android, [data-device="ios"] .qr,
[data-device="android"] .ios, [data-device="android"] .qr,
[data-device="desktop"] .all, [data-device="all"] .all { display: none; }
`

/** Desktop-mode iPadOS Safari sends a Mac user agent; touch points give it away. */
const SCRIPT = `(function(){var b=document.body;if(b.dataset.device==='desktop'&&/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1)b.dataset.device='ios'})();`

export type AppLinkPage = {
  locale: Locale
  /** From the user agent, or `all` for the "show all options" view. */
  device: Device | 'all'
  builds: LinkBuilds
  /** The page URL without the query (`https://remoteharness.app/app/<token>/`): QR code and file links. */
  pageUrl: string
}

export function renderAppLinkPage({ locale, device, builds, pageUrl }: AppLinkPage): string {
  const m = messagesFor(locale)
  const a = m.appLink
  const base = pageUrl.replace(/\/?$/, '/')
  const notPublished = `<p class="muted">${esc(a.notPublished)}</p>`

  const ios = builds.ios
  const iosBody = ios
    ? `<p class="muted">${esc(a.version.replace('{{version}}', ios.version).replace('{{build}}', ios.build).replace('{{date}}', when(ios.builtAt)))}</p>
<a class="btn" href="${esc(`itms-services://?action=download-manifest&url=${encodeURIComponent(`${base}${MANIFEST}?v=${Date.parse(ios.builtAt)}`)}`)}">${esc(a.ios.install)}</a>
<p class="hint">${inline(a.ios.registered)}</p>
<p class="hint">${inline(a.ios.developerMode)}</p>`
    : notPublished

  const android = builds.android
  const size = android?.size ? ` · ${a.size.replace('{{size}}', (android.size / 1_000_000).toFixed(0))}` : ''
  const androidBody = android
    ? `<p class="muted">${esc(a.version.replace('{{version}}', android.version).replace('{{build}}', android.versionCode).replace('{{date}}', when(android.builtAt)))}${esc(size)}</p>
<a class="btn" href="${esc(`${base}${APK}?v=${Date.parse(android.builtAt)}`)}" download>${esc(a.android.download)}</a>
<p class="hint">${inline(a.android.unknownApps)}</p>
<p class="hint">${inline(a.android.updates)}</p>`
    : notPublished

  const qr = renderSVG(base, { border: 1, pixelSize: 6, whiteColor: '#ffffff', blackColor: '#0d0d0d' })
  const first = device === 'android' ? 'android' : 'ios'
  const cards = {
    ios: `<section class="card ios"><h2>${esc(a.ios.title)}</h2>${iosBody}</section>`,
    android: `<section class="card android"><h2>${esc(a.android.title)}</h2>${androidBody}</section>`,
  }
  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<meta name="referrer" content="no-referrer">
<title>${esc(a.title)} · Remote Harness</title>
<style>${STYLE}</style>
</head>
<body data-device="${device}">
<main>
  <div class="brand"><svg viewBox="0 0 256 256" aria-hidden="true">${MARK_REGULAR}</svg>Remote Harness</div>
  <h1>${esc(a.title)}</h1>
  <p class="muted">${esc(a.lead)}</p>
  ${first === 'ios' ? cards.ios + cards.android : cards.android + cards.ios}
  <section class="qr"><div class="code" role="img" aria-label="${esc(a.qrLabel)}">${qr}</div><p class="muted">${esc(a.qr)}</p></section>
  <p class="all"><a href="?all=1">${esc(a.showAll)}</a></p>
  <p class="hint">${esc(a.private)}</p>
</main>
<script>${SCRIPT}</script>
</body>
</html>
`
}

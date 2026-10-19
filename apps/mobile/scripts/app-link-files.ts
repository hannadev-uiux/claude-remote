/**
 * Pure pieces of the web install link (`make install-ios-link IOS_LINK=web`,
 * `make install-android-link`): where the builds go and the `builds.json` the Worker renders the
 * page from (apps/web/src/app-link.ts reads the same shape). Tested with Vitest.
 */

/** The link printed to the user; `/ios/<token>/` (the older name) serves the same page. */
export const WEB_BASE = 'https://remoteharness.app/app'
export const WEB_BUCKET = 'remote-harness-ios'
/** The token is the only protection of the web link (the IPA embeds the registered device IDs). */
export const WEB_TOKEN = /^[A-Za-z0-9_-]{24,64}$/
export const BUILDS_FILE = 'builds.json'

/** Content types of everything uploaded under a token. */
export const WEB_TYPES: Record<string, string> = {
  'RemoteHarness.ipa': 'application/octet-stream',
  'RemoteHarness.apk': 'application/vnd.android.package-archive',
  'manifest.plist': 'text/xml; charset=utf-8',
  'index.html': 'text/html; charset=utf-8',
  [BUILDS_FILE]: 'application/json',
}

export type IosBuild = { version: string; build: string; builtAt: string; title: string; bundleId: string }
export type AndroidBuild = { version: string; versionCode: string; builtAt: string; size: number }
export type LinkBuilds = { ios?: IosBuild; android?: AndroidBuild }

/**
 * The folder's `builds.json` after one platform publishes: its entry replaced, the other kept.
 * `current` is whatever the local copy holds (missing or unreadable → nothing to keep).
 */
export function mergeBuilds(current: unknown, update: LinkBuilds): LinkBuilds {
  const kept = current && typeof current === 'object' ? (current as LinkBuilds) : {}
  const merged: LinkBuilds = {}
  const ios = update.ios ?? kept.ios
  const android = update.android ?? kept.android
  if (ios && typeof ios === 'object') merged.ios = ios
  if (android && typeof android === 'object') merged.android = android
  return merged
}

/** `version` and `versionCode` of the Android build, from `expo config --json`. */
export function androidVersion(config: unknown): { version: string; versionCode: string } {
  const c = (config ?? {}) as { version?: unknown; android?: { versionCode?: unknown } }
  const version = typeof c.version === 'string' && c.version ? c.version : '0'
  const code = c.android?.versionCode
  return { version, versionCode: typeof code === 'number' || typeof code === 'string' ? String(code) : '1' }
}

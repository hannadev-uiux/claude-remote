/**
 * Pure pieces of the web install link (`make install-ios-link IOS_LINK=web`,
 * `make install-android-link`): where the builds go and the `builds.json` the site server renders
 * the page from (apps/web/src/app-link.ts reads the same shape). Tested with Vitest.
 */

/** The link printed to the user; `/ios/<token>/` (the older name) serves the same page. */
export const WEB_BASE = 'https://remoteharness.app/app'
/** The token is the only protection of the web link (the IPA embeds the registered device IDs). */
export const WEB_TOKEN = /^[A-Za-z0-9_-]{24,64}$/
export const BUILDS_FILE = 'builds.json'

/** The site server's folder (`REMOTE_HARNESS_WEB_DIR`) when it is not set. */
export const WEB_DIR = '/srv/remote-harness-web'
const WEB_DIR_SHAPE = /^\/[\w./-]+$/

/** Where the publishers copy the builds: `user@host` and the server folder (`data/app/<token>/`). */
export type WebHost = { host: string; dir: string }

/**
 * The site server from the environment (`REMOTE_HARNESS_WEB_SSH`, `REMOTE_HARNESS_WEB_DIR`), or the
 * variable to fix. The folder ends up in a remote shell command, so only plain absolute paths pass.
 */
export function webHost(env: Record<string, string | undefined>): WebHost | { error: string } {
  const host = env.REMOTE_HARNESS_WEB_SSH?.trim() ?? ''
  if (!/^[\w.@-]+$/.test(host)) return { error: 'REMOTE_HARNESS_WEB_SSH' }
  const dir = (env.REMOTE_HARNESS_WEB_DIR?.trim() || WEB_DIR).replace(/\/+$/, '')
  if (!WEB_DIR_SHAPE.test(dir) || dir.split('/').includes('..')) return { error: 'REMOTE_HARNESS_WEB_DIR' }
  return { host, dir }
}

/** A file of a token folder on the server. */
export function webPath(target: WebHost, token: string, name: string): string {
  return `${target.dir}/data/app/${token}/${name}`
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

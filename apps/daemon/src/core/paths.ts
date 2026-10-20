import { existsSync } from 'node:fs'
import { homedir, hostname } from 'node:os'
import { join } from 'node:path'
import { envVar } from './env.ts'

export function expandHome(p: string): string {
  if (p === '~') return homedir()
  if (p.startsWith('~/')) return join(homedir(), p.slice(2))
  return p
}

/** The reverse of `expandHome`: `path` with the home directory shortened to `~`. */
export function shortenHome(path: string, home = homedir()): string {
  if (!home || home === '/') return path
  if (path === home) return '~'
  return path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path
}

/**
 * The computer's name, without the `.local` suffix macOS adds; `REMOTE_HARNESS_HOST_NAME` replaces
 * it (the demo sets it so screenshots never show the real one).
 */
export function hostName(raw = hostname(), env: NodeJS.ProcessEnv = process.env): string {
  return envVar('HOST_NAME', env) ?? raw.replace(/\.local$/i, '')
}

export const DATA_DIR = '.remote-harness'
/** Data directory of installs made before the rename; kept in place, never moved. */
export const LEGACY_DATA_DIR = '.claude-remote'

/**
 * Root directory for everything the daemon persists: the `HOME` override, else `~/.remote-harness`
 * when it exists, else an existing `~/.claude-remote`, else `~/.remote-harness`.
 */
export function dataHome(
  env: NodeJS.ProcessEnv = process.env,
  home = homedir(),
  exists: (path: string) => boolean = existsSync,
): string {
  const override = envVar('HOME', env)
  if (override) return expandHome(override)
  const current = join(home, DATA_DIR)
  const legacy = join(home, LEGACY_DATA_DIR)
  return !exists(current) && exists(legacy) ? legacy : current
}

export const paths = {
  config: () => join(dataHome(), 'config.json'),
  state: () => join(dataHome(), 'state.json'),
  hookSecret: () => join(dataHome(), 'hook-secret'),
  tokenFile: () => join(dataHome(), 'token'),
  /** Token store picked on Linux (`secret-tool` or `file`), kept so every run uses the same one. */
  tokenStoreChoice: () => join(dataHome(), 'token-store'),
  rulesLog: () => join(dataHome(), 'rules-log.jsonl'),
  devices: () => join(dataHome(), 'devices.json'),
  mute: () => join(dataHome(), 'mute.json'),
  liveFollows: () => join(dataHome(), 'live-follows.json'),
  queue: () => join(dataHome(), 'queue.json'),
  /** A profile's provider key when the secret store is the file one (0600, in a 0700 folder). */
  providerKey: (profileId: string) => join(dataHome(), 'secrets', `provider-${profileId}`),
  /** Model catalogs fetched from the providers, by base URL. */
  modelsCache: () => join(dataHome(), 'models-cache.json'),
  firebaseServiceAccount: () => join(dataHome(), 'firebase-service-account.json'),
  /** Images uploaded from the app (0700), pruned after a day. */
  attachments: () => join(dataHome(), 'attachments'),
  bin: () => join(dataHome(), 'bin'),
  logs: () => join(dataHome(), 'logs'),
  /** Result of the last background update check. */
  updates: () => join(dataHome(), 'updates.json'),
  /** Steps of the last `remote-harness update` run, read by the daemon for the app. */
  updateRun: () => join(dataHome(), 'update-run.json'),
  /** Compiled tray helper (macOS). */
  tray: () => join(dataHome(), 'tray'),
  /** App bundle launched by the LaunchAgent (gives the background item its name and icon). */
  app: () => join(dataHome(), 'Remote Harness.app'),
  /** Bundle written by versions before the rename; removed when the service is (un)installed. */
  legacyApp: () => join(dataHome(), 'Claude Remote.app'),
  /** Compiled launcher of the app bundle (macOS), by source hash. */
  launcher: () => join(dataHome(), 'launcher'),
}

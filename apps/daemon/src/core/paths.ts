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

/** The computer's name, without the `.local` suffix macOS adds. */
export function hostName(raw = hostname()): string {
  return raw.replace(/\.local$/i, '')
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
  firebaseServiceAccount: () => join(dataHome(), 'firebase-service-account.json'),
  /** Images uploaded from the app (0700), pruned after a day. */
  attachments: () => join(dataHome(), 'attachments'),
  bin: () => join(dataHome(), 'bin'),
  logs: () => join(dataHome(), 'logs'),
  /** App bundle launched by the LaunchAgent (gives the background item its name and icon). */
  app: () => join(dataHome(), 'Claude Remote.app'),
}

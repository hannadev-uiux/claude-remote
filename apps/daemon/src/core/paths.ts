import { homedir } from 'node:os'
import { join } from 'node:path'

export function expandHome(p: string): string {
  if (p === '~') return homedir()
  if (p.startsWith('~/')) return join(homedir(), p.slice(2))
  return p
}

/** Root directory for everything the daemon persists. Overridable for tests. */
export function claudeRemoteHome(): string {
  return expandHome(process.env.CLAUDE_REMOTE_HOME ?? '~/.claude-remote')
}

export const paths = {
  config: () => join(claudeRemoteHome(), 'config.json'),
  state: () => join(claudeRemoteHome(), 'state.json'),
  hookSecret: () => join(claudeRemoteHome(), 'hook-secret'),
  tokenFile: () => join(claudeRemoteHome(), 'token'),
  rulesLog: () => join(claudeRemoteHome(), 'rules-log.jsonl'),
  devices: () => join(claudeRemoteHome(), 'devices.json'),
  mute: () => join(claudeRemoteHome(), 'mute.json'),
  firebaseServiceAccount: () => join(claudeRemoteHome(), 'firebase-service-account.json'),
  bin: () => join(claudeRemoteHome(), 'bin'),
  logs: () => join(claudeRemoteHome(), 'logs'),
  /** App bundle launched by the LaunchAgent (gives the background item its name and icon). */
  app: () => join(claudeRemoteHome(), 'Claude Remote.app'),
}

/** Prefix of the daemon's environment variables; `LEGACY_PREFIX` is still read for older installs. */
export const ENV_PREFIX = 'REMOTE_HARNESS_'
export const LEGACY_PREFIX = 'CLAUDE_REMOTE_'

/** `REMOTE_HARNESS_<name>`, else `CLAUDE_REMOTE_<name>`; empty values count as unset. */
export function envVar(name: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  return env[`${ENV_PREFIX}${name}`] || env[`${LEGACY_PREFIX}${name}`] || undefined
}

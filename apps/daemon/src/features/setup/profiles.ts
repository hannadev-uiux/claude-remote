import { readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { Profile } from '@claude-remote/protocol'
import { expandHome } from '../../core/paths.ts'
import { isDirectory } from '../../infra/fs.ts'

/** `~/.claude` and `~/.claude-<name>`; `~/.claude-remote` is ours, not a Claude Code profile. */
const CONFIG_DIR = /^\.claude(-[\w.-]+)?$/
const NOT_PROFILES = new Set(['.claude-remote'])
const ALIAS = /^[a-z][a-z0-9_-]{0,31}$/
/** The launcher runs `claude` and its directory comes first on PATH; these would call themselves. */
const RESERVED_ALIASES = new Set(['claude', 'claude-remote', 'tmux'])
export const PROFILE_COLORS = ['#D97757', '#61AFEF', '#98C379', '#C678DD', '#E5C07B', '#56B6C2']

export function tildify(path: string, home = homedir()): string {
  if (path === home) return '~'
  return path.startsWith(`${home}/`) ? `~/${path.slice(home.length + 1)}` : path
}

/** Claude Code config dirs in the home, `~/.claude` first, as `~/...` paths. */
export async function detectConfigDirs(home = homedir()): Promise<string[]> {
  const entries = await readdir(home).catch(() => [] as string[])
  const found: string[] = []
  for (const name of entries) {
    if (!CONFIG_DIR.test(name) || NOT_PROFILES.has(name)) continue
    if (await isDirectory(join(home, name))) found.push(name)
  }
  return found
    .sort((a, b) => (a === '.claude' ? -1 : b === '.claude' ? 1 : a.localeCompare(b)))
    .map((n) => `~/${n}`)
}

function sameDir(a: string, b: string): boolean {
  return expandHome(a).replace(/\/+$/, '') === expandHome(b).replace(/\/+$/, '')
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/** Keeps what is already configured for the dir; otherwise suggests alias, name and color. */
export function suggestProfile(configDir: string, existing: readonly Profile[], index: number): Profile {
  const current = existing.find((p) => sameDir(p.configDir, configDir))
  if (current) return { ...current, configDir }
  const suffix = /\.claude-([\w.-]+)$/.exec(configDir)?.[1]
  const id = suffix ? `claude-${suffix.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}` : 'claudin'
  const name = suffix ? capitalize(suffix.replace(/[-_.]+/g, ' ')) : 'Pessoal'
  return { id, name, configDir, color: PROFILE_COLORS[index % PROFILE_COLORS.length] ?? '#D97757' }
}

/** `true` when valid, otherwise the message to show (inquirer's `validate` contract). */
export function validateAlias(alias: string, taken: readonly string[]): true | string {
  if (!ALIAS.test(alias)) return 'Use letras minúsculas, números, - ou _, começando com uma letra (até 32).'
  if (RESERVED_ALIASES.has(alias)) return `"${alias}" é reservado: o launcher chama o próprio \`${alias}\`.`
  if (taken.includes(alias)) return `"${alias}" já é usado por outro perfil.`
  return true
}

/** Replaces `profiles` in the raw config, keeping every other key the user set. */
export function mergeConfig(raw: unknown, profiles: readonly Profile[]): Record<string, unknown> {
  const base = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  return { ...base, profiles }
}

/** What must be cleaned up when `next` replaces `previous`. */
export function profilesToRemove(
  previous: readonly Profile[],
  next: readonly Profile[],
): { launchers: Profile[]; hooks: Profile[] } {
  return {
    launchers: previous.filter((p) => !next.some((n) => n.id === p.id)),
    hooks: previous.filter((p) => !next.some((n) => sameDir(n.configDir, p.configDir))),
  }
}

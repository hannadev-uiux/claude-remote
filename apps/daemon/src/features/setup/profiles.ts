import { existsSync, statSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, join } from 'node:path'
import { type Locale, PROVIDER_NAMES, type Profile, type ProviderKind } from '@remote-harness/protocol'
import type { Messages } from '../../core/i18n/index.ts'
import { expandHome } from '../../core/paths.ts'
import { isDirectory } from '../../infra/fs.ts'

/** `~/.claude` and `~/.claude-<name>`. */
const CONFIG_DIR = /^\.claude(-[\w.-]+)?$/
/** Same naming, but data of other tools: ours (before the rename) and the claude-mem plugin. */
const NOT_PROFILES = new Set(['.claude-remote', '.claude-mem'])
/** Any of these marks a dir Claude Code has already used as CLAUDE_CONFIG_DIR. */
const PROFILE_MARKERS = ['.claude.json', 'settings.json', '.credentials.json', 'projects']
/** `~/.codex` (Codex's default CODEX_HOME) counts once Codex has written one of these. */
const CODEX_DIR = '.codex'
const CODEX_MARKERS = ['config.toml', 'auth.json', 'sessions']
const CODEX_COLOR = '#2FBF8F'
const ALIAS = /^[a-z][a-z0-9_-]{0,31}$/
/** The launcher runs `claude` and its directory comes first on PATH; these would call themselves. */
const RESERVED_ALIASES = new Set(['claude', 'codex', 'claude-remote', 'remote-harness', 'tmux'])
export const PROFILE_COLORS = ['#D97757', '#61AFEF', '#98C379', '#C678DD', '#E5C07B', '#56B6C2']

export function tildify(path: string, home = homedir()): string {
  if (path === home) return '~'
  return path.startsWith(`${home}/`) ? `~/${path.slice(home.length + 1)}` : path
}

function looksLikeConfigDir(path: string): boolean {
  return PROFILE_MARKERS.some((marker) => existsSync(join(path, marker)))
}

/**
 * Claude Code config dirs in the home, `~/.claude` first, as `~/...` paths, then `~/.codex` when
 * Codex has used it. `~/.claude-*` dirs only count when Claude Code has written to them, so other
 * tools' `~/.claude-x` data is skipped.
 */
export async function detectConfigDirs(home = homedir()): Promise<string[]> {
  const entries = await readdir(home).catch(() => [] as string[])
  const found: string[] = []
  for (const name of entries) {
    if (!CONFIG_DIR.test(name) || NOT_PROFILES.has(name)) continue
    const path = join(home, name)
    if ((await isDirectory(path)) && (name === '.claude' || looksLikeConfigDir(path))) found.push(name)
  }
  const codex = join(home, CODEX_DIR)
  const hasCodex = (await isDirectory(codex)) && CODEX_MARKERS.some((m) => existsSync(join(codex, m)))
  return [
    ...found.sort((a, b) => (a === '.claude' ? -1 : b === '.claude' ? 1 : a.localeCompare(b))),
    ...(hasCodex ? [CODEX_DIR] : []),
  ].map((n) => `~/${n}`)
}

/** `~/.codex` and `~/.codex-<name>` hold a Codex home rather than a Claude Code config dir. */
export function isCodexDir(configDir: string): boolean {
  return /(^|\/)\.codex(-[\w.-]+)?\/?$/.test(configDir)
}

export function sameDir(a: string, b: string): boolean {
  return expandHome(a).replace(/\/+$/, '') === expandHome(b).replace(/\/+$/, '')
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/** Keeps what is already configured for the dir; otherwise suggests alias, name and color. */
export function suggestProfile(
  configDir: string,
  existing: readonly Profile[],
  index: number,
  m: Messages['profiles'],
): Profile {
  const current = existing.find((p) => sameDir(p.configDir, configDir))
  if (current) return { ...current, configDir }
  if (isCodexDir(configDir)) {
    const codexSuffix = /\.codex-([\w.-]+)\/?$/.exec(configDir)?.[1]
    const id = codexSuffix ? `cdx-${codexSuffix.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}` : 'cdx'
    const name = codexSuffix ? `Codex ${capitalize(codexSuffix.replace(/[-_.]+/g, ' '))}` : 'Codex'
    return { id, name, configDir, color: CODEX_COLOR, agent: 'codex' }
  }
  const suffix = /\.claude-([\w.-]+)$/.exec(configDir)?.[1]
  const id = suffix ? `claude-${suffix.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}` : 'claudin'
  const name = suffix ? capitalize(suffix.replace(/[-_.]+/g, ' ')) : m.defaultName
  return { id, name, configDir, color: PROFILE_COLORS[index % PROFILE_COLORS.length] ?? '#D97757' }
}

/** `base`, then `base-2`, `base-3`… : the first one `isTaken` refuses. */
function firstFree(base: string, isTaken: (candidate: string) => boolean): string {
  let candidate = base
  for (let n = 2; isTaken(candidate); n++) candidate = `${base}-${n}`
  return candidate
}

/**
 * A new profile routed through a provider: alias and folder named after it (`openrouter`,
 * `~/.claude-openrouter`, then `-2`…), free among the aliases and folders already in the list.
 */
export function suggestProviderProfile(
  kind: ProviderKind,
  takenIds: readonly string[],
  takenDirs: readonly string[],
  index: number,
): Profile {
  const id = firstFree(kind, (candidate) => takenIds.includes(candidate))
  const configDir = firstFree(`~/.claude-${kind}`, (candidate) =>
    takenDirs.some((t) => sameDir(t, candidate)),
  )
  return {
    id,
    name: PROVIDER_NAMES[kind],
    configDir,
    color: PROFILE_COLORS[index % PROFILE_COLORS.length] ?? '#D97757',
    provider: { kind },
  }
}

/** `true` when valid, otherwise the message to show (inquirer's `validate` contract). */
export function validateAlias(
  alias: string,
  taken: readonly string[],
  m: Messages['profiles'],
): true | string {
  if (!ALIAS.test(alias)) return m.aliasFormat
  if (RESERVED_ALIASES.has(alias)) return m.aliasReserved(alias)
  if (taken.includes(alias)) return m.aliasTaken(alias)
  return true
}

/** Replaces `profiles` (and `language`, when given) in the raw config, keeping every other key. */
export function mergeConfig(
  raw: unknown,
  profiles: readonly Profile[],
  language?: Locale,
): Record<string, unknown> {
  const base = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  return { ...base, profiles, ...(language ? { language } : {}) }
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

/** `~/.claude` (Claude Code's default) when free, otherwise the first free `~/.claude-<name>`. */
export function suggestNewConfigDir(
  taken: readonly string[],
  m: Messages['profiles'],
  home = homedir(),
): string {
  if (!taken.some((t) => sameDir(t, '~/.claude')) && !existsSync(join(home, '.claude'))) return '~/.claude'
  const names = Array.from({ length: 100 }, (_, i) => m.newDirName(i))
  const free = names
    .map((name) => `~/.claude-${name}`)
    .find((dir) => !taken.some((t) => sameDir(t, dir)) && !existsSync(join(home, basename(dir))))
  return free ?? `~/.claude-${m.newDirFallback}`
}

/** Folder for a new account: absolute or `~/`, not in use by another account or another tool. */
export function validateNewConfigDir(
  value: string,
  taken: readonly string[],
  m: Messages['profiles'],
): true | string {
  const dir = value.trim()
  if (!dir.startsWith('~/') && !dir.startsWith('/')) return m.dirAbsolute
  const path = expandHome(dir).replace(/\/+$/, '')
  if (NOT_PROFILES.has(basename(path))) return m.dirOtherTool(dir)
  if (taken.some((t) => sameDir(t, path))) return m.dirInList
  if (existsSync(path) && !statSync(path).isDirectory()) return m.dirIsFile
  return true
}

/**
 * Who is logged in to a config dir, from its `.claude.json` (`~/.claude.json` for `~/.claude`):
 * the account email, the "API key" label, or null when Claude Code was never logged in there.
 */
export async function readLogin(
  configDir: string,
  m: Messages['profiles'],
  home = homedir(),
): Promise<string | null> {
  const dir = expandHome(configDir).replace(/\/+$/, '')
  const file = dir === join(home, '.claude') ? join(home, '.claude.json') : join(dir, '.claude.json')
  try {
    const data: unknown = JSON.parse(await readFile(file, 'utf8'))
    if (!data || typeof data !== 'object') return null
    const { oauthAccount, primaryApiKey } = data as { oauthAccount?: unknown; primaryApiKey?: unknown }
    if (oauthAccount && typeof oauthAccount === 'object') {
      const email = (oauthAccount as { emailAddress?: unknown }).emailAddress
      return typeof email === 'string' && email ? email : m.claudeAccount
    }
    return typeof primaryApiKey === 'string' && primaryApiKey ? m.apiKey : null
  } catch {
    return null
  }
}

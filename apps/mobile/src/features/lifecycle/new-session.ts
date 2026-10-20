import {
  type Profile,
  type ProjectItem,
  SESSION_NAME_MAX,
  type Session,
  type WorktreeCopy,
} from '@remote-harness/protocol'
import type { TFunction } from '@/core/i18n/create'
import { AGENT_NAMES, type AgentId } from '@/core/theme/agents'
import { shortPath } from '@/core/utils/time'

/** The agent a profile launches, from the daemon's `agent`; older daemons send none, meaning Claude Code. */
export function profileAgent(profile: Pick<Profile, 'id' | 'agent'>): AgentId {
  return profile.agent ?? 'claude'
}

/** Agents that can start in their own git worktree (Claude Code's `--worktree`); Codex cannot. */
export function canStartInWorktree(agent: AgentId): boolean {
  return agent === 'claude'
}

/** `Claude Code · ~/.claude`, with the provider appended when it is not the default (#109). */
export function profileDetail(
  profile: Pick<Profile, 'id' | 'configDir'>,
  provider: string | null = null,
): string {
  const base = `${AGENT_NAMES[profileAgent(profile)]} · ${shortPath(profile.configDir)}`
  return provider ? `${base} · ${provider}` : base
}

/** The name to send with `session.start`: whitespace collapsed, cut at the limit; undefined when empty. */
export function cleanSessionName(input: string): string | undefined {
  const name = input.replace(/\s+/g, ' ').trim().slice(0, SESSION_NAME_MAX).trim()
  return name || undefined
}

/** Branches too generic to name a session after. */
const DEFAULT_BRANCHES = new Set(['main', 'master', 'develop', 'development', 'trunk'])
const MAX_NAME_SUGGESTIONS = 4

/**
 * Chips under the name field: the directory's branch (not a default one), then the titles of the
 * latest sessions there that are not just the folder name. No duplicates.
 */
export function nameSuggestions(
  branch: string | null,
  sessions: readonly Pick<Session, 'cwd' | 'title' | 'updatedAt'>[],
  cwd: string,
): string[] {
  const dir = cwd.replace(/\/+$/, '')
  const folder = dir.split('/').pop() ?? ''
  const titles = sessions
    .filter((s) => s.cwd.replace(/\/+$/, '') === dir && s.title && s.title !== folder)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((s) => s.title)
  const all = [...(branch && !DEFAULT_BRANCHES.has(branch) ? [branch] : []), ...titles]
  return [...new Set(all.map((name) => cleanSessionName(name)).filter((n): n is string => !!n))].slice(
    0,
    MAX_NAME_SUGGESTIONS,
  )
}

/**
 * What the isolated copy inherits, listed under the worktree toggle: local permissions and the
 * `.worktreeinclude` entries, or a hint to add that file. Empty for a daemon that does not say.
 */
export function worktreeCarryOver(
  copy: WorktreeCopy | undefined,
  t: TFunction,
): { items: string[]; hint: string | null } {
  if (!copy) return { items: [], hint: null }
  const items = [...(copy.localSettings ? [t('newSession.carryLocalSettings')] : []), ...copy.include]
  return { items, hint: copy.include.length === 0 ? t('newSession.carryHint') : null }
}

/**
 * `⎇ main · 2 sessions this week · 3 worktrees` for a recent directory (worktrees only on a
 * repository row); `null` when nothing is known.
 */
export function recentDetail(
  item: Pick<ProjectItem, 'branch' | 'sessions'> & { worktrees?: number },
  t: TFunction,
): string | null {
  const parts = [
    item.branch ? `⎇ ${item.branch}` : null,
    item.sessions > 0 ? t('newSession.sessionsThisWeek', { count: item.sessions }) : null,
    item.worktrees ? t('newSession.worktreeCount', { count: item.worktrees }) : null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
}

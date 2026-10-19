import type { Profile, ProjectItem } from '@remote-harness/protocol'
import type { TFunction } from '@/core/i18n/create'
import { AGENT_NAMES, type AgentId } from '@/core/theme/agents'
import { shortPath } from '@/core/utils/time'

/** The agent a profile launches, from the daemon's `agent`; older daemons send none, meaning Claude Code. */
export function profileAgent(profile: Pick<Profile, 'id' | 'agent'>): AgentId {
  return profile.agent ?? 'claude'
}

/** `Claude Code · ~/.claude`, with the provider appended when it is not the default (#109). */
export function profileDetail(
  profile: Pick<Profile, 'id' | 'configDir'>,
  provider: string | null = null,
): string {
  const base = `${AGENT_NAMES[profileAgent(profile)]} · ${shortPath(profile.configDir)}`
  return provider ? `${base} · ${provider}` : base
}

/** `⎇ main · 2 sessions this week` for a recent directory; `null` when nothing is known. */
export function recentDetail(item: Pick<ProjectItem, 'branch' | 'sessions'>, t: TFunction): string | null {
  const parts = [
    item.branch ? `⎇ ${item.branch}` : null,
    item.sessions > 0 ? t('newSession.sessionsThisWeek', { count: item.sessions }) : null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
}

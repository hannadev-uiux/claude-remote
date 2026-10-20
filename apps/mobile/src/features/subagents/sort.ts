import type { SubagentInfo } from '@remote-harness/protocol'
import type { TFunction } from '@/core/i18n/create'

/** Running first, then most recently updated. */
export function sortSubagents(list: readonly SubagentInfo[]): SubagentInfo[] {
  return [...list].sort((a, b) =>
    a.state === b.state ? b.updatedAt.localeCompare(a.updatedAt) : a.state === 'running' ? -1 : 1,
  )
}

const filled = (value: string | null | undefined) => (value?.trim() ? value.trim() : null)

/**
 * Never blank: the description, the agent type, "Subagent #N" by start order among `all` (the
 * session's subagents), and the short id as the last resort.
 */
export function subagentLabel(sub: SubagentInfo, all: readonly SubagentInfo[], t: TFunction): string {
  const named = filled(sub.description) ?? filled(sub.agentType)
  if (named) return named
  const order = [...all]
    .sort((a, b) => (a.startedAt ?? a.updatedAt).localeCompare(b.startedAt ?? b.updatedAt))
    .findIndex((s) => s.agentId === sub.agentId)
  return order >= 0 ? t('subagents.unnamed', { n: order + 1 }) : sub.agentId.slice(0, 8)
}

/** The agent type for the secondary line, when the label already is the description. */
export function subagentKind(sub: Pick<SubagentInfo, 'description' | 'agentType'>): string | null {
  return filled(sub.description) ? filled(sub.agentType) : null
}

export type SubagentStatus = 'running' | 'done' | 'failed' | 'stopped'

/** What the badge says: running, or how it ended (done unless the daemon reported otherwise). */
export function subagentStatus(sub: Pick<SubagentInfo, 'state' | 'outcome'>): SubagentStatus {
  return sub.state === 'running' ? 'running' : (sub.outcome ?? 'done')
}

/** Badge tone per status (theme tokens): accent, success, danger, warning. */
export const SUBAGENT_TONES = {
  running: 'accent',
  done: 'success',
  failed: 'danger',
  stopped: 'warning',
} as const satisfies Record<SubagentStatus, string>

/** Text color of the nested rows in the list, per status. */
export const SUBAGENT_TEXT_COLORS = {
  running: 'accentText',
  done: 'success',
  failed: 'danger',
  stopped: 'warning',
} as const satisfies Record<SubagentStatus, string>

/** How many subagents a session has and how many still run (menu label, sheet header, dot). */
export function subagentCounts(list: readonly Pick<SubagentInfo, 'state'>[]): {
  count: number
  running: number
} {
  return { count: list.length, running: list.filter((s) => s.state === 'running').length }
}

/**
 * Elapsed milliseconds: since the start while running, the total once done; `null` when the start
 * is unknown (older daemons) or a date cannot be parsed.
 */
export function subagentElapsed(
  sub: Pick<SubagentInfo, 'state' | 'startedAt' | 'updatedAt'>,
  now: number,
): number | null {
  if (!sub.startedAt) return null
  const started = Date.parse(sub.startedAt)
  const end = sub.state === 'running' ? now : Date.parse(sub.updatedAt)
  if (Number.isNaN(started) || Number.isNaN(end)) return null
  return Math.max(0, end - started)
}

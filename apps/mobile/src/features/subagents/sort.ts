import type { SubagentInfo } from '@remote-harness/protocol'

/** Running first, then most recently updated. */
export function sortSubagents(list: readonly SubagentInfo[]): SubagentInfo[] {
  return [...list].sort((a, b) =>
    a.state === b.state ? b.updatedAt.localeCompare(a.updatedAt) : a.state === 'running' ? -1 : 1,
  )
}

export function subagentLabel(sub: SubagentInfo): string {
  return sub.description ?? sub.agentType ?? sub.agentId.slice(0, 8)
}

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

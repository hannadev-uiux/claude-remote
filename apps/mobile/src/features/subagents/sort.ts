import type { SubagentInfo } from '@claude-remote/protocol'

/** Running first, then most recently updated. */
export function sortSubagents(list: readonly SubagentInfo[]): SubagentInfo[] {
  return [...list].sort((a, b) =>
    a.state === b.state ? b.updatedAt.localeCompare(a.updatedAt) : a.state === 'running' ? -1 : 1,
  )
}

export function subagentLabel(sub: SubagentInfo): string {
  return sub.description ?? sub.agentType ?? sub.agentId.slice(0, 8)
}

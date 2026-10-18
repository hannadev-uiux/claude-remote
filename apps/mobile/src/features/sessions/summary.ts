import type { Session } from '@remote-harness/protocol'
import { sessionAgent } from './agent'

/** Numbers of the machine line: sessions in the list and distinct agents among them. */
export function listSummary(sessions: readonly Session[]): { sessions: number; agents: number } {
  const agents = new Set<string>()
  for (const session of sessions) {
    const agent = sessionAgent(session)
    if (agent) agents.add(agent)
  }
  return { sessions: sessions.length, agents: agents.size }
}

/** Sessions in an isolated copy: Claude Code's `--worktree` and the app's toggle create them under `.claude/worktrees`. */
export function isWorktreePath(cwd: string): boolean {
  return /(^|\/)\.claude\/worktrees\//.test(`${cwd}/`)
}

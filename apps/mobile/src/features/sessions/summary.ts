import type { Session } from '@remote-harness/protocol'
import { sessionAgent } from './agent'

export type ListSummary = {
  sessions: number
  running: number
  waiting: number
  /** Background tasks and running subagents across every session in the list. */
  tasks: number
  /** Distinct agents among the sessions. */
  agents: number
  /** Of those agents, how many have at least one running session. */
  agentsRunning: number
}

/** Numbers of the machine line: sessions (total, running, waiting, tasks) and agents (total, running). */
export function listSummary(sessions: readonly Session[]): ListSummary {
  const agents = new Set<string>()
  const agentsRunning = new Set<string>()
  let running = 0
  let waiting = 0
  let tasks = 0
  for (const session of sessions) {
    const agent = sessionAgent(session)
    if (agent) agents.add(agent)
    if (session.state === 'running') {
      running++
      if (agent) agentsRunning.add(agent)
    } else if (session.state === 'waiting') {
      waiting++
    }
    tasks += session.backgroundTasks + session.subagents.filter((s) => s.state === 'running').length
  }
  return {
    sessions: sessions.length,
    running,
    waiting,
    tasks,
    agents: agents.size,
    agentsRunning: agentsRunning.size,
  }
}

/** Sessions in an isolated copy: Claude Code's `--worktree` and the app's toggle create them under `.claude/worktrees`. */
export function isWorktreePath(cwd: string): boolean {
  return /(^|\/)\.claude\/worktrees\//.test(`${cwd}/`)
}

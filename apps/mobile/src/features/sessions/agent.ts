import type { Session } from '@remote-harness/protocol'
import type { TFunction } from '../../core/i18n/create'
import { AGENT_NAMES, type AgentId } from '../../core/theme/agents'

/**
 * The agent running a session, from the daemon (`agent` on the session); older daemons send none,
 * which means Claude Code. Copy that has no session at hand keeps saying "the agent".
 */
export function sessionAgent(session: Pick<Session, 'id' | 'agent'>): AgentId | null {
  return session.agent ?? 'claude'
}

/**
 * How the copy names the agent: its product name when known, "the agent" otherwise. `sentence`
 * capitalizes the generic form for the start of a sentence ("The agent has a question").
 */
export function agentLabel(
  agent: AgentId | null,
  t: TFunction,
  options: { sentence?: boolean } = {},
): string {
  if (agent) return AGENT_NAMES[agent]
  return t(options.sentence ? 'agents.genericSentence' : 'agents.generic')
}

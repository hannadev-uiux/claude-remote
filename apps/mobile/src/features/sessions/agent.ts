import type { Session } from '@remote-harness/protocol'
import type { TFunction } from '../../core/i18n/create'
import { AGENT_NAMES, type AgentId } from '../../core/theme/agents'

/**
 * The agent running a session. Unknown until the protocol carries it (#108): every session is
 * Claude Code today, but the copy stays neutral ("the agent") instead of assuming it.
 */
export function sessionAgent(_session: Pick<Session, 'id'>): AgentId | null {
  return null
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

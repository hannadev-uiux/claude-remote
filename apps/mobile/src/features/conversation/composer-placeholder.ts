import type { TFunction } from '@/core/i18n/create'
import type { AgentId } from '@/core/theme/agents'
import { agentLabel } from '@/features/sessions/agent'

/**
 * The prompt field's placeholder: `Message Claude Code…` when the agent is known, `Message the
 * agent…` otherwise; a read-only session says so instead.
 */
export function composerPlaceholder(agent: AgentId | null, disabled: boolean, t: TFunction): string {
  if (disabled) return t('conversation.placeholderReadOnly')
  return t('conversation.placeholder', { agent: agentLabel(agent, t) })
}

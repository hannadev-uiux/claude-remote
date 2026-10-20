import type { ComponentType } from 'react'
import { ClaudeIcon } from './ClaudeIcon'
import { CodexIcon } from './CodexIcon'
import { hasRegisteredIcon } from './ids'
import { KimiIcon } from './KimiIcon'
import { OpenRouterIcon } from './OpenRouterIcon'
import { QwenIcon } from './QwenIcon'
import type { AgentIconId, AgentIconProps } from './types'

export { hasRegisteredIcon, REGISTERED_ICON_IDS } from './ids'
export type { AgentIconId, AgentIconProps } from './types'
export { ClaudeIcon, CodexIcon, KimiIcon, OpenRouterIcon, QwenIcon }

const ICONS: Record<AgentIconId, ComponentType<AgentIconProps>> = {
  claude: ClaudeIcon,
  codex: CodexIcon,
  kimi: KimiIcon,
  qwen: QwenIcon,
  openrouter: OpenRouterIcon,
}

/** The icon for an agent or provider id, or `null` for one without a registered icon yet. */
export function agentIconFor(id: string): ComponentType<AgentIconProps> | null {
  if (!hasRegisteredIcon(id)) return null
  return ICONS[id as AgentIconId]
}

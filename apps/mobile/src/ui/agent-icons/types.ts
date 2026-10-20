import type { ProviderKind } from '@remote-harness/protocol'
import type { AgentId } from '@/core/theme'

export type AgentIconProps = { size: number; color: string }

/** Every id an icon can be registered for: an agent, or a model provider. */
export type AgentIconId = AgentId | ProviderKind

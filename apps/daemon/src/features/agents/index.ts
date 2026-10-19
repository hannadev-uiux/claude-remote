import type { AgentId, Profile } from '@remote-harness/protocol'
import { claudeCode } from './claude.ts'
import type { AgentAdapter } from './types.ts'

export type { AgentAdapter } from './types.ts'

/** Adapters by agent id; an id without one is known to the protocol but cannot run yet. */
const ADAPTERS: Partial<Record<AgentId, AgentAdapter>> = { claude: claudeCode }

/** The agent a profile launches: Claude Code when the config does not say. */
export function profileAgentId(profile: Pick<Profile, 'agent'> | undefined): AgentId {
  return profile?.agent ?? 'claude'
}

export function hasAgentAdapter(id: AgentId): boolean {
  return ADAPTERS[id] !== undefined
}

/** The adapter of a profile's agent; profiles without one never reach this (see `resolveProfiles`). */
export function agentFor(profile: Pick<Profile, 'agent'>): AgentAdapter {
  const id = profileAgentId(profile)
  const adapter = ADAPTERS[id]
  if (!adapter) throw new Error(`no adapter for agent ${id}`)
  return adapter
}

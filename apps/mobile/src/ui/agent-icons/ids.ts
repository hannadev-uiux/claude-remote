import type { AgentIconId } from './types'

/** Ids with a registered icon in this module (pure, so the fallback logic is testable without pulling in react-native-svg). */
export const REGISTERED_ICON_IDS: readonly AgentIconId[] = ['claude', 'codex', 'kimi', 'qwen', 'openrouter']

export function hasRegisteredIcon(id: string): boolean {
  return (REGISTERED_ICON_IDS as readonly string[]).includes(id)
}

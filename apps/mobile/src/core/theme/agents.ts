/** Coding agents the app can tell apart. */
export const AGENT_IDS = ['claude', 'codex', 'kimi', 'qwen'] as const
export type AgentId = (typeof AGENT_IDS)[number]

/**
 * Fixed in every theme: the color identifies the agent, never a state or the brand. Model providers
 * (OpenRouter) get a neutral outline instead of a color.
 */
export const AGENT_COLORS: Record<AgentId, string> = {
  claude: '#D97757',
  codex: '#2FBF8F',
  kimi: '#5B9BF5',
  qwen: '#8C6CF5',
}

/** Display names (product names, not translated). */
export const AGENT_NAMES: Record<AgentId, string> = {
  claude: 'Claude Code',
  codex: 'Codex',
  kimi: 'Kimi',
  qwen: 'Qwen',
}

/** Two-letter codes shown in the agent badge. */
export const AGENT_CODES: Record<AgentId, string> = {
  claude: 'cl',
  codex: 'cx',
  kimi: 'ki',
  qwen: 'qw',
}

/** Text over an agent color (the agent colors are light enough in every theme). */
export const AGENT_BADGE_INK = '#0D0D0D'

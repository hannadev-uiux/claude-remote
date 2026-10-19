import { join } from 'node:path'
import type { AgentAdapter } from './types.ts'

/** Claude Code: the values the daemon used before adapters existed, byte for byte. */
export const claudeCode: AgentAdapter = {
  id: 'claude',
  name: 'Claude Code',
  command: 'claude',
  configDirEnv: 'CLAUDE_CONFIG_DIR',
  defaultConfigDir: '~/.claude',
  resumeArgs: (sessionId) => ['--resume', sessionId],
  worktreeArgs: (name) => ['--worktree', name],
  transcriptsDir: (configDir) => join(configDir, 'projects'),
}

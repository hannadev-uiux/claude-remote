import type { AgentId } from '@remote-harness/protocol'

/**
 * What differs between coding-agent CLIs as far as the daemon is concerned today. The session
 * registry, transport, push, mute and pane features stay agent-agnostic; hooks, approvals and the
 * transcript parser are still Claude Code specific and join this interface with their adapters.
 */
export type AgentAdapter = {
  id: AgentId
  /** Product name ("Claude Code"). */
  name: string
  /** Command on the PATH that starts the CLI. */
  command: string
  /** Environment variable naming the config dir, or null when the CLI has none. */
  configDirEnv: string | null
  /** Config dir used when a profile does not say otherwise ("~/.claude"). */
  defaultConfigDir: string
  /** Arguments that resume an existing session. */
  resumeArgs(sessionId: string): string[]
  /** Arguments that start in a new git worktree with that name; null when the CLI cannot. */
  worktreeArgs(name: string): string[] | null
  /** Where main-session transcripts live for a profile's config dir. */
  transcriptsDir(configDir: string): string
}

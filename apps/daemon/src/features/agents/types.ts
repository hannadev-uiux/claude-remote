import type { AgentId, CommandItem, PermissionMode } from '@remote-harness/protocol'
import type { TranscriptFormat } from '../transcript/format.ts'

/** A main-session transcript on disk. */
export type TranscriptLocation = { sessionId: string; path: string; mtime: Date }

/** What the session list needs from a transcript; unknown items are null. */
export type TranscriptSummary = {
  title: string | null
  cwd: string | null
  /** Claude Code's permission mode. */
  permissionMode: PermissionMode | null
  /** Codex's approval policy. */
  approvalPolicy: string | null
}

/**
 * What differs between coding-agent CLIs as far as the daemon is concerned. The session registry,
 * transport, push, mute and pane features stay agent-agnostic and ask the session's adapter.
 */
export type AgentAdapter = {
  id: AgentId
  /** Product name ("Claude Code"). */
  name: string
  /** Command on the PATH that starts the CLI. */
  command: string
  /** Environment variable naming the config dir, or null when the CLI has none. */
  configDirEnv: string | null
  /** Config dir used when a profile does not say otherwise ("~/.claude"); launched with the variable unset. */
  defaultConfigDir: string
  /** Arguments that resume an existing session. */
  resumeArgs(sessionId: string): string[]
  /** Arguments that start in a new git worktree with that name; null when the CLI cannot. */
  worktreeArgs(name: string): string[] | null
  /** Arguments that give a new session a display name; null when the CLI has none. */
  nameArgs(name: string): string[] | null
  /** How the CLI writes its transcripts (one module per format). */
  transcript: TranscriptFormat
  /** Main-session transcripts of a config dir modified since `cutoffMs`. */
  findTranscripts(configDir: string, cutoffMs: number): Promise<TranscriptLocation[]>
  /** Title, folder and mode of a transcript; throws when it cannot be read. */
  readSummary(path: string, configDir: string): Promise<TranscriptSummary>
  /** Slash commands offered for a session in `cwd`. */
  commands(configDir: string, cwd: string): Promise<CommandItem[]>
  /** Cheap change detector for `commands` (directory mtimes). */
  commandsSignature(configDir: string, cwd: string): Promise<string>
  input: {
    /** Least wait between the paste and the Enter that submits it. */
    minEnterDelayMs: number
    /** Inserts a line break when typing (the `type` input strategy): literal text, then keys. */
    newline: { literal?: string; keys: string[] }
    /** Keys sent after typing, before Enter (closing autocomplete menus); a stray Esc arms "edit previous" in Codex. */
    beforeSubmit: string[]
  }
  /** Where the daemon's hooks go and in which shape. */
  hooks: { style: 'claude-settings' | 'codex-hooks'; file(configDir: string): string }
  /** The daemon wraps the CLI's status line (Claude Code only). */
  statusLine: boolean
  /** Profiles may route the CLI through a model provider (OpenRouter). */
  providers: boolean
  /** The TUI's permission modes can be switched from the app (Shift+Tab cycle). */
  modes: boolean
  /**
   * A permission answer may add allow rules or switch the mode (Claude Code). Codex treats either as
   * a failed hook, so its requests get Allow / Deny only.
   */
  permissionRules: boolean
  /** Rewrites a dictated transcript in one non-interactive call; `null` when the CLI has no such mode. */
  polish: { args(text: string): string[] } | null
}

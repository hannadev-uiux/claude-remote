import type { CommandItem } from '@remote-harness/protocol'

/**
 * Native Claude Code slash commands, described in English (the app shows its own translation by name). Review on every CLI update. `interactive` commands open a
 * menu in the TUI, so the app switches to the raw terminal after sending them.
 */
export const BUILTIN_COMMANDS: CommandItem[] = [
  { name: 'clear', description: 'Clear the conversation history', source: 'builtin', interactive: false },
  {
    name: 'compact',
    description: 'Compact the conversation, keeping a summary',
    source: 'builtin',
    interactive: false,
  },
  { name: 'context', description: 'Show context usage', source: 'builtin', interactive: false },
  { name: 'cost', description: 'Show session cost and duration', source: 'builtin', interactive: false },
  { name: 'usage', description: 'Show plan usage limits', source: 'builtin', interactive: false },
  { name: 'init', description: 'Create a CLAUDE.md for the project', source: 'builtin', interactive: false },
  { name: 'review', description: 'Review a pull request', source: 'builtin', interactive: false },
  { name: 'memory', description: 'Edit memory files', source: 'builtin', interactive: true },
  { name: 'model', description: 'Choose the model', source: 'builtin', interactive: true },
  { name: 'config', description: 'Open settings', source: 'builtin', interactive: true },
  { name: 'permissions', description: 'Manage permission rules', source: 'builtin', interactive: true },
  { name: 'agents', description: 'Manage subagents', source: 'builtin', interactive: true },
  { name: 'mcp', description: 'Manage MCP servers', source: 'builtin', interactive: true },
  { name: 'resume', description: 'Resume a previous conversation', source: 'builtin', interactive: true },
  { name: 'login', description: 'Sign in with another account', source: 'builtin', interactive: true },
  { name: 'hooks', description: 'Manage hooks', source: 'builtin', interactive: true },
  { name: 'plugin', description: 'Manage plugins', source: 'builtin', interactive: true },
  {
    name: 'status',
    description: 'Show account and system status',
    source: 'builtin',
    interactive: true,
  },
  { name: 'doctor', description: 'Diagnose the installation', source: 'builtin', interactive: true },
  {
    name: 'rewind',
    description: 'Rewind the conversation/code to an earlier point',
    source: 'builtin',
    interactive: true,
  },
  { name: 'export', description: 'Export the conversation', source: 'builtin', interactive: true },
  { name: 'help', description: 'Help', source: 'builtin', interactive: true },
  { name: 'exit', description: 'End the session', source: 'builtin', interactive: false },
]

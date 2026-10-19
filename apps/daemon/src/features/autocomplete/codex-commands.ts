import type { CommandItem } from '@remote-harness/protocol'

const item = (name: string, description: string, interactive = false): CommandItem => ({
  name,
  description,
  source: 'builtin',
  interactive,
})

/**
 * Native Codex CLI slash commands (codex 0.163), described in English. Review on every CLI update.
 * `interactive` commands open a menu or a long view in the TUI, so the app switches to the raw
 * terminal after sending them. Commands that quit, log out or delete the session are left out.
 */
export const CODEX_COMMANDS: CommandItem[] = [
  item('model', 'Choose the model and reasoning effort', true),
  item('permissions', 'Choose what Codex is allowed to do', true),
  item('review', 'Review the current changes and find issues', true),
  item('new', 'Start a new chat'),
  item('clear', 'Clear the terminal and start a new chat'),
  item('resume', 'Resume a saved chat', true),
  item('fork', 'Fork the current chat'),
  item('rename', 'Rename the current thread', true),
  item('compact', 'Summarize the conversation to free context'),
  item('recap', 'Summarize the conversation now'),
  item('init', 'Create an AGENTS.md file with instructions for Codex'),
  item('diff', 'Show the git diff, including untracked files', true),
  item('mention', 'Mention a file', true),
  item('status', 'Show the session configuration and token usage', true),
  item('mcp', 'List MCP tools', true),
  item('skills', 'Use skills', true),
  item('presets', 'Run or save reusable prompts', true),
  item('hooks', 'View and manage lifecycle hooks', true),
  item('ps', 'List background terminals', true),
  item('stop', 'Stop all background terminals'),
  item('copy', 'Copy the last response'),
  item('export', 'Export the conversation as markdown'),
  item('feedback', 'Send logs to the maintainers', true),
]

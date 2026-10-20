import type { CommandItem } from '@remote-harness/protocol'

const item = (name: string, description: string, interactive = false): CommandItem => ({
  name,
  description,
  source: 'builtin',
  interactive,
})

/**
 * Native Claude Code slash commands (checked against Claude Code 2.1.304), described in English (the
 * app shows its own translation by name). Review on every CLI update. `interactive` commands open a
 * menu, picker or panel in the TUI, so the app switches to the raw terminal after sending them.
 * Commands that cut the remote control off or only concern the local terminal (`/logout`,
 * `/remote-control`, `/terminal-setup`, `/keybindings`, `/voice`…) are left out.
 */
export const BUILTIN_COMMANDS: CommandItem[] = [
  item('add-dir', 'Add a new working directory'),
  item('branch', 'Create a branch of the current conversation at this point'),
  item('btw', 'Ask a quick side question without interrupting the main conversation'),
  item('clear', 'Start a new session with empty context'),
  item('compact', 'Free up context by summarizing the conversation so far'),
  item('config', 'Open settings', true),
  item('context', 'Show context usage'),
  item('copy', "Copy Claude's last response to the clipboard"),
  item('diff', 'View uncommitted changes and per-turn diffs', true),
  item('doctor', 'Check the installation and fix issues', true),
  item('effort', 'Set the effort level for the model', true),
  item('exit', 'End the session'),
  item('export', 'Export the conversation to a file or the clipboard', true),
  item('fast', 'Toggle fast mode'),
  item('fork', 'Copy this conversation into a new background session'),
  item('goal', 'Set a goal Claude checks before stopping'),
  item('help', 'Show help and available commands', true),
  item('hooks', 'View hook configurations for tool events', true),
  item('ide', 'Manage IDE integrations and show status', true),
  item('init', 'Create a CLAUDE.md with the codebase documentation'),
  item('insights', 'Generate a report analyzing your Claude Code sessions'),
  item('login', 'Sign in or switch Anthropic accounts', true),
  item('mcp', 'Manage MCP servers', true),
  item('memory', 'Edit CLAUDE.md files and memory settings', true),
  item('model', 'Choose the model', true),
  item('output-style', 'List output styles or switch to one', true),
  item('permissions', 'Manage allow and deny tool permission rules', true),
  item('plan', 'Enable plan mode or view the current plan'),
  item('plugin', 'Manage Claude Code plugins', true),
  item('privacy-settings', 'View and update your privacy settings', true),
  item('recap', 'Generate a one-line session recap'),
  item('release-notes', 'Show the release notes', true),
  item('reload-plugins', 'Activate pending plugin changes in this session'),
  item('reload-skills', 'Pick up skills added or changed on disk'),
  item('rename', 'Rename the current conversation'),
  item('resume', 'Resume a previous conversation', true),
  item('rewind', 'Rewind the conversation/code to an earlier point', true),
  item('sandbox', 'Configure the sandbox for commands', true),
  item('security-review', 'Review the pending changes on the branch for security issues'),
  item('skills', 'List available skills', true),
  item('status', 'Show version, model, account and connectivity', true),
  item('statusline', 'Set up the status line'),
  item('tasks', 'View and manage everything running in the background', true),
  item('theme', 'Change the theme', true),
  item('usage', 'Show session cost, plan usage and activity stats'),
  item('version', 'Show the version this session is running'),
]

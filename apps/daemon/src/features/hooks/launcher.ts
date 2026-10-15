import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import type { Profile } from '@claude-remote/protocol'

const PATH_BLOCK_START = '# >>> claude-remote >>>'
const PATH_BLOCK_END = '# <<< claude-remote <<<'

function zshQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`
}

/**
 * Claude Code keeps its global state in \`~/.claude.json\` only when CLAUDE_CONFIG_DIR is unset; setting
 * it, even to \`~/.claude\`, switches to \`$CLAUDE_CONFIG_DIR/.claude.json\` and looks like a fresh install
 * (onboarding, no login). The default profile must therefore run with the variable unset.
 */
export function isDefaultConfigDir(configDir: string, home = homedir()): boolean {
  return resolve(configDir) === join(home, '.claude')
}

/**
 * Generates the zsh launcher for a profile. It opens `claude` (with all args) in a new window of
 * the shared tmux session and attaches through a grouped session, so several terminals can each
 * look at a different window. zsh is found through PATH (/bin/zsh on macOS, /usr/bin/zsh on Linux).
 */
export function renderLauncher(
  profile: Profile,
  options: { tmuxSession: string; tmuxBin: string; home?: string },
): string {
  const isDefault = isDefaultConfigDir(profile.configDir, options.home)
  // The tmux server may have inherited another profile's CLAUDE_CONFIG_DIR, so `env -u` clears it.
  const configDir = isDefault
    ? 'unset CLAUDE_CONFIG_DIR'
    : `export CLAUDE_CONFIG_DIR=${zshQuote(profile.configDir)}`
  const unsetInPane = isDefault ? 'env -u CLAUDE_CONFIG_DIR ' : ''
  const configEnv = isDefault ? '' : '-e "CLAUDE_CONFIG_DIR=$CLAUDE_CONFIG_DIR" '
  return `#!/usr/bin/env zsh
# Claude Remote launcher for profile "${profile.id}" (${profile.name}). Generated; do not edit.
${configDir}
export CLAUDE_REMOTE_PROFILE=${zshQuote(profile.id)}
TMUX_BIN=\${CLAUDE_REMOTE_TMUX:-${zshQuote(options.tmuxBin)}}
SESSION=${zshQuote(options.tmuxSession)}
CLAUDE_BIN=\${CLAUDE_REMOTE_CLAUDE_BIN:-claude}

name="${profile.id}:\${PWD:t}"
cmd=(${unsetInPane}"$CLAUDE_BIN" "$@")
command_line="\${(j: :)\${(q)cmd[@]}}"
envs=(${configEnv}-e "CLAUDE_REMOTE_PROFILE=$CLAUDE_REMOTE_PROFILE")

if "$TMUX_BIN" has-session -t "=$SESSION" 2>/dev/null; then
  ids=$("$TMUX_BIN" new-window -d -P -F '#{pane_id} #{window_id}' -t "=$SESSION:" -n "$name" -c "$PWD" "\${envs[@]}" "$command_line") || exit 1
else
  ids=$("$TMUX_BIN" new-session -d -P -F '#{pane_id} #{window_id}' -s "$SESSION" -n "$name" -c "$PWD" "\${envs[@]}" "$command_line") || exit 1
fi
pane=\${ids%% *}
window=\${ids##* }

if [[ -n "$CLAUDE_REMOTE_NO_ATTACH" ]]; then
  print -r -- "$pane"
  exit 0
fi

# A grouped session shares the windows but keeps its own current window.
view="$SESSION-view-$$"
"$TMUX_BIN" new-session -d -t "=$SESSION" -s "$view" \\; set-option -t "$view" destroy-unattached on \\; select-window -t "=$view:$window"
if [[ -n "$TMUX" ]]; then
  exec "$TMUX_BIN" switch-client -t "=$view"
else
  exec "$TMUX_BIN" attach-session -t "=$view"
fi
`
}

/** Same block (and markers) in ~/.zshrc and ~/.bashrc: the syntax is valid in both shells. */
export function pathBlock(binDir: string): string {
  return `${PATH_BLOCK_START}\nexport PATH=${zshQuote(binDir)}:"$PATH"\n${PATH_BLOCK_END}`
}

export function removePathBlock(content: string): string {
  const start = content.indexOf(PATH_BLOCK_START)
  if (start === -1) return content
  const end = content.indexOf(PATH_BLOCK_END, start)
  if (end === -1) return content
  const before = content.slice(0, start).replace(/\n+$/, '\n')
  const after = content.slice(end + PATH_BLOCK_END.length).replace(/^\n+/, '')
  const joined = `${before}${after}`
  return joined === '\n' ? '' : joined
}

export function upsertPathBlock(content: string, binDir: string): string {
  const base = removePathBlock(content)
  const separator = base.length === 0 || base.endsWith('\n') ? '' : '\n'
  return `${base}${separator}${base.length > 0 ? '\n' : ''}${pathBlock(binDir)}\n`
}

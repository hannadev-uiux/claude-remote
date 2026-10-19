import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { PROVIDER_NAMES, type Profile, type Provider } from '@remote-harness/protocol'
import { paths } from '../../core/paths.ts'
import { providerKeyAccount, SECRET_SERVICE } from '../../core/secrets.ts'
import { providerEnv } from '../providers/openrouter.ts'

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

export type LauncherOptions = {
  tmuxSession: string
  tmuxBin: string
  home?: string
  /** Printed when a profile with a provider has no stored key; the installer passes the translated text. */
  missingKey?: (profileId: string, provider: string) => string
}

const defaultMissingKey = (profileId: string, provider: string): string =>
  `No ${provider} key stored for profile ${profileId}: run \`remote-harness provider key ${profileId}\`.`

/**
 * The provider part of a launcher: the gateway variables, and `read_provider_key`, which tries the
 * `0600` file, the macOS Keychain and the Secret Service. With `CLAUDE_REMOTE_EXEC` set (inside the
 * tmux window) the script exports the key and `exec`s `claude`; before creating a window it only
 * checks that a key is readable.
 */
function providerSection(
  profileId: string,
  provider: Provider,
  unsetInPane: string,
  options: LauncherOptions,
): string {
  const exports = Object.entries(providerEnv(provider))
    .map(([name, value]) => `export ${name}=${zshQuote(value)}`)
    .join('\n')
  const keyFile = zshQuote(paths.providerKey(profileId))
  const service = zshQuote(SECRET_SERVICE)
  const account = zshQuote(providerKeyAccount(profileId))
  const name = PROVIDER_NAMES[provider.kind]
  const message = zshQuote((options.missingKey ?? defaultMissingKey)(profileId, name))
  return `${exports}
unset ANTHROPIC_API_KEY

# The ${name} key stays in the OS secret store and is read only inside the window, never on a command line.
read_provider_key() {
  if [[ -r ${keyFile} ]]; then
    cat ${keyFile}
  elif (( $+commands[security] )); then
    security find-generic-password -s ${service} -a ${account} -w 2>/dev/null
  elif (( $+commands[secret-tool] )); then
    secret-tool lookup service ${service} account ${account} 2>/dev/null
  fi
}
if [[ -n "$CLAUDE_REMOTE_EXEC" ]]; then
  ANTHROPIC_AUTH_TOKEN="$(read_provider_key)"
  export ANTHROPIC_AUTH_TOKEN
  exec ${unsetInPane}"$CLAUDE_BIN" "$@"
fi
if [[ -z "$(read_provider_key)" ]]; then
  print -u2 -r -- ${message}
  exit 1
fi
`
}

/**
 * Generates the zsh launcher for a profile. It opens `claude` (with all args) in a new window of
 * the shared tmux session and attaches through a grouped session, so several terminals can each
 * look at a different window. zsh is found through PATH (/bin/zsh on macOS, /usr/bin/zsh on Linux).
 * With a provider, the window runs this launcher again (`CLAUDE_REMOTE_EXEC=1`) so the key is read
 * from the OS secret store inside the window and never crosses a command line.
 */
export function renderLauncher(profile: Profile, options: LauncherOptions): string {
  const isDefault = isDefaultConfigDir(profile.configDir, options.home)
  // The tmux server may have inherited another profile's CLAUDE_CONFIG_DIR, so `env -u` clears it.
  const configDir = isDefault
    ? 'unset CLAUDE_CONFIG_DIR'
    : `export CLAUDE_CONFIG_DIR=${zshQuote(profile.configDir)}`
  const unsetInPane = isDefault ? 'env -u CLAUDE_CONFIG_DIR ' : ''
  const configEnv = isDefault ? '' : '-e "CLAUDE_CONFIG_DIR=$CLAUDE_CONFIG_DIR" '
  const provider = profile.provider
  const providerBlock = provider ? providerSection(profile.id, provider, unsetInPane, options) : ''
  const command = provider ? `"\${0:A}" "$@"` : `${unsetInPane}"$CLAUDE_BIN" "$@"`
  const execEnv = provider ? '-e "CLAUDE_REMOTE_EXEC=1" ' : ''
  return `#!/usr/bin/env zsh
# Remote Harness launcher for profile "${profile.id}" (${profile.name}). Generated; do not edit.
${configDir}
export CLAUDE_REMOTE_PROFILE=${zshQuote(profile.id)}
TMUX_BIN=\${CLAUDE_REMOTE_TMUX:-${zshQuote(options.tmuxBin)}}
SESSION=${zshQuote(options.tmuxSession)}
CLAUDE_BIN=\${CLAUDE_REMOTE_CLAUDE_BIN:-claude}
${providerBlock}
name="${profile.id}:\${PWD:t}"
cmd=(${command})
command_line="\${(j: :)\${(q)cmd[@]}}"
envs=(${configEnv}${execEnv}-e "CLAUDE_REMOTE_PROFILE=$CLAUDE_REMOTE_PROFILE")

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

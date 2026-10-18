import { SECRET_HEADER } from '../../transport/hooks-server.ts'
import { PANE_HEADER, PROFILE_HEADER } from '../hooks/receiver.ts'

/** File name of the wrapper script in the launcher folder. */
export const STATUS_LINE_SCRIPT = 'remote-harness-statusline'
export const STATUS_LINE_ROUTE = '/statusline'

type Settings = Record<string, unknown>
type StatusLine = Record<string, unknown>

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`
}

/** Our command: the quoted script path, then the user's original command in base64 (if any). */
const OUR_COMMAND = new RegExp(`^'(?:[^']|'\\\\'')*/${STATUS_LINE_SCRIPT}'(?: '([A-Za-z0-9+/=]+)')?$`)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isOurStatusLine(command: unknown): boolean {
  return typeof command === 'string' && OUR_COMMAND.test(command)
}

/** The user's command kept inside ours; `null` when there was none or `command` is not ours. */
export function originalCommand(command: string): string | null {
  const encoded = OUR_COMMAND.exec(command)?.[1]
  return encoded ? Buffer.from(encoded, 'base64').toString('utf8') : null
}

export function statusLineCommand(scriptPath: string, original: string | null): string {
  const quoted = shellQuote(scriptPath)
  return original ? `${quoted} '${Buffer.from(original, 'utf8').toString('base64')}'` : quoted
}

/**
 * Points the profile's status line at our script, keeping the user's command (and every other key)
 * so the script can run it. Idempotent; a status line of another type is left alone.
 */
export function wrapStatusLine<T extends Settings>(
  settings: T,
  scriptPath: string,
): T & { statusLine?: unknown } {
  const current = settings.statusLine
  const object: StatusLine = isRecord(current) ? current : {}
  if (object.type !== undefined && object.type !== 'command') return settings
  const command = typeof object.command === 'string' && object.command.trim() ? object.command : null
  const original = command && isOurStatusLine(command) ? originalCommand(command) : command
  return {
    ...settings,
    statusLine: { ...object, type: 'command', command: statusLineCommand(scriptPath, original) },
  }
}

/** Restores the user's status line, or removes it when there was none. Other settings are untouched. */
export function unwrapStatusLine<T extends Settings>(settings: T): T {
  const current = settings.statusLine
  if (!isRecord(current) || !isOurStatusLine(current.command)) return settings
  const original = originalCommand(current.command as string)
  if (original) return { ...settings, statusLine: { ...current, command: original } }
  const { statusLine: _removed, ...rest } = settings
  return rest as T
}

/**
 * The wrapper: forwards the status JSON to the daemon in the background (a stopped daemon never
 * slows the status line), then runs the original command with the same input.
 */
export function renderStatusLineScript(options: { port: number; secret: string }): string {
  const url = `http://127.0.0.1:${options.port}${STATUS_LINE_ROUTE}`
  const headers = [
    `-H 'content-type: application/json'`,
    `-H ${shellQuote(`${SECRET_HEADER}: ${options.secret}`)}`,
    `-H "${PANE_HEADER}: $TMUX_PANE"`,
    `-H "${PROFILE_HEADER}: $CLAUDE_REMOTE_PROFILE"`,
  ].join(' ')
  return `#!/bin/sh
# Remote Harness status line: sends Claude Code's status JSON to the daemon, then runs the original
# status line command (base64 in $1) with the same input. Generated; do not edit.
input=$(cat)
printf '%s' "$input" | curl -s -m 2 -o /dev/null -X POST ${headers} --data-binary @- ${shellQuote(url)} >/dev/null 2>&1 &
[ -n "$1" ] || exit 0
command=$(printf '%s' "$1" | base64 -d 2>/dev/null || printf '%s' "$1" | base64 -D) || exit 0
printf '%s' "$input" | /bin/sh -c "$command"
`
}

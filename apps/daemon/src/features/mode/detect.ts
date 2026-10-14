import type { PermissionMode } from '@claude-remote/protocol'

/**
 * Status-line labels shown by the Claude Code TUI for each permission mode. Order matters: the
 * first match wins. Keep this the single place that knows these strings.
 */
export const MODE_LABELS: ReadonlyArray<readonly [RegExp, PermissionMode]> = [
  [/bypass permissions on/i, 'bypassPermissions'],
  [/don['’]t ask on/i, 'dontAsk'],
  [/auto mode on/i, 'auto'],
  [/accept edits on/i, 'acceptEdits'],
  [/plan mode on/i, 'plan'],
  [/manual mode on/i, 'default'],
]

const STATUS_LINES = 6

/** Reads the permission mode from the bottom of a captured pane; no label means `default`. */
export function detectMode(paneText: string): PermissionMode {
  const lines = paneText
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .slice(-STATUS_LINES)
  for (const line of lines.reverse()) {
    for (const [pattern, mode] of MODE_LABELS) if (pattern.test(line)) return mode
  }
  return 'default'
}

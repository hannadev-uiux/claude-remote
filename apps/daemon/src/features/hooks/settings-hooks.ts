import { SECRET_HEADER } from '../../transport/hooks-server.ts'
import { HOOK_EVENTS, type HookEventName } from './payloads.ts'
import { PANE_HEADER, PROFILE_HEADER } from './receiver.ts'

type HookEntry = { type: string; url?: string; command?: string; [key: string]: unknown }
type HookGroup = { matcher?: string; hooks: HookEntry[]; [key: string]: unknown }
type Settings = Record<string, unknown> & { hooks?: Record<string, HookGroup[]> }

const OUR_URL = /^http:\/\/127\.0\.0\.1:\d+\/hooks\//
const OUR_COMMAND = /^curl .* 'http:\/\/127\.0\.0\.1:\d+\/hooks\/\w+'/

/** Events where Claude Code runs only command hooks, so we post to the daemon with curl. */
const COMMAND_ONLY_EVENTS: ReadonlySet<HookEventName> = new Set(['SessionStart'])

export function isOurHook(entry: HookEntry): boolean {
  if (entry.type === 'http') return typeof entry.url === 'string' && OUR_URL.test(entry.url)
  return entry.type === 'command' && typeof entry.command === 'string' && OUR_COMMAND.test(entry.command)
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`
}

export type HookInstallOptions = { port: number; secret: string; permissionTimeoutSec: number }

export function buildHookEntry(event: HookEventName, options: HookInstallOptions): HookEntry {
  const url = `http://127.0.0.1:${options.port}/hooks/${event}`
  if (COMMAND_ONLY_EVENTS.has(event)) {
    // Same request as the http hook: stdin JSON as body. Output is discarded because a
    // SessionStart hook's stdout is added to Claude's context; failures never block the session.
    const headers = [
      `${SECRET_HEADER}: ${options.secret}`,
      `${PANE_HEADER}: $TMUX_PANE`,
      `${PROFILE_HEADER}: $CLAUDE_REMOTE_PROFILE`,
    ]
      .map((h) => `-H "${h}"`)
      .join(' ')
    return {
      type: 'command',
      command: `curl -s -m 5 -o /dev/null -X POST -H 'content-type: application/json' ${headers} --data-binary @- ${shellQuote(url)} >/dev/null 2>&1 || true`,
      timeout: 10,
    }
  }
  return {
    type: 'http',
    url,
    timeout: event === 'PermissionRequest' ? options.permissionTimeoutSec : 5,
    headers: {
      [SECRET_HEADER]: options.secret,
      [PANE_HEADER]: '$TMUX_PANE',
      [PROFILE_HEADER]: '$CLAUDE_REMOTE_PROFILE',
    },
    allowedEnvVars: ['TMUX_PANE', 'CLAUDE_REMOTE_PROFILE'],
  }
}

/** Removes our hooks, dropping groups and events that become empty. Never touches user hooks. */
export function removeOurHooks<T extends Settings>(settings: T): T {
  const hooks = settings.hooks
  if (!hooks || typeof hooks !== 'object') return settings
  const next: Record<string, HookGroup[]> = {}
  for (const [event, groups] of Object.entries(hooks)) {
    if (!Array.isArray(groups)) {
      next[event] = groups
      continue
    }
    const kept = groups
      .map((group) => ({ ...group, hooks: (group.hooks ?? []).filter((h) => !isOurHook(h)) }))
      .filter((group) => group.hooks.length > 0)
    if (kept.length > 0) next[event] = kept
  }
  const result: Settings = { ...settings }
  if (Object.keys(next).length > 0) result.hooks = next
  else delete result.hooks
  return result as T
}

/** Idempotently installs our hooks next to whatever the user already has. */
export function mergeOurHooks<T extends Settings>(
  settings: T,
  options: HookInstallOptions,
): T & { hooks: Record<string, HookGroup[]> } {
  const clean = removeOurHooks(settings)
  const hooks: Record<string, HookGroup[]> = { ...(clean.hooks ?? {}) }
  for (const event of HOOK_EVENTS) {
    hooks[event] = [...(hooks[event] ?? []), { hooks: [buildHookEntry(event, options)] }]
  }
  return { ...clean, hooks }
}

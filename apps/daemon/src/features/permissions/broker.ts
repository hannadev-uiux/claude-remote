import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import type { PermissionOutcome, PermissionRequestInfo, Profile, RuleScope } from '@claude-remote/protocol'
import { DaemonError } from '../../core/errors.ts'
import type { Broadcaster } from '../../transport/connection.ts'
import type { HookEvent } from '../hooks/payloads.ts'
import { parseRule, suggestRule } from './rules.ts'

export type Decision = { behavior: 'allow' | 'deny'; always?: { rule: string; scope: RuleScope } }
type Outcome = { kind: 'decision'; decision: Decision } | { kind: 'expired' } | { kind: 'cancelled' }

type Pending = { info: PermissionRequestInfo; cwd: string; settle: (outcome: Outcome) => void }

export type BrokerOptions = {
  timeoutMs: number
  defaultScope: RuleScope
  profiles: readonly Profile[]
  /** Called after a decision is sent, with the file Claude Code will write the rule to (if any). */
  onRuleCreated?: (rule: { rule: string; scope: RuleScope; file: string; sessionId: string }) => void
  onResolved?: (info: PermissionRequestInfo, outcome: PermissionOutcome) => void
  onRequested?: (info: PermissionRequestInfo) => void
}

export const DENY_MESSAGE = 'Negado pelo Claude Remote'
const SCOPE_DESTINATION: Record<RuleScope, 'userSettings' | 'localSettings'> = {
  profile: 'userSettings',
  project: 'localSettings',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function buildHookOutput(decision: Decision): Record<string, unknown> {
  if (decision.behavior === 'deny') {
    return {
      hookSpecificOutput: {
        hookEventName: 'PermissionRequest',
        decision: { behavior: 'deny', message: DENY_MESSAGE },
      },
    }
  }
  const parsed = decision.always ? parseRule(decision.always.rule) : null
  return {
    hookSpecificOutput: {
      hookEventName: 'PermissionRequest',
      decision: {
        behavior: 'allow',
        ...(parsed && decision.always
          ? {
              updatedPermissions: [
                {
                  type: 'addRules',
                  rules: [parsed],
                  behavior: 'allow',
                  destination: SCOPE_DESTINATION[decision.always.scope],
                },
              ],
            }
          : {}),
      },
    },
  }
}

/** Holds PermissionRequest hooks open while the phone decides. First answer wins. */
export class PermissionBroker {
  private readonly pending = new Map<string, Pending>()

  constructor(
    private readonly broadcaster: Broadcaster,
    private readonly options: BrokerOptions,
  ) {}

  list(): PermissionRequestInfo[] {
    return [...this.pending.values()].map((p) => p.info)
  }

  hasPending(sessionId: string): boolean {
    return [...this.pending.values()].some((p) => p.info.sessionId === sessionId)
  }

  async handle(hook: HookEvent, signal: AbortSignal): Promise<Record<string, unknown>> {
    const payload = hook.payload
    const tool = typeof payload.tool_name === 'string' ? payload.tool_name : 'tool'
    const input = isRecord(payload.tool_input) ? payload.tool_input : {}
    const now = Date.now()
    const info: PermissionRequestInfo = {
      requestId: randomUUID(),
      sessionId: payload.session_id,
      profileId: hook.profileId ?? 'unknown',
      tool,
      input,
      suggestedRule: suggestRule(tool, input, payload.permission_suggestions),
      defaultScope: this.options.defaultScope,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + this.options.timeoutMs).toISOString(),
    }

    const outcome = await new Promise<Outcome>((resolve) => {
      const timer = setTimeout(() => settle({ kind: 'expired' }), this.options.timeoutMs)
      const onAbort = () => settle({ kind: 'cancelled' })
      const settle = (result: Outcome) => {
        if (!this.pending.delete(info.requestId)) return
        clearTimeout(timer)
        signal.removeEventListener('abort', onAbort)
        resolve(result)
      }
      this.pending.set(info.requestId, { info, cwd: payload.cwd ?? '', settle })
      if (signal.aborted) return settle({ kind: 'cancelled' })
      signal.addEventListener('abort', onAbort)
      this.broadcaster.broadcast({ type: 'permission.request', request: info })
      this.options.onRequested?.(info)
    })

    const resolved: PermissionOutcome =
      outcome.kind === 'decision'
        ? outcome.decision.behavior === 'allow'
          ? 'allowed'
          : 'denied'
        : outcome.kind
    this.broadcaster.broadcast({
      type: 'permission.resolved',
      requestId: info.requestId,
      sessionId: info.sessionId,
      outcome: resolved,
    })
    this.options.onResolved?.(info, resolved)

    if (outcome.kind !== 'decision') return {}
    const { decision } = outcome
    if (decision.behavior === 'allow' && decision.always) {
      const file = this.ruleFile(info, payload.cwd ?? '', decision.always.scope)
      if (file)
        this.options.onRuleCreated?.({
          rule: decision.always.rule,
          scope: decision.always.scope,
          file,
          sessionId: info.sessionId,
        })
    }
    return buildHookOutput(decision)
  }

  respond(requestId: string, decision: Decision): void {
    const pending = this.pending.get(requestId)
    if (!pending) throw new DaemonError('already_resolved', 'request already resolved or expired')
    if (decision.always && !parseRule(decision.always.rule))
      throw new DaemonError('bad_request', 'invalid rule')
    pending.settle({ kind: 'decision', decision })
  }

  private ruleFile(info: PermissionRequestInfo, cwd: string, scope: RuleScope): string | null {
    if (scope === 'project') return cwd ? join(cwd, '.claude', 'settings.local.json') : null
    const profile = this.options.profiles.find((p) => p.id === info.profileId)
    return profile ? join(profile.configDir, 'settings.json') : null
  }

  /** Releases every pending hook so the TUI shows its own dialog (used on shutdown). */
  dispose(): void {
    for (const pending of [...this.pending.values()]) pending.settle({ kind: 'expired' })
  }
}

import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import type {
  PermissionAnswer,
  PermissionOutcome,
  PermissionRequestInfo,
  Profile,
  RuleScope,
} from '@remote-harness/protocol'
import { DaemonError } from '../../core/errors.ts'
import type { Broadcaster } from '../../transport/connection.ts'
import { adapterOf } from '../agents/index.ts'
import type { HookEvent } from '../hooks/payloads.ts'
import { answerDecision, parseInteraction } from './interaction.ts'
import { parseRule, suggestRule } from './rules.ts'

export type Decision = {
  behavior: 'allow' | 'deny'
  always?: { rule: string; scope: RuleScope }
  /** Replaces the tool input (answers to `AskUserQuestion`). */
  updatedInput?: Record<string, unknown>
  /** Permission mode the session switches to (leaving plan mode). */
  mode?: 'acceptEdits' | 'default'
  /** Deny message for Claude instead of the default one (plan feedback). */
  message?: string
}
type Outcome = { kind: 'decision'; decision: Decision } | { kind: 'expired' } | { kind: 'cancelled' }

type Pending = {
  info: PermissionRequestInfo
  cwd: string
  /** The agent accepts rules and mode changes in the answer (Claude Code). */
  rules: boolean
  settle: (outcome: Outcome) => void
}

export type BrokerOptions = {
  timeoutMs: number
  defaultScope: RuleScope
  profiles: readonly Profile[]
  /** Called after a decision is sent, with the file Claude Code will write the rule to (if any). */
  onRuleCreated?: (rule: { rule: string; scope: RuleScope; file: string; sessionId: string }) => void
  onResolved?: (info: PermissionRequestInfo, outcome: PermissionOutcome) => void
  onRequested?: (info: PermissionRequestInfo) => void
  /** Shown by Claude Code when the phone denies, in the configured language. */
  denyMessage: string
  /** Sent to Claude when the user keeps planning without feedback, in the configured language. */
  keepPlanningMessage: string
}

const SCOPE_DESTINATION: Record<RuleScope, 'userSettings' | 'localSettings'> = {
  profile: 'userSettings',
  project: 'localSettings',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function buildHookOutput(decision: Decision, denyMessage: string): Record<string, unknown> {
  if (decision.behavior === 'deny') {
    return {
      hookSpecificOutput: {
        hookEventName: 'PermissionRequest',
        decision: { behavior: 'deny', message: decision.message ?? denyMessage },
      },
    }
  }
  const parsed = decision.always ? parseRule(decision.always.rule) : null
  const updatedPermissions = [
    ...(parsed && decision.always
      ? [
          {
            type: 'addRules',
            rules: [parsed],
            behavior: 'allow',
            destination: SCOPE_DESTINATION[decision.always.scope],
          },
        ]
      : []),
    ...(decision.mode ? [{ type: 'setMode', mode: decision.mode, destination: 'session' }] : []),
  ]
  return {
    hookSpecificOutput: {
      hookEventName: 'PermissionRequest',
      decision: {
        behavior: 'allow',
        ...(decision.updatedInput ? { updatedInput: decision.updatedInput } : {}),
        ...(updatedPermissions.length > 0 ? { updatedPermissions } : {}),
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

  /** Denies every pending request of a session (before closing it, so the agent is not stuck in the hook). */
  denyAll(sessionId: string, message?: string): number {
    const mine = [...this.pending.values()].filter((p) => p.info.sessionId === sessionId)
    for (const pending of mine) {
      pending.settle({ kind: 'decision', decision: { behavior: 'deny', ...(message ? { message } : {}) } })
    }
    return mine.length
  }

  async handle(hook: HookEvent, signal: AbortSignal): Promise<Record<string, unknown>> {
    const payload = hook.payload
    const tool = typeof payload.tool_name === 'string' ? payload.tool_name : 'tool'
    const input = isRecord(payload.tool_input) ? payload.tool_input : {}
    const now = Date.now()
    const profile = this.options.profiles.find((p) => p.id === hook.profileId)
    const rules = adapterOf(profile?.agent).permissionRules
    const interaction = rules ? parseInteraction(tool, input) : null
    const info: PermissionRequestInfo = {
      requestId: randomUUID(),
      sessionId: payload.session_id,
      profileId: hook.profileId ?? 'unknown',
      tool,
      input,
      suggestedRule: rules ? suggestRule(tool, input, payload.permission_suggestions) : null,
      defaultScope: this.options.defaultScope,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + this.options.timeoutMs).toISOString(),
      ...(interaction ? { interaction } : {}),
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
      this.pending.set(info.requestId, { info, cwd: payload.cwd ?? '', rules, settle })
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
    // Codex takes rules or a mode change in the answer as a failed hook: send the bare decision.
    const decision: Decision = rules
      ? outcome.decision
      : {
          behavior: outcome.decision.behavior,
          ...(outcome.decision.message ? { message: outcome.decision.message } : {}),
        }
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
    return buildHookOutput(decision, this.options.denyMessage)
  }

  respond(requestId: string, decision: Decision): void {
    const pending = this.pending.get(requestId)
    if (!pending) throw new DaemonError('already_resolved', 'request already resolved or expired')
    if (decision.always && !pending.rules)
      throw new DaemonError('bad_request', 'this agent does not take permission rules')
    if (decision.always && !parseRule(decision.always.rule))
      throw new DaemonError('bad_request', 'invalid rule')
    // Allowing a menu without its answer would only show it again in the terminal.
    if (decision.behavior === 'allow' && pending.info.interaction)
      throw new DaemonError('bad_request', 'interactive requests take permission.answer')
    pending.settle({ kind: 'decision', decision })
  }

  /** Answers a question or plan approval; the first answer (phone or terminal) wins. */
  answer(requestId: string, answer: PermissionAnswer): void {
    const pending = this.pending.get(requestId)
    if (!pending) throw new DaemonError('already_resolved', 'request already resolved or expired')
    const decision = answerDecision(pending.info, answer, this.options.keepPlanningMessage)
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

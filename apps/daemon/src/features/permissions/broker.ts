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
import { localSettingsRoot } from '../checkout/worktree-copy.ts'
import type { HookEvent } from '../hooks/payloads.ts'
import { type HookEnd, handoverDelay, handoverOutcome, reminderDelay, timeoutFor } from './handover.ts'
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
/** `aborted`: the agent closed the hook; `cancelled`: the session ended. */
type Outcome =
  | { kind: 'decision'; decision: Decision }
  | { kind: 'expired' }
  | { kind: 'aborted' }
  | { kind: 'cancelled' }

type Pending = {
  info: PermissionRequestInfo
  cwd: string
  /** The agent accepts rules and mode changes in the answer (Claude Code). */
  rules: boolean
  settle: (outcome: Outcome) => void
}

/** A request whose hook stopped waiting while the agent's dialog may still be open. */
type Handover = {
  info: PermissionRequestInfo
  end: HookEnd
  timer: ReturnType<typeof setTimeout> | undefined
}

/** Per request until it is resolved: whether the session moved on, its watch and its reminder. */
type Tracking = { moved: boolean; stopWatch: () => void; reminder: ReturnType<typeof setTimeout> | undefined }

export type BrokerOptions = {
  /** Wait for tool permissions. */
  timeoutMs: number
  /** Wait for questions and plan approvals (defaults to `timeoutMs`). */
  questionTimeoutMs?: number
  /** Grace after the agent closes the hook before handing the request over (tests). */
  handoverGraceMs?: number
  /**
   * Calls `onMove` when the session shows it went past the dialog (a tool result or prompt in the
   * transcript, a turn hook). Returns a function that stops watching.
   */
  watch?: (sessionId: string, onMove: () => void) => () => void
  defaultScope: RuleScope
  profiles: readonly Profile[]
  /** Called after a decision is sent, with the file Claude Code will write the rule to (if any). */
  onRuleCreated?: (rule: { rule: string; scope: RuleScope; file: string; sessionId: string }) => void
  onResolved?: (info: PermissionRequestInfo, outcome: PermissionOutcome) => void
  onRequested?: (info: PermissionRequestInfo) => void
  /** The request was handed over to the terminal (sent again with `terminal`). */
  onHandover?: (info: PermissionRequestInfo, end: HookEnd) => void
  /** A question or plan is still open after `QUESTION_REMINDER_MS`. */
  onReminder?: (info: PermissionRequestInfo) => void
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

/**
 * Holds PermissionRequest hooks open while the phone decides. First answer wins. A hook that stops
 * waiting without an answer hands its request over to the terminal until the session moves on.
 */
export class PermissionBroker {
  private readonly pending = new Map<string, Pending>()
  private readonly handedOver = new Map<string, Handover>()
  private readonly tracking = new Map<string, Tracking>()
  private stopping = false

  constructor(
    private readonly broadcaster: Broadcaster,
    private readonly options: BrokerOptions,
  ) {}

  /** Open and handed-over requests (a client that connects sees both). */
  list(): PermissionRequestInfo[] {
    return [...this.pending.values(), ...this.handedOver.values()].map((p) => p.info)
  }

  /** The session waits on a request, open or handed over to the terminal. */
  hasPending(sessionId: string): boolean {
    return this.list().some((info) => info.sessionId === sessionId)
  }

  /**
   * Denies every open request of a session (before closing it, so the agent is not stuck in the
   * hook). Handed-over requests have no hook left to answer.
   */
  denyAll(sessionId: string, message?: string): number {
    const mine = [...this.pending.values()].filter((p) => p.info.sessionId === sessionId)
    for (const pending of mine) {
      pending.settle({ kind: 'decision', decision: { behavior: 'deny', ...(message ? { message } : {}) } })
    }
    return mine.length
  }

  /** Drops every request of a session that ended: open ones resolve as `cancelled`. */
  cancelAll(sessionId: string): number {
    const mine = [...this.pending.values()].filter((p) => p.info.sessionId === sessionId)
    for (const pending of mine) pending.settle({ kind: 'cancelled' })
    return mine.length + this.endHandovers(sessionId)
  }

  async handle(hook: HookEvent, signal: AbortSignal): Promise<Record<string, unknown>> {
    const payload = hook.payload
    const tool = typeof payload.tool_name === 'string' ? payload.tool_name : 'tool'
    const input = isRecord(payload.tool_input) ? payload.tool_input : {}
    const now = Date.now()
    const profile = this.options.profiles.find((p) => p.id === hook.profileId)
    const rules = adapterOf(profile?.agent).permissionRules
    const interaction = rules ? parseInteraction(tool, input) : null
    const timeoutMs = timeoutFor(interaction ? { interaction } : {}, {
      permissionMs: this.options.timeoutMs,
      questionMs: this.options.questionTimeoutMs ?? this.options.timeoutMs,
    })
    // A new request means the agent went past any dialog it showed before.
    this.endHandovers(payload.session_id)
    const info: PermissionRequestInfo = {
      requestId: randomUUID(),
      sessionId: payload.session_id,
      profileId: hook.profileId ?? 'unknown',
      tool,
      input,
      suggestedRule: rules ? suggestRule(tool, input, payload.permission_suggestions) : null,
      defaultScope: this.options.defaultScope,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + timeoutMs).toISOString(),
      ...(interaction ? { interaction } : {}),
    }

    this.track(info, timeoutMs)
    const outcome = await new Promise<Outcome>((resolve) => {
      const timer = setTimeout(() => settle({ kind: 'expired' }), timeoutMs)
      const onAbort = () => settle({ kind: 'aborted' })
      const settle = (result: Outcome) => {
        if (!this.pending.delete(info.requestId)) return
        clearTimeout(timer)
        signal.removeEventListener('abort', onAbort)
        resolve(result)
      }
      this.pending.set(info.requestId, { info, cwd: payload.cwd ?? '', rules, settle })
      if (signal.aborted) return settle({ kind: 'aborted' })
      signal.addEventListener('abort', onAbort)
      this.broadcaster.broadcast({ type: 'permission.request', request: info })
      this.options.onRequested?.(info)
    })

    if (outcome.kind === 'expired' || outcome.kind === 'aborted') {
      // Shutting down, or already answered in the terminal (the session moved on): done.
      const answered = outcome.kind === 'aborted' && this.tracking.get(info.requestId)?.moved === true
      if (this.stopping || answered) this.resolve(info, answered ? 'cancelled' : 'expired')
      else this.handOver(info, outcome.kind)
      return {}
    }
    if (outcome.kind === 'cancelled') {
      this.resolve(info, 'cancelled')
      return {}
    }
    this.resolve(info, outcome.decision.behavior === 'allow' ? 'allowed' : 'denied')
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
    const pending = this.open(requestId)
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
    const pending = this.open(requestId)
    const decision = answerDecision(pending.info, answer, this.options.keepPlanningMessage)
    pending.settle({ kind: 'decision', decision })
  }

  private ruleFile(info: PermissionRequestInfo, cwd: string, scope: RuleScope): string | null {
    // A worktree Claude Code created keeps its project rules in the main checkout's file.
    if (scope === 'project')
      return cwd ? join(localSettingsRoot(cwd), '.claude', 'settings.local.json') : null
    const profile = this.options.profiles.find((p) => p.id === info.profileId)
    return profile ? join(profile.configDir, 'settings.json') : null
  }

  /** Releases every pending hook so the TUI shows its own dialog (used on shutdown). */
  dispose(): void {
    this.stopping = true
    for (const pending of [...this.pending.values()]) pending.settle({ kind: 'expired' })
    for (const requestId of [...this.handedOver.keys()]) this.endHandover(requestId)
  }

  private open(requestId: string): Pending {
    const pending = this.pending.get(requestId)
    if (pending) return pending
    if (this.handedOver.has(requestId))
      throw new DaemonError('already_resolved', 'the hook stopped waiting: answer it in the terminal')
    throw new DaemonError('already_resolved', 'request already resolved or expired')
  }

  /** Starts the session watch and the reminder of a new request. */
  private track(info: PermissionRequestInfo, timeoutMs: number): void {
    const reminderMs = reminderDelay(info, timeoutMs)
    const tracking: Tracking = {
      moved: false,
      stopWatch: () => undefined,
      reminder:
        reminderMs === null ? undefined : setTimeout(() => this.options.onReminder?.(info), reminderMs),
    }
    this.tracking.set(info.requestId, tracking)
    const stop = this.options.watch?.(info.sessionId, () => {
      tracking.moved = true
      this.endHandover(info.requestId)
    })
    if (stop) tracking.stopWatch = stop
  }

  private handOver(info: PermissionRequestInfo, end: HookEnd): void {
    const handover: Handover = { info, end, timer: undefined }
    this.handedOver.set(info.requestId, handover)
    const show = () => {
      handover.info = { ...info, terminal: true }
      this.broadcaster.broadcast({ type: 'permission.request', request: handover.info })
      this.options.onHandover?.(handover.info, end)
    }
    const delay = handoverDelay(end, this.options.handoverGraceMs)
    if (delay === 0) show()
    else handover.timer = setTimeout(show, delay)
  }

  /** The session moved on (or ended): a handed-over request is resolved. */
  private endHandover(requestId: string): void {
    const handover = this.handedOver.get(requestId)
    if (!handover) return
    this.handedOver.delete(requestId)
    clearTimeout(handover.timer)
    this.resolve(handover.info, handoverOutcome(handover.end))
  }

  private endHandovers(sessionId: string): number {
    const mine = [...this.handedOver.values()].filter((h) => h.info.sessionId === sessionId)
    for (const handover of mine) this.endHandover(handover.info.requestId)
    return mine.length
  }

  private resolve(info: PermissionRequestInfo, outcome: PermissionOutcome): void {
    const tracking = this.tracking.get(info.requestId)
    if (tracking) {
      this.tracking.delete(info.requestId)
      clearTimeout(tracking.reminder)
      tracking.stopWatch()
    }
    this.broadcaster.broadcast({
      type: 'permission.resolved',
      requestId: info.requestId,
      sessionId: info.sessionId,
      outcome,
    })
    this.options.onResolved?.(info, outcome)
  }
}

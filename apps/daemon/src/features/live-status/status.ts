import type { LiveState, LiveStatusProps, TranscriptEntry } from '@remote-harness/protocol'
import type { Messages } from '../../core/i18n/index.ts'

export type LiveStep = keyof Messages['live']['steps']

/** Live status of one registered session. Only categories and counts: never session content. */
export type LiveStatus = {
  state: LiveState
  step: LiveStep | null
  toolCount: number
  /** Start of the current turn, epoch milliseconds. */
  startedAt: number
}

export type LiveEvent =
  | { type: 'prompt'; at: number }
  | { type: 'step'; step: LiveStep; tool: boolean }
  | { type: 'waiting'; permission: boolean }
  | { type: 'resumed' }
  | { type: 'stop' }
  | { type: 'end' }

/** Step-only changes are sent at most this often (state changes go out at once). */
export const STEP_INTERVAL_MS = 15_000
/** The activity looks stale after this long without an update. */
export const STALE_AFTER_MS = 30 * 60_000
/** A finished turn stays on the lock screen this long. */
export const DONE_DISMISS_MS = 15 * 60_000

const TOOL_STEPS: Record<string, LiveStep> = {
  Bash: 'command',
  BashOutput: 'command',
  Edit: 'editing',
  MultiEdit: 'editing',
  Write: 'editing',
  NotebookEdit: 'editing',
  Read: 'reading',
  Grep: 'searching',
  Glob: 'searching',
  LS: 'searching',
  WebFetch: 'web',
  WebSearch: 'web',
  Task: 'agent',
  Agent: 'agent',
  TodoWrite: 'planning',
}

/** Fixed category for a tool name; the tool's input and output never leave the daemon. */
export function toolStep(name: string): LiveStep {
  return TOOL_STEPS[name] ?? 'tool'
}

/** The step event a transcript entry stands for, if any. */
export function stepForEntry(entry: TranscriptEntry): LiveEvent | null {
  if (entry.isSidechain) return null
  switch (entry.kind) {
    case 'tool_use':
      return { type: 'step', step: toolStep(entry.name), tool: true }
    case 'thinking':
      return { type: 'step', step: 'thinking', tool: false }
    case 'assistant_text':
      return { type: 'step', step: 'writing', tool: false }
    default:
      return null
  }
}

export function initialLiveStatus(at: number): LiveStatus {
  return { state: 'working', step: null, toolCount: 0, startedAt: at }
}

/** Next status after an event. A finished or closed status only changes with a new prompt. */
export function reduceLiveStatus(status: LiveStatus, event: LiveEvent): LiveStatus {
  if (event.type === 'prompt') return initialLiveStatus(event.at)
  if (status.state === 'done' || status.state === 'closed') return status
  switch (event.type) {
    case 'step':
      return {
        ...status,
        state: 'working',
        step: event.step,
        toolCount: status.toolCount + (event.tool ? 1 : 0),
      }
    case 'waiting':
      return { ...status, state: 'waiting', step: event.permission ? 'permission' : status.step }
    case 'resumed':
      return status.state === 'waiting' ? { ...status, state: 'working', step: null } : status
    case 'stop':
      return { ...status, state: 'done', step: null }
    case 'end':
      return { ...status, state: 'closed', step: null }
  }
}

/** Whether the status ended the activity (no more updates after it). */
export function isFinal(status: LiveStatus): boolean {
  return status.state === 'done' || status.state === 'closed'
}

/**
 * When to send `next`: `now` for a state change (or the first send), `later` (after the delay) for a
 * step-only change inside the throttle window, `never` when nothing visible changed.
 */
export function planSend(
  previous: LiveStatus | null,
  next: LiveStatus,
  lastSentAt: number | null,
  now: number,
): { when: 'now' } | { when: 'later'; delayMs: number } | { when: 'never' } {
  if (
    !previous ||
    lastSentAt === null ||
    previous.state !== next.state ||
    previous.startedAt !== next.startedAt
  ) {
    return { when: 'now' }
  }
  if (previous.step === next.step && previous.toolCount === next.toolCount) return { when: 'never' }
  const elapsed = now - lastSentAt
  return elapsed >= STEP_INTERVAL_MS
    ? { when: 'now' }
    : { when: 'later', delayMs: STEP_INTERVAL_MS - elapsed }
}

/** Props shown by the widget and the Android notification, in the daemon's language. */
export function liveProps(status: LiveStatus, title: string, messages: Messages['live']): LiveStatusProps {
  return {
    title,
    state: status.state,
    status: messages.states[status.state],
    step: status.step ? messages.steps[status.step] : '',
    tools: status.toolCount > 0 ? messages.tools(status.toolCount) : '',
    startedAt: status.startedAt,
  }
}

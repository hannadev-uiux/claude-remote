import type { LiveState, LiveStatusProps, TranscriptEntry } from '@remote-harness/protocol'
import type { Messages } from '../../core/i18n/index.ts'

export type LiveStep = keyof Messages['live']['steps']

/** One line of the latest steps: a category, the tool behind it and how many times in a row. */
export type RecentStep = { step: LiveStep; tool: string | null; count: number }

/** Live status of one registered session. Only categories and counts: never session content. */
export type LiveStatus = {
  state: LiveState
  step: LiveStep | null
  toolCount: number
  /** Start of the current turn, epoch milliseconds. */
  startedAt: number
  /** Last state change, epoch milliseconds. */
  changedAt: number
  /** End of the turn (done or closed), epoch milliseconds. */
  endedAt: number | null
  /** Latest steps, newest first. */
  recent: RecentStep[]
}

export type LiveEvent =
  | { type: 'prompt' }
  | { type: 'step'; step: LiveStep; tool: string | null }
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
/** Lines of latest steps kept. */
export const RECENT_STEPS = 3

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
      return { type: 'step', step: toolStep(entry.name), tool: entry.name }
    case 'thinking':
      return { type: 'step', step: 'thinking', tool: null }
    case 'assistant_text':
      return { type: 'step', step: 'writing', tool: null }
    default:
      return null
  }
}

export function initialLiveStatus(at: number): LiveStatus {
  return {
    state: 'working',
    step: null,
    toolCount: 0,
    startedAt: at,
    changedAt: at,
    endedAt: null,
    recent: [],
  }
}

/** Adds a step to the latest ones, merging it with the newest when it repeats. */
export function pushRecent(recent: readonly RecentStep[], step: LiveStep, tool: string | null): RecentStep[] {
  const [newest, ...older] = recent
  if (newest && newest.step === step && newest.tool === tool) {
    return [{ ...newest, count: newest.count + 1 }, ...older]
  }
  return [{ step, tool, count: 1 }, ...recent].slice(0, RECENT_STEPS)
}

/** `status` in `state`, stamping the change time only when the state actually changes. */
function withState(status: LiveStatus, state: LiveState, now: number): LiveStatus {
  return status.state === state ? status : { ...status, state, changedAt: now }
}

/** Next status after an event at `now`. A finished or closed status only changes with a new prompt. */
export function reduceLiveStatus(status: LiveStatus, event: LiveEvent, now: number): LiveStatus {
  if (event.type === 'prompt') return initialLiveStatus(now)
  if (status.state === 'done' || status.state === 'closed') return status
  switch (event.type) {
    case 'step':
      return {
        ...withState(status, 'working', now),
        step: event.step,
        toolCount: status.toolCount + (event.tool ? 1 : 0),
        recent: pushRecent(status.recent, event.step, event.tool),
      }
    case 'waiting':
      return { ...withState(status, 'waiting', now), step: event.permission ? 'permission' : status.step }
    case 'resumed':
      return status.state === 'waiting' ? { ...withState(status, 'working', now), step: null } : status
    case 'stop':
      return { ...withState(status, 'done', now), step: null, endedAt: now }
    case 'end':
      return { ...withState(status, 'closed', now), step: null, endedAt: now }
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
  if (
    previous.step === next.step &&
    previous.toolCount === next.toolCount &&
    previous.recent === next.recent
  ) {
    return { when: 'never' }
  }
  const elapsed = now - lastSentAt
  return elapsed >= STEP_INTERVAL_MS
    ? { when: 'now' }
    : { when: 'later', delayMs: STEP_INTERVAL_MS - elapsed }
}

/** What the live status shows about the session besides its status. */
export type LiveSessionInfo = {
  /** Profile name. */
  title: string
  host: string
  session: string
  path: string
}

/** Short tool name: MCP tools (`mcp__server__tool`) keep only the tool. */
function shortTool(name: string): string {
  return name.startsWith('mcp__') ? (name.split('__').at(-1) ?? name) : name
}

/** One translated line of the latest steps: "Bash · running a command ×2". */
export function recentLine(recent: RecentStep, messages: Messages['live']): string {
  const step = messages.steps[recent.step]
  const text = recent.tool
    ? `${shortTool(recent.tool)} · ${step}`
    : step.charAt(0).toUpperCase() + step.slice(1)
  return recent.count > 1 ? `${text} ×${recent.count}` : text
}

/** Props shown by the widget and the Android notification, in the daemon's language. */
export function liveProps(
  status: LiveStatus,
  info: LiveSessionInfo,
  messages: Messages['live'],
): LiveStatusProps {
  return {
    title: info.title,
    state: status.state,
    status: messages.states[status.state],
    step: status.step ? messages.steps[status.step] : '',
    tools: status.toolCount > 0 ? messages.tools(status.toolCount) : '',
    startedAt: status.startedAt,
    host: info.host,
    session: info.session,
    path: info.path,
    recent: status.recent.map((recent) => recentLine(recent, messages)),
    ago: messages.ago,
    changedAt: status.changedAt,
    endedAt: status.endedAt,
  }
}

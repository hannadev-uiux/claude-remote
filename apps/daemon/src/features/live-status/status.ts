import type { LiveState, LiveStatusProps, Session, TranscriptEntry } from '@remote-harness/protocol'
import type { Messages } from '../../core/i18n/index.ts'

export type LiveStep = keyof Messages['live']['steps']

/** One line of the latest steps: a category, the tool behind it and how many times in a row. */
export type RecentStep = { step: LiveStep; tool: string | null; count: number }

/** The tool permission the session waits for: only its id and the tool name, never the input. */
export type LivePendingRequest = { requestId: string; tool: string }

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
  /** Last step categories, newest first (the glyph row). */
  glyphs: LiveStep[]
  /** Tool permission waiting for an answer, answerable from the lock screen. */
  pending: LivePendingRequest | null
  /** Tasks running in parallel in the session (background tasks and running subagents). */
  tasks: number
}

export type LiveEvent =
  | { type: 'prompt' }
  | { type: 'step'; step: LiveStep; tool: string | null }
  /** `pending: null` drops the lock-screen answer (the request moved to the terminal). */
  | { type: 'waiting'; permission: boolean; pending?: LivePendingRequest | null }
  | { type: 'resumed' }
  | { type: 'stop' }
  | { type: 'end' }
  | { type: 'tasks'; count: number }

/** Step-only changes are sent at most this often (state changes go out at once). */
export const STEP_INTERVAL_MS = 15_000
/** The activity looks stale after this long without an update. */
export const STALE_AFTER_MS = 30 * 60_000
/** A finished turn stays on the lock screen this long, and a new turn in that window reuses it. */
export const DONE_DISMISS_MS = 15 * 60_000
/** Lines of latest steps kept. */
export const RECENT_STEPS = 3
/** Glyphs of latest steps kept. */
export const RECENT_GLYPHS = 5

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

/** One glyph per step category, drawn by the widget's recent row. */
export const GLYPHS: Record<LiveStep, string> = {
  command: '⌘',
  editing: '✎',
  reading: '⌕',
  searching: '⌕',
  web: '⇄',
  agent: '⌥',
  permission: '?',
  thinking: '·',
  writing: '·',
  planning: '·',
  tool: '·',
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

export function initialLiveStatus(at: number, tasks = 0): LiveStatus {
  return {
    state: 'working',
    step: null,
    toolCount: 0,
    startedAt: at,
    changedAt: at,
    endedAt: null,
    recent: [],
    glyphs: [],
    pending: null,
    tasks,
  }
}

/** Tasks a session runs in parallel: its background tasks plus the subagents still running. */
export function parallelTasks(session: Pick<Session, 'backgroundTasks' | 'subagents'>): number {
  return session.backgroundTasks + session.subagents.filter((s) => s.state === 'running').length
}

/** Adds a step to the latest ones, merging it with the newest when it repeats. */
export function pushRecent(recent: readonly RecentStep[], step: LiveStep, tool: string | null): RecentStep[] {
  const [newest, ...older] = recent
  if (newest && newest.step === step && newest.tool === tool) {
    return [{ ...newest, count: newest.count + 1 }, ...older]
  }
  return [{ step, tool, count: 1 }, ...recent].slice(0, RECENT_STEPS)
}

/** Adds a step to the glyph row (repeats kept: the row reads as a timeline). */
export function pushGlyph(glyphs: readonly LiveStep[], step: LiveStep): LiveStep[] {
  return [step, ...glyphs].slice(0, RECENT_GLYPHS)
}

/** `status` in `state`, stamping the change time only when the state actually changes. */
function withState(status: LiveStatus, state: LiveState, now: number): LiveStatus {
  return status.state === state ? status : { ...status, state, changedAt: now }
}

/**
 * Next status after an event at `now`. A finished status only changes with a new prompt, a task
 * count (background tasks outlive the turn) or the session closing; a closed one never does.
 */
export function reduceLiveStatus(status: LiveStatus, event: LiveEvent, now: number): LiveStatus {
  if (event.type === 'prompt') return initialLiveStatus(now, status.tasks)
  if (status.state === 'closed') return status
  if (event.type === 'tasks') return status.tasks === event.count ? status : { ...status, tasks: event.count }
  if (status.state === 'done' && event.type !== 'end') return status
  switch (event.type) {
    case 'step':
      return {
        ...withState(status, 'working', now),
        step: event.step,
        toolCount: status.toolCount + (event.tool ? 1 : 0),
        recent: pushRecent(status.recent, event.step, event.tool),
        glyphs: pushGlyph(status.glyphs, event.step),
      }
    case 'waiting': {
      const waiting = withState(status, 'waiting', now)
      if (!event.permission) return waiting
      return {
        ...waiting,
        step: 'permission',
        pending: event.pending === undefined ? status.pending : event.pending,
        // The permission shows once in the row, however many times the daemon hears about it.
        glyphs: status.glyphs[0] === 'permission' ? status.glyphs : pushGlyph(status.glyphs, 'permission'),
      }
    }
    case 'resumed':
      return status.state === 'waiting'
        ? { ...withState(status, 'working', now), step: null, pending: null }
        : status
    case 'stop':
      return { ...withState(status, 'done', now), step: null, endedAt: now, pending: null }
    case 'end':
      return { ...withState(status, 'closed', now), step: null, endedAt: now, pending: null }
  }
}

/** Whether the status ends the activity at once (closed). A done one ends after DONE_DISMISS_MS. */
export function isFinal(status: LiveStatus): boolean {
  return status.state === 'closed'
}

/**
 * When to send `next`: `now` for a state or pending change (or the first send), `later` (after the
 * delay) for a step-only change inside the throttle window, `never` when nothing visible changed.
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
    previous.startedAt !== next.startedAt ||
    previous.pending?.requestId !== next.pending?.requestId
  ) {
    return { when: 'now' }
  }
  if (
    previous.step === next.step &&
    previous.toolCount === next.toolCount &&
    previous.recent === next.recent &&
    previous.tasks === next.tasks
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
    glyphs: status.glyphs.map((step) => GLYPHS[step]),
    pending: status.pending
      ? {
          ...status.pending,
          tool: shortTool(status.pending.tool),
          allow: messages.allow,
          deny: messages.deny,
        }
      : null,
    hint: status.state === 'done' ? messages.total : status.state === 'closed' ? messages.closedHint : '',
    tasks: status.tasks > 0 ? messages.tasks(status.tasks) : '',
  }
}

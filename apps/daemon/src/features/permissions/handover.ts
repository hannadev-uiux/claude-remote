import type { PermissionOutcome, PermissionRequestInfo, TranscriptEntry } from '@remote-harness/protocol'
import type { HookEventName } from '../hooks/payloads.ts'

/**
 * After the agent closes the hook, how long the session has to show it moved on (an answer in
 * the terminal writes its tool result right away) before the request is handed over.
 */
export const HANDOVER_GRACE_MS = 3_000

/** A question or plan still open after this long gets one reminder push. */
export const QUESTION_REMINDER_MS = 10 * 60_000

/** How the hook stopped waiting without the phone's answer. */
export type HookEnd = 'expired' | 'aborted'

/** Questions and plan approvals wait longer than tool permissions. */
export function timeoutFor(
  info: Pick<PermissionRequestInfo, 'interaction'>,
  timeouts: { permissionMs: number; questionMs: number },
): number {
  return info.interaction ? timeouts.questionMs : timeouts.permissionMs
}

/** Delay before handing a request over: right away on our timeout, after the grace on an abort. */
export function handoverDelay(end: HookEnd, graceMs = HANDOVER_GRACE_MS): number {
  return end === 'expired' ? 0 : graceMs
}

/** What clients receive when a handed-over request ends (the session moved on). */
export function handoverOutcome(end: HookEnd): PermissionOutcome {
  return end === 'expired' ? 'expired' : 'cancelled'
}

/** A transcript entry showing the turn went past the dialog: its answer, a rejection or a new prompt. */
export function entryMovesOn(entry: Pick<TranscriptEntry, 'kind'>): boolean {
  return entry.kind === 'tool_result' || entry.kind === 'user'
}

const MOVING_HOOKS: ReadonlySet<HookEventName> = new Set(['UserPromptSubmit', 'Stop', 'SessionEnd'])

/** Session hooks that only arrive once the dialog is gone (new requests are handled by the broker). */
export function hookMovesOn(event: HookEventName): boolean {
  return MOVING_HOOKS.has(event)
}

/** When to remind about an interactive request, or null (tool permissions, or a short timeout). */
export function reminderDelay(
  info: Pick<PermissionRequestInfo, 'interaction'>,
  timeoutMs: number,
): number | null {
  return info.interaction && timeoutMs > QUESTION_REMINDER_MS ? QUESTION_REMINDER_MS : null
}

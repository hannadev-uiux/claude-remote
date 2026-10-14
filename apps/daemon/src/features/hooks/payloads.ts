import { z } from 'zod'

export const HOOK_EVENTS = [
  'SessionStart',
  'SessionEnd',
  'UserPromptSubmit',
  'Stop',
  'SubagentStop',
  'Notification',
  'PermissionRequest',
] as const
export type HookEventName = (typeof HOOK_EVENTS)[number]

export function isHookEventName(value: string): value is HookEventName {
  return (HOOK_EVENTS as readonly string[]).includes(value)
}

/** Fields shared by every hook payload. Unknown fields are kept (`loose`) for feature-specific use. */
export const HookPayloadSchema = z.looseObject({
  session_id: z.string().min(1),
  transcript_path: z.string().optional(),
  cwd: z.string().optional(),
  permission_mode: z.string().optional(),
  hook_event_name: z.string().optional(),
})
export type HookPayload = z.infer<typeof HookPayloadSchema>

/** A hook delivered to the daemon, enriched with the tmux pane and profile it came from. */
export type HookEvent = {
  event: HookEventName
  payload: HookPayload
  /** tmux pane id (`%12`) when the session runs inside tmux. */
  paneId: string | null
  profileId: string | null
  receivedAt: string
}

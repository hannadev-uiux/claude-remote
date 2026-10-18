import type { SessionStatus, UsageWindow } from '@remote-harness/protocol'
import { z } from 'zod'

/** A malformed optional block is dropped instead of rejecting the whole status. */
function optional<T extends z.ZodType>(schema: T) {
  return schema.optional().catch(undefined)
}

const percent = z.number().finite().min(0)
const UsageWindowPayloadSchema = z.looseObject({
  used_percentage: percent,
  /** Epoch seconds. */
  resets_at: z.number().finite().positive(),
})

/**
 * JSON Claude Code passes on stdin to the `statusLine` command. Only the fields the app shows are
 * read; everything is optional because older versions and API-key accounts omit some of them.
 */
export const StatusLinePayloadSchema = z.looseObject({
  session_id: z.string().min(1),
  transcript_path: optional(z.string()),
  model: optional(z.looseObject({ id: optional(z.string()), display_name: optional(z.string()) })),
  effort: optional(z.looseObject({ level: z.string().min(1) })),
  context_window: optional(
    z.looseObject({
      total_input_tokens: optional(z.number().int().nonnegative()),
      context_window_size: z.number().int().positive(),
      used_percentage: optional(percent.nullable()),
    }),
  ),
  rate_limits: optional(
    z.looseObject({
      five_hour: optional(UsageWindowPayloadSchema),
      seven_day: optional(UsageWindowPayloadSchema),
    }),
  ),
})

export type ParsedStatusLine = {
  sessionId: string
  transcriptPath: string | undefined
  /** `null` when the status line carries none of the items. */
  status: SessionStatus | null
  /** `null` without `rate_limits` (API-key accounts, before the first response). */
  limits: { fiveHour: UsageWindow | null; sevenDay: UsageWindow | null } | null
}

function usageWindow(value: z.infer<typeof UsageWindowPayloadSchema> | undefined): UsageWindow | null {
  return value ? { percent: value.used_percentage, resetsAt: value.resets_at * 1000 } : null
}

/** Session status and account limits from a status line JSON; `null` when it is not one. */
export function parseStatusLine(body: unknown): ParsedStatusLine | null {
  const parsed = StatusLinePayloadSchema.safeParse(body)
  if (!parsed.success) return null
  const p = parsed.data
  const model = p.model?.display_name || p.model?.id || null
  const effort = p.effort?.level ?? null
  const window = p.context_window
  const used = window?.used_percentage
  const context =
    window && used !== undefined && used !== null
      ? {
          usedTokens: window.total_input_tokens ?? Math.round((window.context_window_size * used) / 100),
          size: window.context_window_size,
          percent: used,
        }
      : null
  const fiveHour = usageWindow(p.rate_limits?.five_hour)
  const sevenDay = usageWindow(p.rate_limits?.seven_day)
  return {
    sessionId: p.session_id,
    transcriptPath: p.transcript_path,
    status: model || effort || context ? { model, effort, context } : null,
    limits: fiveHour || sevenDay ? { fiveHour, sevenDay } : null,
  }
}

/** How often the stall monitor's timer is due. */
export const STALL_TICK_MS = 500
/** A tick this late means the JavaScript thread was blocked: a stall. */
export const STALL_MIN_MS = 1_000
/** A stall this long is a freeze the user certainly saw. */
export const LONG_STALL_MS = 5_000
/** No daemon connection after this long ends `app_ready` as a timeout. */
export const APP_READY_TIMEOUT_MS = 60_000

/** Stalls of one stretch in the foreground, sent as the `js_responsiveness` trace's metrics. */
export type StallSummary = {
  stalls: number
  long_stalls: number
  stall_max_ms: number
  stall_total_ms: number
}

export const EMPTY_STALLS: StallSummary = { stalls: 0, long_stalls: 0, stall_max_ms: 0, stall_total_ms: 0 }

/** How long the thread was blocked when a tick due at `dueAt` fires at `firedAt` (0 when on time). */
export function stallMs(dueAt: number, firedAt: number): number {
  const late = firedAt - dueAt
  return late >= STALL_MIN_MS ? Math.round(late) : 0
}

export function addStall(summary: StallSummary, ms: number): StallSummary {
  if (ms < STALL_MIN_MS) return summary
  return {
    stalls: summary.stalls + 1,
    long_stalls: summary.long_stalls + (ms >= LONG_STALL_MS ? 1 : 0),
    stall_max_ms: Math.max(summary.stall_max_ms, ms),
    stall_total_ms: summary.stall_total_ms + ms,
  }
}

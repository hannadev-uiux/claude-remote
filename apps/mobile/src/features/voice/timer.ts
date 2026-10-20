/** Elapsed recording time as a ticking clock ("0:07", "1:23"), not `timeline.ts`'s post-hoc "7s"/"1m 30s" summary. */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/** A single recording (across pauses/resumes) stops and finalizes on its own past this long. */
export const MAX_RECORDING_MS = 10 * 60_000

export function hasReachedMaxDuration(elapsedMs: number): boolean {
  return elapsedMs >= MAX_RECORDING_MS
}

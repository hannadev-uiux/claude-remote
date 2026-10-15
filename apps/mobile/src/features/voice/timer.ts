/** Elapsed recording time as a ticking clock ("0:07", "1:23"), not `timeline.ts`'s post-hoc "7s"/"1m 30s" summary. */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

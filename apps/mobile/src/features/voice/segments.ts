/** Finalized recognition segments joined into one transcript, each pause/resume adding a segment. */
export function mergeSegments(segments: readonly string[]): string {
  return segments
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .join(' ')
}

/** The merged segments plus whatever is being recognized right now (not yet final). */
export function liveTranscript(segments: readonly string[], interim: string): string {
  const merged = mergeSegments(segments)
  const live = interim.trim()
  if (!live) return merged
  return merged ? `${merged} ${live}` : live
}

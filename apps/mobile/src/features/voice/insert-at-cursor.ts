/** Inserts the transcript at `cursor`, adding a leading space when the preceding character isn't whitespace. */
export function insertTranscriptAtCursor(
  text: string,
  cursor: number,
  insertion: string,
): { text: string; cursor: number } {
  const before = text.slice(0, cursor)
  const prefix = before.length > 0 && !/\s$/.test(before) ? ' ' : ''
  const next = `${before}${prefix}${insertion}${text.slice(cursor)}`
  return { text: next, cursor: cursor + prefix.length + insertion.length }
}

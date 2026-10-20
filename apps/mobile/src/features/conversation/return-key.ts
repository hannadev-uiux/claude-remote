export type Selection = { start: number; end: number }

/** Replaces the selection with `insert` (⇧⏎ inserts `\n`); the cursor lands right after it. */
export function insertAtSelection(
  text: string,
  selection: Selection,
  insert: string,
): { text: string; cursor: number } {
  const start = Math.max(0, Math.min(selection.start, selection.end, text.length))
  const end = Math.min(text.length, Math.max(selection.start, selection.end))
  return { text: text.slice(0, start) + insert + text.slice(end), cursor: start + insert.length }
}

/**
 * What Return does while it submits (hardware keyboard, or "Return key sends"): accept the
 * highlighted suggestion while the list has rows, otherwise send when there is something to send.
 */
export function returnAction({
  suggestionRows,
  canSend,
}: {
  suggestionRows: number
  canSend: boolean
}): 'accept' | 'send' | null {
  if (suggestionRows > 0) return 'accept'
  return canSend ? 'send' : null
}

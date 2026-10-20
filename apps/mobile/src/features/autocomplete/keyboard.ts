import type { CommandItem, FileItem } from '@remote-harness/protocol'
import type { Suggestions } from './use-suggestions'

export type PickableRow = { kind: 'file'; item: FileItem } | { kind: 'command'; item: CommandItem }

/** The rows of the open suggestions in display order (command sections flattened). */
export function pickableRows(suggestions: Suggestions): PickableRow[] {
  if (!suggestions) return []
  if (suggestions.kind === 'file') return suggestions.items.map((item) => ({ kind: 'file', item }))
  return suggestions.sections.flatMap((section) =>
    section.data.map((row) => ({ kind: 'command' as const, item: row.item })),
  )
}

/** ↑ / ↓ in the suggestions: the next row, staying at either end (no wrap). */
export function moveHighlight(count: number, index: number, delta: 1 | -1): number {
  if (count === 0) return 0
  return Math.min(Math.max(index + delta, 0), count - 1)
}

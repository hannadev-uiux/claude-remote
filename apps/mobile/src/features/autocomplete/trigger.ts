import type { CommandItem, FileItem } from '@remote-harness/protocol'

export type Trigger = { kind: 'file' | 'command'; query: string; start: number; end: number }

/**
 * Finds the `@file` or `/command` token under the cursor. Commands only count at the very start
 * of the prompt, like in the Claude Code TUI.
 */
export function findTrigger(text: string, cursor: number): Trigger | null {
  const upto = text.slice(0, cursor)
  const start = Math.max(upto.lastIndexOf(' '), upto.lastIndexOf('\n'), upto.lastIndexOf('\t')) + 1
  const token = upto.slice(start)
  let end = cursor
  while (end < text.length && !/\s/.test(text[end]!)) end++
  if (token.startsWith('@')) return { kind: 'file', query: token.slice(1), start, end }
  if (token.startsWith('/') && start === 0) return { kind: 'command', query: token.slice(1), start, end }
  return null
}

/**
 * Inserts a trigger typed from the keyboard toolbar. `@` goes at the cursor, after a space when the
 * previous character is not whitespace; `/` only starts a blank prompt (commands only count at the
 * start), so it gives null otherwise.
 */
export function insertTrigger(
  text: string,
  cursor: number,
  trigger: '@' | '/',
): { text: string; cursor: number } | null {
  if (trigger === '/') return text.trim() ? null : { text: '/', cursor: 1 }
  const at = Math.min(Math.max(cursor, 0), text.length)
  const before = text.slice(0, at)
  const insertion = before && !/\s$/.test(before) ? ' @' : '@'
  return { text: `${before}${insertion}${text.slice(at)}`, cursor: at + insertion.length }
}

/** Replaces the trigger token with the chosen suggestion and returns the new text and cursor. */
export function applySuggestion(
  text: string,
  trigger: Trigger,
  suggestion: { kind: 'file'; item: FileItem } | { kind: 'command'; item: CommandItem },
): { text: string; cursor: number } {
  const insertion =
    suggestion.kind === 'file'
      ? `@${suggestion.item.path}${suggestion.item.kind === 'dir' ? '' : ' '}`
      : `/${suggestion.item.name} `
  const after = text.slice(trigger.end).replace(/^ /, '')
  const next = `${text.slice(0, trigger.start)}${insertion}${after}`
  return { text: next, cursor: trigger.start + insertion.length }
}

/** True when the prompt is a native command that opens a menu in the TUI. */
export function isInteractiveCommand(text: string, commands: readonly CommandItem[]): boolean {
  const match = /^\/([\w:.-]+)/.exec(text.trim())
  if (!match) return false
  return commands.some((c) => c.name === match[1] && c.interactive)
}

/**
 * Identity of a trigger token (its kind and where it starts). Dismissing the suggestions (Android
 * back) hides them for this token only; a new `@` or `/` brings them back.
 */
export function triggerKey(trigger: Trigger | null): string | null {
  return trigger ? `${trigger.kind}:${trigger.start}` : null
}

/** Local filtering for commands (the list is small and fetched once per session). */
export function filterCommands(commands: readonly CommandItem[], query: string, limit = 20): CommandItem[] {
  const q = query.toLowerCase()
  const scored = commands
    .map((c) => {
      const name = c.name.toLowerCase()
      const score = name.startsWith(q)
        ? 0
        : name.includes(q)
          ? 1
          : c.description.toLowerCase().includes(q)
            ? 2
            : -1
      return { c, score }
    })
    .filter((x) => x.score >= 0)
  scored.sort((a, b) => a.score - b.score || a.c.name.localeCompare(b.c.name))
  return scored.slice(0, limit).map((x) => x.c)
}

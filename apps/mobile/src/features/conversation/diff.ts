import { diffLines } from 'diff'
import type { TFunction } from '@/core/i18n/create'

export type DiffLine = { kind: 'add' | 'remove' | 'context'; text: string }

const MAX_LINES = 400

function toLines(oldText: string, newText: string): DiffLine[] {
  const out: DiffLine[] = []
  for (const part of diffLines(oldText, newText)) {
    const kind = part.added ? 'add' : part.removed ? 'remove' : 'context'
    const lines = part.value.replace(/\n$/, '').split('\n')
    // Keep only a little unchanged context around edits.
    const visible =
      kind === 'context' && lines.length > 6 ? [...lines.slice(0, 2), '⋯', ...lines.slice(-2)] : lines
    for (const text of visible) out.push({ kind, text })
  }
  return out
}

/** Builds a line diff for Edit / MultiEdit / Write tool inputs; null for other tools. */
export function diffForTool(name: string, input: Record<string, unknown>, t: TFunction): DiffLine[] | null {
  let lines: DiffLine[] | null = null
  if (name === 'Edit' && typeof input.old_string === 'string' && typeof input.new_string === 'string') {
    lines = toLines(input.old_string, input.new_string)
  } else if (name === 'MultiEdit' && Array.isArray(input.edits)) {
    lines = (input.edits as Array<Record<string, unknown>>).flatMap((edit, i) => [
      ...(i > 0 ? [{ kind: 'context' as const, text: '⋯' }] : []),
      ...toLines(String(edit.old_string ?? ''), String(edit.new_string ?? '')),
    ])
  } else if (name === 'Write' && typeof input.content === 'string') {
    lines = input.content.split('\n').map((text) => ({ kind: 'add' as const, text }))
  }
  if (!lines) return null
  return lines.length > MAX_LINES
    ? [
        ...lines.slice(0, MAX_LINES),
        { kind: 'context', text: t('conversation.moreLines', { count: lines.length - MAX_LINES }) },
      ]
    : lines
}

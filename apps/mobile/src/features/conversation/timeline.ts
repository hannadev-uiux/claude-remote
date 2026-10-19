import type { ImageRef, TranscriptEntry } from '@remote-harness/protocol'
import type { TFunction } from '../../core/i18n/create'

type Of<K extends TranscriptEntry['kind']> = Extract<TranscriptEntry, { kind: K }>

export type TimelineItem =
  | { type: 'user'; key: string; text: string; images: ImageRef[] }
  | { type: 'assistant'; key: string; text: string }
  | { type: 'thinking'; key: string; text: string }
  | { type: 'tool'; key: string; use: Of<'tool_use'> | null; result: Of<'tool_result'> | null }
  | {
      type: 'system'
      key: string
      subtype: string
      text: string
      durationMs?: number
      status?: string
      note?: string
      tag?: string
    }
  | { type: 'unknown'; key: string; raw: string }

/** Pairs each tool_use with its tool_result and maps the rest to display items, in order. */
export function buildTimeline(entries: readonly TranscriptEntry[]): TimelineItem[] {
  const results = new Map<string, Of<'tool_result'>>()
  const uses = new Set<string>()
  for (const entry of entries) {
    if (entry.kind === 'tool_result') results.set(entry.toolUseId, entry)
    if (entry.kind === 'tool_use') uses.add(entry.toolUseId)
  }
  const items: TimelineItem[] = []
  for (const entry of entries) {
    switch (entry.kind) {
      case 'user':
        items.push({ type: 'user', key: entry.key, text: entry.text, images: entry.images })
        break
      case 'assistant_text':
        items.push({ type: 'assistant', key: entry.key, text: entry.text })
        break
      case 'thinking':
        items.push({ type: 'thinking', key: entry.key, text: entry.text })
        break
      case 'tool_use':
        items.push({ type: 'tool', key: entry.key, use: entry, result: results.get(entry.toolUseId) ?? null })
        break
      case 'tool_result':
        // Results of calls outside the loaded window are still shown, on their own.
        if (!uses.has(entry.toolUseId)) items.push({ type: 'tool', key: entry.key, use: null, result: entry })
        break
      case 'system':
        items.push({
          type: 'system',
          key: entry.key,
          subtype: entry.subtype,
          text: entry.text,
          durationMs: entry.durationMs,
          status: entry.status,
          note: entry.note,
          tag: entry.tag,
        })
        break
      case 'unknown':
        items.push({ type: 'unknown', key: entry.key, raw: entry.raw })
        break
    }
  }
  return items
}

/** Sorted, de-duplicated merge of transcript entries (by line cursor, then index). */
export function mergeEntries(
  existing: readonly TranscriptEntry[],
  incoming: readonly TranscriptEntry[],
): TranscriptEntry[] {
  if (incoming.length === 0) return existing as TranscriptEntry[]
  const byKey = new Map<string, TranscriptEntry>()
  for (const e of existing) byKey.set(e.key, e)
  for (const e of incoming) byKey.set(e.key, e)
  return [...byKey.values()].sort((a, b) => a.cursor - b.cursor || a.index - b.index)
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

/** System lines the daemon describes in English are written again in the app's language. */
export function systemText(
  item: { subtype: string; text: string; durationMs?: number },
  t: TFunction,
): string {
  if (item.subtype === 'turn_duration' && item.durationMs !== undefined)
    return t('conversation.turnDuration', { duration: formatDuration(item.durationMs) })
  if (item.subtype === 'compact_boundary') return t('conversation.compacted')
  if (item.subtype === 'turn_aborted' && item.text === 'Interrupted') return t('conversation.interrupted')
  return item.text
}

const TASK_STATUSES = ['completed', 'failed', 'stopped', 'killed'] as const
type TaskStatus = (typeof TASK_STATUSES)[number]

function isTaskStatus(status: string): status is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(status)
}

/** Look of a background task notification by status; unknown statuses get the neutral look. */
export function taskTone(status: string | undefined): 'done' | 'failed' | 'stopped' | 'other' {
  if (status === 'completed') return 'done'
  if (status === 'failed') return 'failed'
  if (status === 'stopped' || status === 'killed') return 'stopped'
  return 'other'
}

/** Translated status of a background task; statuses the app does not know are shown as sent. */
export function taskStatusText(status: string | undefined, t: TFunction): string {
  if (!status) return ''
  return isTaskStatus(status) ? t(`conversation.task.status.${status}`) : status
}

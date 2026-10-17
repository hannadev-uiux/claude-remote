import type { TranscriptEntry } from '@remote-harness/protocol'

export type PromptHistoryItem = { key: string; text: string }

/** The user's prompts in the loaded transcript, newest first (empty ones skipped). */
export function promptHistory(entries: readonly TranscriptEntry[]): PromptHistoryItem[] {
  const prompts: PromptHistoryItem[] = []
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i]
    if (entry?.kind === 'user' && entry.text.trim()) prompts.push({ key: entry.key, text: entry.text.trim() })
  }
  return prompts
}

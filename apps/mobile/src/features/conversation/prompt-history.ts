import type { TranscriptEntry } from '@remote-harness/protocol'

export type PromptHistoryItem = { key: string; text: string }

/**
 * The user's prompts in the loaded transcript, newest first. Image-only prompts are listed with
 * `imagesLabel(count)`; empty ones are skipped.
 */
export function promptHistory(
  entries: readonly TranscriptEntry[],
  imagesLabel: (count: number) => string,
): PromptHistoryItem[] {
  const prompts: PromptHistoryItem[] = []
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i]
    if (entry?.kind !== 'user') continue
    const text = entry.text.trim() || (entry.images.length > 0 ? imagesLabel(entry.images.length) : '')
    if (text) prompts.push({ key: entry.key, text })
  }
  return prompts
}

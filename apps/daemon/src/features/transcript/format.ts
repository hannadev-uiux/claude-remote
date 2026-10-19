import type { TranscriptEntry } from '@remote-harness/protocol'

/** A base64 image in a transcript line; other sources (`url`, `file`) are not supported and yield null. */
export type ImageData = { mediaType: string; data: string; bytes: number }

/** Lines that update the session itself rather than the conversation. */
export type TranscriptMetaUpdate = {
  customTitle?: string
  permissionMode?: string
  /** Codex: the approval policy of the turn (`on-request`…), shown as the session's mode. */
  approvalPolicy?: string
}

/**
 * How one agent writes its transcript. Each format lives in its own module and is the only code that
 * knows that agent's lines; the transcript service only sees normalized entries. Never throws.
 */
export type TranscriptFormat = {
  parseLine(raw: string, cursor: number): TranscriptEntry[]
  parseMeta(raw: string): TranscriptMetaUpdate | null
  /** The `index`-th image of a line, matching the ids `parseLine` gave its image refs. */
  findImage(raw: string, index: number): ImageData | null
}

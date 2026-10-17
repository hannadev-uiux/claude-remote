import { open } from 'node:fs/promises'
import { type PermissionMode, PermissionModeSchema } from '@remote-harness/protocol'

export type TranscriptMeta = {
  title: string | null
  cwd: string | null
  permissionMode: PermissionMode | null
}

const TAIL_BYTES = 64 * 1024
const HEAD_BYTES = 32 * 1024
const SCAN_CHUNK_BYTES = 256 * 1024
const CUSTOM_TITLE_MARKER = '"custom-title"'
const NEWLINE = 0x0a

/** Per transcript: bytes already searched for `custom-title` and the latest one found there. */
const titleScans = new Map<string, { scannedTo: number; title: string | null }>()

async function readSlice(path: string, from: 'head' | 'tail', bytes: number): Promise<string> {
  const handle = await open(path, 'r')
  try {
    const { size } = await handle.stat()
    const length = Math.min(bytes, size)
    const position = from === 'tail' ? size - length : 0
    const buffer = Buffer.alloc(length)
    await handle.read(buffer, 0, length, position)
    return buffer.toString('utf8')
  } finally {
    await handle.close()
  }
}

function parseLines(text: string): Record<string, unknown>[] {
  const result: Record<string, unknown>[] = []
  for (const line of text.split('\n')) {
    if (!line.startsWith('{')) continue
    try {
      const value = JSON.parse(line) as unknown
      if (value && typeof value === 'object') result.push(value as Record<string, unknown>)
    } catch {
      // partial line at the slice boundary
    }
  }
  return result
}

function customTitleOf(entry: Record<string, unknown>): string | null {
  return entry.type === 'custom-title' && typeof entry.customTitle === 'string' ? entry.customTitle : null
}

/** Latest `custom-title` among JSONL lines, parsing only the lines that can hold one. */
export function findCustomTitle(text: string): string | null {
  let title: string | null = null
  for (const line of text.split('\n')) {
    if (!line.includes(CUSTOM_TITLE_MARKER)) continue
    for (const entry of parseLines(line)) title = customTitleOf(entry) ?? title
  }
  return title
}

/**
 * Latest `custom-title` anywhere in the transcript. A name given early in a long session falls
 * outside the tail; transcripts only grow, so later calls read just the bytes appended since.
 */
async function latestCustomTitle(path: string): Promise<string | null> {
  const handle = await open(path, 'r')
  try {
    const { size } = await handle.stat()
    const cached = titleScans.get(path)
    let { scannedTo, title } = cached && cached.scannedTo <= size ? cached : { scannedTo: 0, title: null }
    let pending = Buffer.alloc(0)
    let position = scannedTo
    while (position < size) {
      const chunk = Buffer.alloc(Math.min(SCAN_CHUNK_BYTES, size - position))
      const { bytesRead } = await handle.read(chunk, 0, chunk.length, position)
      if (bytesRead === 0) break
      position += bytesRead
      pending = Buffer.concat([pending, chunk.subarray(0, bytesRead)])
      const end = pending.lastIndexOf(NEWLINE)
      if (end === -1) continue
      title = findCustomTitle(pending.subarray(0, end).toString('utf8')) ?? title
      pending = pending.subarray(end + 1)
      scannedTo = position - pending.length
    }
    titleScans.set(path, { scannedTo, title })
    return title
  } finally {
    await handle.close()
  }
}

function userText(entry: Record<string, unknown>): string | null {
  if (entry.type !== 'user' || entry.isMeta === true) return null
  const message = entry.message as { content?: unknown } | undefined
  const content = message?.content
  if (typeof content === 'string') return content
  return null
}

export function oneLine(text: string, max = 80): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
}

/**
 * Extracts title, cwd and permission mode from the transcript's tail and head. The title is the
 * latest name (from the tail, else `earlierTitle`), then the first prompt, then the last prompt.
 */
export function extractMeta(
  tailLines: Record<string, unknown>[],
  headLines: Record<string, unknown>[],
  earlierTitle: string | null = null,
): TranscriptMeta {
  let customTitle: string | null = null
  let lastPrompt: string | null = null
  let cwd: string | null = null
  let permissionMode: PermissionMode | null = null
  for (const entry of tailLines) {
    customTitle = customTitleOf(entry) ?? customTitle
    if (entry.type === 'last-prompt' && typeof entry.lastPrompt === 'string') lastPrompt = entry.lastPrompt
    if (typeof entry.cwd === 'string') cwd = entry.cwd
    if (entry.type === 'permission-mode') {
      const mode = PermissionModeSchema.safeParse(entry.permissionMode)
      if (mode.success) permissionMode = mode.data
    }
  }
  let firstPrompt: string | null = null
  for (const entry of headLines) {
    if (!cwd && typeof entry.cwd === 'string') cwd = entry.cwd
    const text = userText(entry)
    if (!firstPrompt && text && !text.startsWith('<')) firstPrompt = text
  }
  const title = customTitle ?? earlierTitle ?? firstPrompt ?? lastPrompt
  return { title: title ? oneLine(title) : null, cwd, permissionMode }
}

/** Reads a transcript's metadata; the whole file is searched only for a name missing from the tail. */
export async function readTranscriptMeta(path: string): Promise<TranscriptMeta> {
  const [tail, head] = await Promise.all([
    readSlice(path, 'tail', TAIL_BYTES),
    readSlice(path, 'head', HEAD_BYTES),
  ])
  const tailLines = parseLines(tail)
  const named = tailLines.some((entry) => customTitleOf(entry) !== null)
  return extractMeta(tailLines, parseLines(head), named ? null : await latestCustomTitle(path))
}

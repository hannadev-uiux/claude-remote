import { open } from 'node:fs/promises'
import { type PermissionMode, PermissionModeSchema } from '@claude-remote/protocol'

export type TranscriptMeta = {
  title: string | null
  cwd: string | null
  permissionMode: PermissionMode | null
}

const TAIL_BYTES = 64 * 1024
const HEAD_BYTES = 32 * 1024

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

/** Extracts title, cwd and permission mode from a transcript without reading all of it. */
export function extractMeta(
  tailLines: Record<string, unknown>[],
  headLines: Record<string, unknown>[],
): TranscriptMeta {
  let customTitle: string | null = null
  let lastPrompt: string | null = null
  let cwd: string | null = null
  let permissionMode: PermissionMode | null = null
  for (const entry of tailLines) {
    if (entry.type === 'custom-title' && typeof entry.customTitle === 'string')
      customTitle = entry.customTitle
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
  const title = customTitle ?? firstPrompt ?? lastPrompt
  return { title: title ? oneLine(title) : null, cwd, permissionMode }
}

export async function readTranscriptMeta(path: string): Promise<TranscriptMeta> {
  const [tail, head] = await Promise.all([
    readSlice(path, 'tail', TAIL_BYTES),
    readSlice(path, 'head', HEAD_BYTES),
  ])
  return extractMeta(parseLines(tail), parseLines(head))
}

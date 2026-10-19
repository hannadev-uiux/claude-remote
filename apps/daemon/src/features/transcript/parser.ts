/**
 * The ONLY module that knows the Claude Code transcript (.jsonl) format. The format is internal to
 * Claude Code and changes between versions, so everything here is defensive: unknown shapes become
 * `unknown` entries (or are skipped when they are clearly metadata) and nothing throws.
 */
import type { ImageRef, TranscriptEntry } from '@remote-harness/protocol'

export const MAX_TOOL_RESULT_CHARS = 20_000
const MAX_UNKNOWN_RAW_CHARS = 2_000

/** Line types that carry metadata for Claude Code itself, never shown in the conversation. */
const METADATA_TYPES = new Set([
  'file-history-snapshot',
  'file-history-delta',
  'atis-latch',
  'queue-operation',
  'custom-title',
  'agent-name',
  'mode',
  'permission-mode',
  'last-prompt',
  'pr-link',
  'attachment',
  'summary',
  'progress',
])

type Json = Record<string, unknown>

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function str(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function truncate(text: string, max: number): { text: string; truncated: boolean } {
  return text.length > max ? { text: text.slice(0, max), truncated: true } : { text, truncated: false }
}

/** A base64 image block; other sources (`url`, `file`) are not supported and yield null. */
export type ImageData = { mediaType: string; data: string; bytes: number }

function imageData(part: Json): ImageData | null {
  if (!isObject(part.source) || part.source.type !== 'base64') return null
  const data = str(part.source.data)
  const mediaType = str(part.source.media_type)
  if (!data || !mediaType) return null
  return { mediaType, data, bytes: base64Bytes(data) }
}

/** Decoded size of a base64 string. */
export function base64Bytes(data: string): number {
  const padding = data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((data.length * 3) / 4) - padding)
}

/**
 * Image ids are `<cursor>.<n>`: the transcript line and the image's position among the line's image
 * blocks in document order (top-level blocks and those inside tool results). `parseUser` numbers
 * them and `findImage` walks the same order, so ids need no state.
 */
export function parseImageId(id: string): { cursor: number; index: number } | null {
  const match = /^(\d+)\.(\d+)$/.exec(id)
  if (!match) return null
  return { cursor: Number(match[1]), index: Number(match[2]) }
}

/** Numbers a line's image blocks, in the order `findImage` walks them. */
class ImageCounter {
  private next = 0
  constructor(private readonly cursor: number) {}

  /** Ref for an image block (its number is used even when the block cannot be shown). */
  ref(part: Json): ImageRef[] {
    const id = `${this.cursor}.${this.next++}`
    const image = imageData(part)
    return image ? [{ id, mediaType: image.mediaType, bytes: image.bytes }] : []
  }
}

/** Text of a tool result; its image blocks go to `onImage`. */
function toolResultText(content: unknown, onImage: (part: Json) => void): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return content === undefined ? '' : JSON.stringify(content)
  const texts: string[] = []
  for (const part of content) {
    if (!isObject(part)) continue
    if (part.type === 'text') texts.push(str(part.text) ?? '')
    else if (part.type === 'image') onImage(part)
  }
  return texts.filter(Boolean).join('\n')
}

/** Image blocks of a user line in the order `parseUser` numbers them: tool results one level deep. */
function* imageParts(content: unknown, nested = false): Generator<Json> {
  if (!Array.isArray(content)) return
  for (const part of content) {
    if (!isObject(part)) continue
    if (part.type === 'image') yield part
    else if (part.type === 'tool_result' && !nested) yield* imageParts(part.content, true)
  }
}

/** The `index`-th image block of a transcript line (see `parseImageId`), or null. Never throws. */
export function findImage(raw: string, index: number): ImageData | null {
  let line: unknown
  try {
    line = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isObject(line) || line.type !== 'user' || !isObject(line.message)) return null
  let n = 0
  for (const part of imageParts(line.message.content)) {
    if (n++ === index) return imageData(part)
  }
  return null
}

const COMMAND_NAME = /<command-name>([\s\S]*?)<\/command-name>/
const COMMAND_ARGS = /<command-args>([\s\S]*?)<\/command-args>/
const COMMAND_STDOUT = /<local-command-stdout>([\s\S]*?)<\/local-command-stdout>/
const TASK_NOTIFICATION = /<task-notification>([\s\S]*?)<\/task-notification>/g
const BASH_INPUT = /<bash-input>([\s\S]*?)<\/bash-input>/
const BASH_STDOUT = /<bash-stdout>([\s\S]*?)<\/bash-stdout>/
const BASH_STDERR = /<bash-stderr>([\s\S]*?)<\/bash-stderr>/
const OPENING_TAG = /\s*<([a-z][a-z0-9-]*)(?:\s[^>]*)?>/y
const ONLY_SPACE = /\s*$/y

type SystemDraft = Extract<Draft, { kind: 'system' }>
type Classified = { kind: 'user'; text: string } | SystemDraft

/** Trimmed content of the first `<name>` element in `text`, if any. */
function tagContent(text: string, name: string): string | undefined {
  const match = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(text)
  return match?.[1]?.trim()
}

/**
 * First tag name of a string made only of `<tag>…</tag>` blocks, or null. Each block ends at the
 * first matching closing tag: a linear scan, where a backtracking regex could take exponential time.
 */
export function onlyTagsName(text: string): string | null {
  let first: string | null = null
  let at = 0
  while (at < text.length) {
    ONLY_SPACE.lastIndex = at
    if (ONLY_SPACE.test(text)) break
    OPENING_TAG.lastIndex = at
    const open = OPENING_TAG.exec(text)
    const name = open?.[1]
    if (!name) return null
    const close = text.indexOf(`</${name}>`, OPENING_TAG.lastIndex)
    if (close < 0) return null
    first ??= name
    at = close + name.length + 3
  }
  return first
}

/** Status, summary and note of a background task; ids, file paths, usage and result stay out. */
function taskNotification(body: string): SystemDraft {
  const status = tagContent(body, 'status') ?? ''
  const note = tagContent(body, 'note')
  return {
    kind: 'system',
    subtype: 'task_notification',
    text: tagContent(body, 'summary') || status,
    status,
    ...(note ? { note } : {}),
  }
}

/**
 * User strings wrapped in Claude Code's XML-ish tags are not prompts: slash commands and their
 * output, background task notifications, `!` shell commands, or tags the daemon does not know yet.
 */
function classifyUserString(text: string): Classified[] {
  const name = COMMAND_NAME.exec(text)
  if (name) {
    const args = COMMAND_ARGS.exec(text)?.[1]?.trim()
    return [{ kind: 'system', subtype: 'command', text: `${name[1]?.trim()}${args ? ` ${args}` : ''}` }]
  }
  const stdout = COMMAND_STDOUT.exec(text)
  if (stdout) return [{ kind: 'system', subtype: 'command_output', text: stdout[1]?.trim() ?? '' }]
  if (text.startsWith('<command-message>') || text.startsWith('<system-reminder>')) return []
  const tasks = [...text.matchAll(TASK_NOTIFICATION)].map((m) => taskNotification(m[1] ?? ''))
  if (tasks.length > 0) return tasks
  const input = BASH_INPUT.exec(text)
  if (input) return [{ kind: 'system', subtype: 'bash_input', text: input[1]?.trim() ?? '' }]
  if (BASH_STDOUT.test(text) || BASH_STDERR.test(text)) {
    const output = [BASH_STDOUT.exec(text)?.[1]?.trim(), BASH_STDERR.exec(text)?.[1]?.trim()]
    return [{ kind: 'system', subtype: 'bash_output', text: output.filter(Boolean).join('\n') }]
  }
  const tag = onlyTagsName(text)
  if (tag) return [{ kind: 'system', subtype: 'tagged', tag, text: text.trim() }]
  return [{ kind: 'user', text }]
}

type Base = Pick<TranscriptEntry, 'cursor' | 'uuid' | 'timestamp' | 'isSidechain'>
type Draft = TranscriptEntry extends infer E
  ? E extends TranscriptEntry
    ? Omit<E, keyof Base | 'key' | 'index'>
    : never
  : never

/** Drafts of a user text: a prompt, or system entries for tagged text; nothing when empty. */
function userDrafts(text: string): Draft[] {
  return classifyUserString(text).flatMap((c): Draft[] => {
    if (!c.text) return []
    return c.kind === 'user' ? [{ kind: 'user', text: c.text, images: [] }] : [c]
  })
}

function parseUser(line: Json, cursor: number): Draft[] {
  if (line.isMeta === true) return []
  const message = isObject(line.message) ? line.message : {}
  const content = message.content
  if (typeof content === 'string') return userDrafts(content)
  if (!Array.isArray(content)) return []
  const drafts: Draft[] = []
  const counter = new ImageCounter(cursor)
  const promptImages: ImageRef[] = []
  for (const part of content) {
    if (!isObject(part)) continue
    if (part.type === 'tool_result') {
      const images: ImageRef[] = []
      const raw = toolResultText(part.content, (image) => images.push(...counter.ref(image)))
      const { text, truncated } = truncate(raw, MAX_TOOL_RESULT_CHARS)
      drafts.push({
        kind: 'tool_result',
        toolUseId: str(part.tool_use_id) ?? '',
        content: text,
        isError: part.is_error === true,
        truncated,
        images,
      })
    } else if (part.type === 'text') {
      drafts.push(...userDrafts(str(part.text) ?? ''))
    } else if (part.type === 'image') {
      promptImages.push(...counter.ref(part))
    }
  }
  if (promptImages.length > 0) {
    // A prompt's images go with its text; next to a tool result (no prompt text) they belong to the
    // tool; otherwise it is an image-only prompt, a user entry with empty text.
    const prompt = drafts.findLast((d) => d.kind === 'user')
    const result = drafts.findLast((d) => d.kind === 'tool_result')
    if (prompt?.kind === 'user') prompt.images = promptImages
    else if (result?.kind === 'tool_result') result.images = [...result.images, ...promptImages]
    else drafts.push({ kind: 'user', text: '', images: promptImages })
  }
  return drafts
}

function parseAssistant(line: Json): Draft[] {
  const message = isObject(line.message) ? line.message : {}
  const content = message.content
  if (typeof content === 'string') return content.trim() ? [{ kind: 'assistant_text', text: content }] : []
  if (!Array.isArray(content)) return []
  const drafts: Draft[] = []
  for (const part of content) {
    if (!isObject(part)) continue
    switch (part.type) {
      case 'text': {
        const text = str(part.text) ?? ''
        if (text.trim()) drafts.push({ kind: 'assistant_text', text })
        break
      }
      case 'thinking': {
        const text = str(part.thinking) ?? ''
        if (text.trim()) drafts.push({ kind: 'thinking', text })
        break
      }
      case 'tool_use':
      case 'server_tool_use':
        drafts.push({
          kind: 'tool_use',
          toolUseId: str(part.id) ?? '',
          name: str(part.name) ?? 'tool',
          input: isObject(part.input) ? part.input : {},
        })
        break
      default:
        break
    }
  }
  return drafts
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

function parseSystem(line: Json): Draft[] {
  const subtype = str(line.subtype) ?? 'info'
  if (subtype === 'turn_duration' && typeof line.durationMs === 'number') {
    const durationMs = line.durationMs
    return [{ kind: 'system', subtype, text: `Turn completed in ${formatDuration(durationMs)}`, durationMs }]
  }
  if (subtype === 'compact_boundary') return [{ kind: 'system', subtype, text: 'Conversation compacted' }]
  const text = str(line.content)
  return text?.trim() ? [{ kind: 'system', subtype, text }] : []
}

/** Converts one transcript line into zero or more normalized entries. Never throws. */
export function parseTranscriptLine(raw: string, cursor: number): TranscriptEntry[] {
  let line: unknown
  try {
    line = JSON.parse(raw)
  } catch {
    return []
  }
  if (!isObject(line)) return []
  const type = str(line.type)
  if (type && METADATA_TYPES.has(type)) return []

  let drafts: Draft[]
  if (type === 'user') drafts = parseUser(line, cursor)
  else if (type === 'assistant') drafts = parseAssistant(line)
  else if (type === 'system') drafts = parseSystem(line)
  else if (typeof line.uuid === 'string')
    drafts = [{ kind: 'unknown', raw: truncate(raw, MAX_UNKNOWN_RAW_CHARS).text }]
  else drafts = []

  const uuid = str(line.uuid) ?? `line-${cursor}`
  const base: Base = {
    cursor,
    uuid,
    timestamp: str(line.timestamp),
    isSidechain: line.isSidechain === true,
  }
  return drafts.map(
    (draft, index) => ({ ...draft, ...base, index, key: `${uuid}:${index}` }) as TranscriptEntry,
  )
}

/** Metadata lines that update the session itself rather than the conversation. */
export type TranscriptMetaUpdate = { customTitle?: string; permissionMode?: string }

export function parseMetaLine(raw: string): TranscriptMetaUpdate | null {
  if (!raw.includes('"custom-title"') && !raw.includes('"permission-mode"')) return null
  try {
    const line = JSON.parse(raw) as unknown
    if (!isObject(line)) return null
    if (line.type === 'custom-title' && typeof line.customTitle === 'string')
      return { customTitle: line.customTitle }
    if (line.type === 'permission-mode' && typeof line.permissionMode === 'string') {
      return { permissionMode: line.permissionMode }
    }
  } catch {
    // ignore
  }
  return null
}

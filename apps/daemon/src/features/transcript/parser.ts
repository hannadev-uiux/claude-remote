/**
 * The ONLY module that knows the Claude Code transcript (.jsonl) format. The format is internal to
 * Claude Code and changes between versions, so everything here is defensive: unknown shapes become
 * `unknown` entries (or are skipped when they are clearly metadata) and nothing throws.
 */
import type { TranscriptEntry } from '@claude-remote/protocol'

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

function toolResultText(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return content === undefined ? '' : JSON.stringify(content)
  return content
    .map((part) => {
      if (!isObject(part)) return ''
      if (part.type === 'text') return str(part.text) ?? ''
      if (part.type === 'image') return '[imagem]'
      return ''
    })
    .filter(Boolean)
    .join('\n')
}

const COMMAND_NAME = /<command-name>([\s\S]*?)<\/command-name>/
const COMMAND_ARGS = /<command-args>([\s\S]*?)<\/command-args>/
const COMMAND_STDOUT = /<local-command-stdout>([\s\S]*?)<\/local-command-stdout>/

/** User strings wrapped in Claude Code's XML-ish tags are slash commands or their output. */
function classifyUserString(text: string): {
  kind: 'user' | 'system' | 'skip'
  subtype?: string
  text: string
} {
  const name = COMMAND_NAME.exec(text)
  if (name) {
    const args = COMMAND_ARGS.exec(text)?.[1]?.trim()
    return { kind: 'system', subtype: 'command', text: `${name[1]?.trim()}${args ? ` ${args}` : ''}` }
  }
  const stdout = COMMAND_STDOUT.exec(text)
  if (stdout) return { kind: 'system', subtype: 'command_output', text: stdout[1]?.trim() ?? '' }
  if (text.startsWith('<command-message>') || text.startsWith('<system-reminder>'))
    return { kind: 'skip', text }
  return { kind: 'user', text }
}

type Base = Pick<TranscriptEntry, 'cursor' | 'uuid' | 'timestamp' | 'isSidechain'>
type Draft = TranscriptEntry extends infer E
  ? E extends TranscriptEntry
    ? Omit<E, keyof Base | 'key' | 'index'>
    : never
  : never

function parseUser(line: Json): Draft[] {
  if (line.isMeta === true) return []
  const message = isObject(line.message) ? line.message : {}
  const content = message.content
  if (typeof content === 'string') {
    const c = classifyUserString(content)
    if (c.kind === 'skip' || !c.text) return []
    return c.kind === 'system'
      ? [{ kind: 'system', subtype: c.subtype ?? 'info', text: c.text }]
      : [{ kind: 'user', text: c.text }]
  }
  if (!Array.isArray(content)) return []
  const drafts: Draft[] = []
  for (const part of content) {
    if (!isObject(part)) continue
    if (part.type === 'tool_result') {
      const { text, truncated } = truncate(toolResultText(part.content), MAX_TOOL_RESULT_CHARS)
      drafts.push({
        kind: 'tool_result',
        toolUseId: str(part.tool_use_id) ?? '',
        content: text,
        isError: part.is_error === true,
        truncated,
      })
    } else if (part.type === 'text') {
      const c = classifyUserString(str(part.text) ?? '')
      if (c.kind === 'user' && c.text) drafts.push({ kind: 'user', text: c.text })
      else if (c.kind === 'system')
        drafts.push({ kind: 'system', subtype: c.subtype ?? 'info', text: c.text })
    } else if (part.type === 'image') {
      drafts.push({ kind: 'user', text: '[imagem]' })
    }
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
    return [{ kind: 'system', subtype, text: `Turno concluído em ${formatDuration(line.durationMs)}` }]
  }
  if (subtype === 'compact_boundary') return [{ kind: 'system', subtype, text: 'Conversa compactada' }]
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
  if (type === 'user') drafts = parseUser(line)
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

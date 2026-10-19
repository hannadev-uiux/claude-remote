import type { TranscriptEntry } from '@remote-harness/protocol'
import { patchFiles } from './patch'

type Use = Extract<TranscriptEntry, { kind: 'tool_use' }>
type Result = Extract<TranscriptEntry, { kind: 'tool_result' }>
type Input = Record<string, unknown>

export const TOOL_TABS = ['output', 'input', 'json'] as const
export type ToolTab = (typeof TOOL_TABS)[number]

/** Labels of the Input tab, translated under `tools.fields.*`. */
export type FieldKey =
  | 'command'
  | 'description'
  | 'timeout'
  | 'background'
  | 'path'
  | 'lines'
  | 'pages'
  | 'replaceAll'
  | 'edits'
  | 'cell'
  | 'mode'
  | 'pattern'
  | 'glob'
  | 'type'
  | 'outputMode'
  | 'agent'
  | 'prompt'
  | 'url'
  | 'query'
  | 'todos'
  | 'skill'
  | 'args'
  | 'folder'
  | 'files'

/** A known field with a translated label, or a raw input key shown as is. */
export type InputField = { field: FieldKey; value: string } | { key: string; value: string }

export const FLAG = '✓'
export const TEXT_LIMIT = 4_000
export const MAX_SAVED_TYPES = 40

function text(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() ? value : undefined
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return undefined
}

function int(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined
}

/** `Read` range as 1-based lines: `10–59`, `10–` or `1–50`. */
function lineRange(offset: unknown, limit: unknown): string | undefined {
  const from = int(offset)
  const count = int(limit)
  if (from === undefined && count === undefined) return undefined
  const start = from ?? 1
  return count ? `${start}–${start + count - 1}` : `${start}–`
}

const TODO_MARK: Record<string, string> = { pending: '☐', in_progress: '◐', completed: '☑' }

function todoLines(todos: unknown): string | undefined {
  if (!Array.isArray(todos)) return undefined
  const lines = todos.flatMap((todo) => {
    if (!todo || typeof todo !== 'object') return []
    const item = todo as Input
    const content = text(item.content)
    if (!content) return []
    return [`${TODO_MARK[String(item.status)] ?? '☐'} ${content}`]
  })
  return lines.length ? lines.join('\n') : undefined
}

function knownFields(name: string, input: Input): Array<[FieldKey, string | undefined]> {
  const path = text(input.file_path) ?? text(input.notebook_path) ?? text(input.path)
  switch (name) {
    case 'Bash':
      return [
        ['command', text(input.command)],
        ['description', text(input.description)],
        ['timeout', text(input.timeout)],
        ['background', input.run_in_background === true ? FLAG : undefined],
      ]
    case 'Read':
      return [
        ['path', path],
        ['lines', lineRange(input.offset, input.limit)],
        ['pages', text(input.pages)],
      ]
    case 'Edit':
      return [
        ['path', path],
        ['replaceAll', input.replace_all === true ? FLAG : undefined],
      ]
    case 'MultiEdit':
      return [
        ['path', path],
        ['edits', Array.isArray(input.edits) ? String(input.edits.length) : undefined],
      ]
    case 'Write':
      return [
        ['path', path],
        ['lines', typeof input.content === 'string' ? String(input.content.split('\n').length) : undefined],
      ]
    case 'NotebookEdit':
      return [
        ['path', path],
        ['cell', text(input.cell_id)],
        ['mode', text(input.edit_mode)],
      ]
    case 'Grep':
      return [
        ['pattern', text(input.pattern)],
        ['path', path],
        ['glob', text(input.glob)],
        ['type', text(input.type)],
        ['outputMode', text(input.output_mode)],
      ]
    case 'Glob':
      return [
        ['pattern', text(input.pattern)],
        ['path', path],
      ]
    case 'Task':
    case 'Agent':
      return [
        ['description', text(input.description)],
        ['agent', text(input.subagent_type)],
        ['prompt', text(input.prompt)],
      ]
    case 'WebFetch':
      return [
        ['url', text(input.url)],
        ['prompt', text(input.prompt)],
      ]
    case 'WebSearch':
      return [['query', text(input.query)]]
    case 'TodoWrite':
      return [['todos', todoLines(input.todos)]]
    case 'Skill':
      return [
        ['skill', text(input.skill) ?? text(input.command)],
        ['args', text(input.args)],
      ]
    // Codex: the patch itself is in the diff and the JSON tab.
    case 'exec':
      return [
        ['command', text(input.command)],
        ['folder', text(input.workdir)],
      ]
    case 'apply_patch': {
      const files = patchFiles(input)
      return [['files', files.length > 0 ? files.join('\n') : undefined]]
    }
    case 'web_search':
      return [['query', text(input.query)]]
    default:
      return []
  }
}

function rawFields(input: Input): InputField[] {
  return Object.entries(input).flatMap(([key, value]) => {
    if (value === undefined || value === null || value === '') return []
    return [{ key, value: typeof value === 'string' ? value : JSON.stringify(value) }]
  })
}

/** Readable fields for the Input tab; unknown tools (or known ones with unexpected input) list raw keys. */
export function toolInputFields(name: string, input: Input): InputField[] {
  const fields = knownFields(name, input).flatMap(([field, value]) => (value ? [{ field, value }] : []))
  return fields.length ? fields : rawFields(input)
}

/** The raw tool call for the JSON tab. */
export function toolCallJson(use: Use | null, result: Result | null): string {
  return JSON.stringify(
    {
      ...(use ? { name: use.name, input: use.input } : {}),
      result: result
        ? {
            content: result.content,
            isError: result.isError,
            truncated: result.truncated,
            // Refs only: the image data is fetched separately.
            ...(result.images.length > 0 ? { images: result.images } : {}),
          }
        : null,
    },
    null,
    2,
  )
}

/** First `limit` characters of `value` and whether anything was left out ("Show more"). */
export function cutText(value: string, limit = TEXT_LIMIT): { text: string; hidden: boolean } {
  return value.length > limit ? { text: value.slice(0, limit), hidden: true } : { text: value, hidden: false }
}

/** Key under which a tab is remembered: every MCP tool counts as one type. */
export function toolType(name: string): string {
  return name.startsWith('mcp__') ? 'mcp' : name
}

/** Saved tab per tool type, oldest first (insertion order). */
export type SavedTabs = Record<string, ToolTab>

export function isToolTab(value: unknown): value is ToolTab {
  return typeof value === 'string' && (TOOL_TABS as readonly string[]).includes(value)
}

/** Tab to open for `name`: the remembered one when available, else Output. */
export function tabFor(saved: SavedTabs, name: string, available: readonly ToolTab[]): ToolTab {
  const tab = saved[toolType(name)]
  return tab && available.includes(tab) ? tab : 'output'
}

/** Remembers `tab` for the type of `name` as the newest entry, keeping at most `MAX_SAVED_TYPES`. */
export function rememberTab(saved: SavedTabs, name: string, tab: ToolTab): SavedTabs {
  const type = toolType(name)
  const entries = Object.entries(saved).filter(([key]) => key !== type)
  entries.push([type, tab])
  return Object.fromEntries(entries.slice(-MAX_SAVED_TYPES))
}

/** Parses the stored map, dropping anything that is not a known tab. */
export function parseSavedTabs(raw: string | null): SavedTabs {
  if (!raw) return {}
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return Object.fromEntries(Object.entries(value).filter(([, tab]) => isToolTab(tab))) as SavedTabs
  } catch {
    return {}
  }
}

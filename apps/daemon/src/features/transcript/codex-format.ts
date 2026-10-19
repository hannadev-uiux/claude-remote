/**
 * The ONLY module that knows the OpenAI Codex CLI rollout (.jsonl) format. Like Claude Code's, the
 * format is internal to the CLI and changes between versions (read from codex 0.163), so everything
 * here is defensive: unknown lines are skipped and nothing throws.
 *
 * Lines are `{timestamp, ordinal?, type, payload}`. Paginated rollouts (an `ordinal` on every line,
 * the TUI default) keep the conversation as `event_msg` `item_completed` items; legacy ones as
 * `user_message` / `agent_message` / `agent_reasoning` events. `response_item` messages repeat them
 * (plus injected context) and are ignored; tool calls always come from `response_item`s, so a
 * running command shows before it ends.
 */
import type { ImageRef, TranscriptEntry } from '@remote-harness/protocol'
import type { ImageData, TranscriptFormat, TranscriptMetaUpdate } from './format.ts'
import { base64Bytes, MAX_TOOL_RESULT_CHARS } from './parser.ts'

type Json = Record<string, unknown>

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function str(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function parseLine(raw: string): Json | null {
  try {
    const line: unknown = JSON.parse(raw)
    return isObject(line) ? line : null
  } catch {
    return null
  }
}

type Base = Pick<TranscriptEntry, 'cursor' | 'uuid' | 'timestamp' | 'isSidechain'>
type Draft = TranscriptEntry extends infer E
  ? E extends TranscriptEntry
    ? Omit<E, keyof Base | 'key' | 'index'>
    : never
  : never

const DATA_URL = /^data:([^;,]+);base64,(.*)$/s

/** A `data:` image URL; remote URLs and file ids cannot be served and yield null. */
function dataUrlImage(url: unknown): ImageData | null {
  const match = typeof url === 'string' ? DATA_URL.exec(url) : null
  if (!match?.[1] || match[2] === undefined) return null
  return { mediaType: match[1], data: match[2], bytes: base64Bytes(match[2]) }
}

/**
 * Image URLs of a line in document order: the prompt's images, then those of a tool output. Image
 * ids are `<cursor>.<n>` over this list, so `parseCodexLine` and `findCodexImage` agree.
 */
function imageUrls(line: Json): unknown[] {
  const payload = isObject(line.payload) ? line.payload : {}
  if (line.type === 'event_msg') {
    if (payload.type === 'item_completed' && isObject(payload.item) && payload.item.type === 'UserMessage') {
      const content = Array.isArray(payload.item.content) ? payload.item.content : []
      return content.filter((p) => isObject(p) && p.type === 'image').map((p) => (p as Json).image_url)
    }
    if (payload.type === 'user_message' && Array.isArray(payload.images)) return payload.images
    return []
  }
  if (
    line.type === 'response_item' &&
    (payload.type === 'function_call_output' || payload.type === 'custom_tool_call_output') &&
    Array.isArray(payload.output)
  ) {
    return payload.output
      .filter((p) => isObject(p) && p.type === 'input_image')
      .map((p) => (p as Json).image_url)
  }
  return []
}

function imageRefs(line: Json, cursor: number): ImageRef[] {
  return imageUrls(line).flatMap((url, n) => {
    const image = dataUrlImage(url)
    return image ? [{ id: `${cursor}.${n}`, mediaType: image.mediaType, bytes: image.bytes }] : []
  })
}

function truncate(text: string): { text: string; truncated: boolean } {
  return text.length > MAX_TOOL_RESULT_CHARS
    ? { text: text.slice(0, MAX_TOOL_RESULT_CHARS), truncated: true }
    : { text, truncated: false }
}

/** Text parts of a content array (`text`, `Text`, `input_text`, `output_text`), one per line. */
function contentText(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .flatMap((part) => (isObject(part) && typeof part.text === 'string' ? [part.text] : []))
    .join('\n')
}

/** `["bash", "-lc", "pnpm test"]` reads as `pnpm test`; other argv are joined. */
function commandText(command: unknown): string {
  if (typeof command === 'string') return command
  if (!Array.isArray(command)) return ''
  const argv = command.filter((a): a is string => typeof a === 'string')
  const shell = argv.length === 3 && /(^|\/)(ba|z|fi)?sh$/.test(argv[0] ?? '') && /^-l?c$/.test(argv[1] ?? '')
  return shell ? (argv[2] ?? '') : argv.join(' ')
}

const PATCH_FILE = /^\*\*\* (?:Add|Update|Delete) File: (.+)$/gm
const PATCH_MOVE = /^\*\*\* Move to: (.+)$/gm

/** Files an `apply_patch` touches, in order (a move adds its destination). */
export function patchFiles(patch: string): string[] {
  const files: string[] = []
  for (const match of patch.matchAll(PATCH_FILE)) if (match[1]) files.push(match[1].trim())
  for (const match of patch.matchAll(PATCH_MOVE)) if (match[1]) files.push(match[1].trim())
  return [...new Set(files)]
}

function parseArguments(raw: unknown): Json {
  if (isObject(raw)) return raw
  if (typeof raw !== 'string') return {}
  try {
    const value: unknown = JSON.parse(raw)
    return isObject(value) ? value : { arguments: raw }
  } catch {
    return { arguments: raw }
  }
}

const SHELL_TOOLS = new Set(['exec_command', 'shell', 'shell_command', 'container.exec', 'local_shell'])

function execInput(command: unknown, workdir: unknown): Json {
  const dir = str(workdir)
  return { command: commandText(command), ...(dir ? { workdir: dir } : {}) }
}

function functionCall(payload: Json): Draft {
  const name = str(payload.name) ?? 'tool'
  const args = parseArguments(payload.arguments)
  const toolUseId = str(payload.call_id) ?? ''
  if (SHELL_TOOLS.has(name)) {
    return {
      kind: 'tool_use',
      toolUseId,
      name: 'exec',
      input: execInput(args.cmd ?? args.command, args.workdir),
    }
  }
  return { kind: 'tool_use', toolUseId, name, input: args }
}

function customToolCall(payload: Json): Draft {
  const name = str(payload.name) ?? 'tool'
  const input = str(payload.input) ?? ''
  const toolUseId = str(payload.call_id) ?? ''
  if (name === 'apply_patch')
    return { kind: 'tool_use', toolUseId, name, input: { files: patchFiles(input), patch: input } }
  return { kind: 'tool_use', toolUseId, name, input: { input } }
}

const EXIT_CODE = /^Process exited with code (-?\d+)$/m

/**
 * Text and error flag of a tool output. Exec outputs carry a header (`Chunk ID`, `Wall time`,
 * `Process exited with code N`, `Output:`) before the command's output; older `shell` calls wrote
 * `{"output": …, "metadata": {"exit_code": N}}`.
 */
export function toolOutput(raw: string): { text: string; isError: boolean } {
  const marker = raw.indexOf('\nOutput:\n')
  if (marker >= 0 && /^(Chunk ID|Wall time|Process )/.test(raw)) {
    const header = raw.slice(0, marker)
    const code = EXIT_CODE.exec(header)?.[1]
    return { text: raw.slice(marker + '\nOutput:\n'.length), isError: code !== undefined && code !== '0' }
  }
  if (raw.startsWith('{')) {
    const value = parseArguments(raw)
    if (typeof value.output === 'string') {
      const meta = isObject(value.metadata) ? value.metadata : {}
      const code = meta.exit_code
      return { text: value.output, isError: typeof code === 'number' && code !== 0 }
    }
  }
  return { text: raw, isError: false }
}

function toolResult(line: Json, payload: Json, cursor: number): Draft {
  const output = payload.output
  const raw = typeof output === 'string' ? output : contentText(output)
  const { text, isError } = toolOutput(raw)
  const { text: content, truncated } = truncate(text)
  return {
    kind: 'tool_result',
    toolUseId: str(payload.call_id) ?? '',
    content,
    isError,
    truncated,
    images: imageRefs(line, cursor),
  }
}

function responseItem(line: Json, payload: Json, cursor: number): Draft[] {
  switch (payload.type) {
    case 'function_call':
      return [functionCall(payload)]
    case 'custom_tool_call':
      return [customToolCall(payload)]
    case 'function_call_output':
    case 'custom_tool_call_output':
      return [toolResult(line, payload, cursor)]
    case 'local_shell_call': {
      const action = isObject(payload.action) ? payload.action : {}
      const toolUseId = str(payload.call_id) ?? str(payload.id) ?? `line-${cursor}`
      return [
        {
          kind: 'tool_use',
          toolUseId,
          name: 'exec',
          input: execInput(action.command, action.working_directory ?? action.workdir),
        },
      ]
    }
    case 'web_search_call': {
      const action = isObject(payload.action) ? payload.action : {}
      const toolUseId = str(payload.id) ?? `line-${cursor}`
      const query = str(action.query)
      const use: Draft = { kind: 'tool_use', toolUseId, name: 'web_search', input: query ? { query } : {} }
      // No output line follows a search: a finished one gets an empty result so it does not look running.
      if (payload.status !== 'completed') return [use]
      return [
        use,
        { kind: 'tool_result', toolUseId, content: '', isError: false, truncated: false, images: [] },
      ]
    }
    default:
      return []
  }
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

function userDraft(text: string, images: ImageRef[]): Draft[] {
  return text.trim() || images.length > 0 ? [{ kind: 'user', text, images }] : []
}

/** Reasoning summaries are strings or `{text}` parts. */
function summaryText(summary: unknown): string {
  if (!Array.isArray(summary)) return ''
  return summary
    .flatMap((part) =>
      typeof part === 'string' ? [part] : isObject(part) && typeof part.text === 'string' ? [part.text] : [],
    )
    .join('\n\n')
}

function turnItem(line: Json, item: Json, cursor: number): Draft[] {
  switch (item.type) {
    case 'UserMessage': {
      const content = Array.isArray(item.content) ? item.content : []
      const text = content
        .flatMap((p) => (isObject(p) && p.type === 'text' && typeof p.text === 'string' ? [p.text] : []))
        .join('\n')
      return userDraft(text, imageRefs(line, cursor))
    }
    case 'AgentMessage': {
      const text = contentText(item.content)
      return text.trim() ? [{ kind: 'assistant_text', text }] : []
    }
    case 'Reasoning': {
      const text = summaryText(item.summary_text)
      return text.trim() ? [{ kind: 'thinking', text }] : []
    }
    case 'Plan': {
      const text = str(item.text) ?? ''
      return text.trim() ? [{ kind: 'assistant_text', text }] : []
    }
    case 'ContextCompaction':
      return [{ kind: 'system', subtype: 'compact_boundary', text: 'Conversation compacted' }]
    default:
      return []
  }
}

function eventMsg(line: Json, payload: Json, cursor: number, paginated: boolean): Draft[] {
  switch (payload.type) {
    case 'item_completed':
      // Legacy rollouts keep only tool items here, which the response items already show.
      return paginated && isObject(payload.item) ? turnItem(line, payload.item, cursor) : []
    case 'user_message':
      return paginated ? [] : userDraft(str(payload.message) ?? '', imageRefs(line, cursor))
    case 'agent_message': {
      const text = paginated ? '' : (str(payload.message) ?? '')
      return text.trim() ? [{ kind: 'assistant_text', text }] : []
    }
    case 'agent_reasoning': {
      const text = paginated ? '' : (str(payload.text) ?? '')
      return text.trim() ? [{ kind: 'thinking', text }] : []
    }
    case 'task_complete':
    case 'turn_complete': {
      const durationMs = payload.duration_ms
      if (typeof durationMs !== 'number') return []
      return [
        {
          kind: 'system',
          subtype: 'turn_duration',
          text: `Turn completed in ${formatDuration(durationMs)}`,
          durationMs,
        },
      ]
    }
    case 'turn_aborted': {
      const reason = str(payload.reason) ?? 'interrupted'
      // The app translates the interrupted case; other reasons (`replaced`, …) read as they are.
      return [
        {
          kind: 'system',
          subtype: 'turn_aborted',
          text: reason === 'interrupted' ? 'Interrupted' : `Turn ended: ${reason}`,
        },
      ]
    }
    default:
      return []
  }
}

/** Converts one rollout line into zero or more normalized entries. Never throws. */
export function parseCodexLine(raw: string, cursor: number): TranscriptEntry[] {
  const line = parseLine(raw)
  if (!line || !isObject(line.payload)) return []
  const paginated = typeof line.ordinal === 'number'
  let drafts: Draft[]
  if (line.type === 'response_item') drafts = responseItem(line, line.payload, cursor)
  else if (line.type === 'event_msg') drafts = eventMsg(line, line.payload, cursor, paginated)
  // Paginated rollouts also record compaction as an item.
  else if (line.type === 'compacted' && !paginated)
    drafts = [{ kind: 'system', subtype: 'compact_boundary', text: 'Conversation compacted' }]
  else drafts = []

  const uuid = `line-${cursor}`
  const base: Base = { cursor, uuid, timestamp: str(line.timestamp), isSidechain: false }
  return drafts.map(
    (draft, index) => ({ ...draft, ...base, index, key: `${uuid}:${index}` }) as TranscriptEntry,
  )
}

/** `on-request`, `never`, `untrusted`, or the variant name of an object policy (`granular`). */
export function approvalPolicyName(value: unknown): string | null {
  if (typeof value === 'string') return value || null
  if (isObject(value)) return Object.keys(value)[0] ?? null
  return null
}

/** The approval policy a `turn_context` or `thread_settings_applied` line sets, if any. */
function lineApprovalPolicy(line: Json): string | null {
  const payload = isObject(line.payload) ? line.payload : {}
  if (line.type === 'turn_context') return approvalPolicyName(payload.approval_policy)
  if (line.type === 'event_msg' && payload.type === 'thread_settings_applied') {
    const settings = isObject(payload.thread_settings) ? payload.thread_settings : {}
    return approvalPolicyName(settings.approval_policy)
  }
  return null
}

export function parseCodexMeta(raw: string): TranscriptMetaUpdate | null {
  if (!raw.includes('"turn_context"') && !raw.includes('"thread_settings_applied"')) return null
  const line = parseLine(raw)
  const approvalPolicy = line ? lineApprovalPolicy(line) : null
  return approvalPolicy ? { approvalPolicy } : null
}

export function findCodexImage(raw: string, index: number): ImageData | null {
  const line = parseLine(raw)
  return line ? dataUrlImage(imageUrls(line)[index]) : null
}

export const codexTranscript: TranscriptFormat = {
  parseLine: parseCodexLine,
  parseMeta: parseCodexMeta,
  findImage: findCodexImage,
}

/** Prompt text of a line (paginated `UserMessage` or legacy `user_message`), for titles. */
function promptOf(line: Json): string | null {
  const payload = isObject(line.payload) ? line.payload : {}
  if (line.type !== 'event_msg') return null
  if (payload.type === 'user_message') return str(payload.message)
  if (payload.type === 'item_completed' && isObject(payload.item) && payload.item.type === 'UserMessage') {
    const content = Array.isArray(payload.item.content) ? payload.item.content : []
    const text = content
      .flatMap((p) => (isObject(p) && p.type === 'text' && typeof p.text === 'string' ? [p.text] : []))
      .join('\n')
    return text || null
  }
  return null
}

export type CodexMeta = {
  id: string | null
  cwd: string | null
  firstPrompt: string | null
  approvalPolicy: string | null
}

/** Session id, folder and first prompt from the head of a rollout, approval policy from its tail. */
export function extractCodexMeta(headLines: readonly string[], tailLines: readonly string[]): CodexMeta {
  let id: string | null = null
  let cwd: string | null = null
  let firstPrompt: string | null = null
  let approvalPolicy: string | null = null
  for (const raw of headLines) {
    const line = parseLine(raw)
    if (!line) continue
    const payload = isObject(line.payload) ? line.payload : {}
    if (line.type === 'session_meta') {
      id ??= str(payload.id)
      cwd ??= str(payload.cwd)
    }
    if (!cwd && line.type === 'turn_context') cwd = str(payload.cwd)
    firstPrompt ??= promptOf(line)
    approvalPolicy = lineApprovalPolicy(line) ?? approvalPolicy
  }
  for (const raw of tailLines) {
    const line = parseLine(raw)
    if (line) approvalPolicy = lineApprovalPolicy(line) ?? approvalPolicy
  }
  return { id, cwd, firstPrompt, approvalPolicy }
}

/** Latest thread name per id in `session_index.jsonl` lines (`{id, thread_name}`, last wins). */
export function threadName(indexLines: readonly string[], id: string): string | null {
  let name: string | null = null
  for (const raw of indexLines) {
    if (!raw.includes(id)) continue
    const line = parseLine(raw)
    if (line && line.id === id) name = str(line.thread_name) ?? name
  }
  return name
}

const ROLLOUT_NAME =
  /^rollout-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-([0-9a-f-]{36})(?:_[0-9a-f-]{36})?\.jsonl$/i

/** The session (thread) id in a rollout file name, or null for other files. */
export function rolloutSessionId(name: string): string | null {
  return ROLLOUT_NAME.exec(name)?.[1]?.toLowerCase() ?? null
}

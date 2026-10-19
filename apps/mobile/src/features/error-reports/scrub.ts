/**
 * Error entries are built field by field from a fixed shape (allowlist): nothing else from the
 * error or the app state gets in. Free text (message, stack) is scrubbed so session content —
 * prompts, transcript, terminal output, paths, names, tokens — never reaches a report.
 */

export type ErrorSource = 'fatal' | 'error' | 'rejection' | 'render' | 'request'

export type ReportContext = {
  appVersion: string | null
  runtimeVersion: string | null
  /** OTA update id (null for the built-in bundle). */
  updateId: string | null
  channel: string | null
  platform: string
  osVersion: string | null
  daemonVersion: string | null
}

export type ErrorEntry = {
  at: string
  source: ErrorSource
  name: string
  message: string | null
  stack: string | null
  /** Message type of a failed daemon request. */
  requestType: string | null
  code: string | null
  /** Expo Router segment pattern, e.g. `(main)/session/[id]`. */
  route: string | null
  context: ReportContext
}

export const MESSAGE_LIMIT = 300
export const STACK_FRAMES = 30
export const STACK_LIMIT = 3000

const QUOTED = /(["'`“‘«])(?:(?!\1)[^\n]){1,}?(?:\1|[”’»])/g
const URL = /\b[a-z][a-z0-9+.-]*:\/\/\S+/gi
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi
const IP = /\b\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?\b/g
const WINDOWS_PATH = /\b[A-Za-z]:\\[^\s]*/g
const UNIX_PATH = /(?:~|\.{1,2})?(?:\/[^\s/:;,'"`()[\]{}<>]+)+\/?/g
const TOKEN = /\b[A-Za-z0-9_+/=-]{24,}\b/g
const LONG_NUMBER = /\b\d{6,}\b/g

/** Message text with content replaced by placeholders, on one line, cut to `MESSAGE_LIMIT`. */
export function scrubMessage(text: string): string {
  const scrubbed = text
    .replace(QUOTED, '‹…›')
    .replace(URL, '‹url›')
    .replace(EMAIL, '‹email›')
    .replace(UUID, '‹id›')
    .replace(IP, '‹ip›')
    .replace(WINDOWS_PATH, '‹path›')
    .replace(UNIX_PATH, '‹path›')
    .replace(TOKEN, '‹token›')
    .replace(LONG_NUMBER, '‹n›')
    .replace(/\s+/g, ' ')
    .trim()
  return scrubbed.length > MESSAGE_LIMIT ? `${scrubbed.slice(0, MESSAGE_LIMIT - 1)}…` : scrubbed
}

const FRAME = /^\s*at\s+(?:(.*?)\s+\()?(?:address at\s+)?([^()]*?)(?::(\d+):(\d+))?\)?\s*$/
const BUNDLE_FILE = /\.(?:bundle|jsbundle|hbc|js|jsx|ts|tsx|mjs|cjs)$/
const FUNCTION_NAME = /^[\w$.<>[\]]{1,80}$/

function frameFile(file: string): string {
  if (!file || file === 'native') return file || '?'
  const base = file.split(/[\\/]/).at(-1) ?? ''
  return BUNDLE_FILE.test(base) && /^[\w.-]{1,80}$/.test(base) ? base : '‹file›'
}

/**
 * Only the `at …` frames of a stack (the first lines repeat the message), each rebuilt as
 * `at fn (file:line:col)` with the file's base name when it is a bundle, at most `STACK_FRAMES`.
 */
export function scrubStack(stack: string): string | null {
  const frames: string[] = []
  for (const line of stack.split('\n')) {
    if (frames.length >= STACK_FRAMES) break
    const match = FRAME.exec(line)
    if (!match) continue
    const [, rawFn, rawFile = '', lineNo, col] = match
    const fn = rawFn && FUNCTION_NAME.test(rawFn) ? rawFn : rawFn ? '‹fn›' : null
    const file = frameFile(rawFile.trim())
    const where = lineNo && col ? `${file}:${lineNo}:${col}` : file
    frames.push(fn ? `    at ${fn} (${where})` : `    at ${where}`)
  }
  if (!frames.length) return null
  const text = frames.join('\n')
  return text.length > STACK_LIMIT ? text.slice(0, STACK_LIMIT) : text
}

const ERROR_NAME = /^[A-Za-z_$][\w$]{0,39}$/
const REQUEST_TYPE = /^[a-z][a-z.]{0,63}$/
const CODE = /^[a-z_]{1,32}$/
const ROUTE_SEGMENT = /^(?:\([a-z-]+\)|\[[a-zA-Z.]+\]|[a-z][a-z-]*)$/

/** Route pattern made of group, param and literal segments only; anything else is left out. */
export function scrubRoute(segments: readonly string[]): string | null {
  if (!segments.length) return null
  return segments.map((s) => (ROUTE_SEGMENT.test(s) ? s : '‹…›')).join('/')
}

const short = (value: unknown, limit = 64): string | null =>
  typeof value === 'string' && value ? scrubMessage(value).slice(0, limit) : null

/** Context with each field checked and cut (versions and ids only). */
export function scrubContext(context: ReportContext): ReportContext {
  return {
    appVersion: short(context.appVersion, 32),
    runtimeVersion: short(context.runtimeVersion),
    updateId:
      typeof context.updateId === 'string' && /^[\w-]{1,64}$/.test(context.updateId)
        ? context.updateId
        : null,
    channel: short(context.channel, 32),
    platform: short(context.platform, 16) ?? 'unknown',
    osVersion: short(context.osVersion, 32),
    daemonVersion: short(context.daemonVersion, 32),
  }
}

/** Errors whose message comes from the daemon (it may quote paths): only their code is kept. */
export type CodedError = { name: string; code: string }
const isCodedError = (error: unknown): error is Error & CodedError =>
  error instanceof Error &&
  error.name === 'DaemonRequestError' &&
  typeof (error as { code?: unknown }).code === 'string'

export type EntryInput = {
  at: Date
  source: ErrorSource
  error?: unknown
  requestType?: string
  code?: string
  route?: readonly string[]
  context: ReportContext
}

/** The only way an entry is made: every field is picked and scrubbed here. */
export function buildEntry(input: EntryInput): ErrorEntry {
  const { error } = input
  const coded = isCodedError(error)
  const name =
    error instanceof Error
      ? ERROR_NAME.test(error.name)
        ? error.name
        : 'Error'
      : error === undefined
        ? 'Error'
        : 'NonError'
  const withText = input.source !== 'request' && !coded
  const rawMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : null
  const rawCode = input.code ?? (coded ? error.code : undefined)
  return {
    at: input.at.toISOString(),
    source: input.source,
    name,
    message: withText && rawMessage ? scrubMessage(rawMessage) : null,
    stack:
      input.source !== 'request' && error instanceof Error && error.stack ? scrubStack(error.stack) : null,
    requestType: input.requestType && REQUEST_TYPE.test(input.requestType) ? input.requestType : null,
    code: rawCode && CODE.test(rawCode) ? rawCode : null,
    route: input.route ? scrubRoute(input.route) : null,
    context: scrubContext(input.context),
  }
}

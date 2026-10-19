import type { RejectedRequest } from '@remote-harness/protocol'
import type { ErrorEntry, ReportContext } from './scrub'

export const ISSUES_URL = 'https://github.com/maarkN/remote-harness/issues/new'
/** GitHub accepts long URLs, but browsers and the share sheet get unhappy past ~8 KB. */
export const ISSUE_BODY_LIMIT = 6000
/** Crashlytics custom keys hold at most 1 KB. */
export const DESCRIPTION_LIMIT = 1000

export type ReportKind = 'crash' | 'manual'

type ReportEntry = Omit<ErrorEntry, 'context'> & { context?: ReportContext }

/** Exactly what leaves the phone: shown as the preview, shared, sent. */
export type Report = {
  kind: ReportKind
  createdAt: string
  description: string | null
  context: ReportContext
  entries: ReportEntry[]
  daemon: { version: string; errors: RejectedRequest[] } | null
}

const sameContext = (a: ReportContext, b: ReportContext) =>
  (Object.keys(a) as (keyof ReportContext)[]).every((key) => a[key] === b[key])

export function buildReport(input: {
  kind: ReportKind
  at: Date
  description?: string
  context: ReportContext
  entries: readonly ErrorEntry[]
  daemon?: { version: string; errors: RejectedRequest[] } | null
}): Report {
  const description = input.description?.trim().slice(0, DESCRIPTION_LIMIT) || null
  return {
    kind: input.kind,
    createdAt: input.at.toISOString(),
    description,
    context: input.context,
    // An entry repeats the context only when it was recorded under another version.
    entries: input.entries.map(({ context, ...entry }) =>
      sameContext(context, input.context) ? entry : { ...entry, context },
    ),
    daemon: input.daemon ?? null,
  }
}

export const reportJson = (report: Report) => JSON.stringify(report, null, 2)

const firstFrames = (stack: string | null, count: number) =>
  stack ? stack.split('\n').slice(0, count).join('\n') : null

/** Prefilled "new issue" link; entries are dropped (oldest first) until the body fits. */
export function githubIssueUrl(report: Report, base = ISSUES_URL): string {
  const latest = report.entries[0]
  const title = report.description?.split('\n')[0]?.slice(0, 80) || `App error: ${latest?.name ?? 'report'}`
  let entries = report.entries.map((e) => ({ ...e, stack: firstFrames(e.stack, 5) }))
  const body = () => ['```json', reportJson({ ...report, entries }), '```'].join('\n')
  while (entries.length > 0 && body().length > ISSUE_BODY_LIMIT) entries = entries.slice(0, -1)
  const text = body().slice(0, ISSUE_BODY_LIMIT)
  return `${base}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(text)}`
}

/** Crashlytics custom keys for one entry (values from the allowlisted fields only). */
export function crashlyticsAttributes(entry: ReportEntry, context: ReportContext): Record<string, string> {
  const ctx = entry.context ?? context
  const pairs: Record<string, string | null> = {
    source: entry.source,
    at: entry.at,
    route: entry.route,
    request_type: entry.requestType,
    code: entry.code,
    app_version: ctx.appVersion,
    runtime_version: ctx.runtimeVersion,
    update_id: ctx.updateId,
    update_channel: ctx.channel,
    os_version: ctx.osVersion,
    daemon_version: ctx.daemonVersion,
  }
  return Object.fromEntries(Object.entries(pairs).map(([key, value]) => [key, value ?? '']))
}

/** An `Error` carrying only the scrubbed fields, for `recordError`. */
export function errorFromEntry(entry: ReportEntry): Error {
  const error = new Error(entry.message ?? entry.code ?? entry.source)
  error.name = entry.name
  error.stack = `${error.name}: ${error.message}${entry.stack ? `\n${entry.stack}` : ''}`
  return error
}

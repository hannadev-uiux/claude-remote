import { describe, expect, test } from 'vitest'
import { canSend, collectionEnabled, isReportPreference, launchAction, sendsAsTheyHappen } from './consent'
import {
  buildReport,
  crashlyticsAttributes,
  DESCRIPTION_LIMIT,
  errorFromEntry,
  githubIssueUrl,
  ISSUE_BODY_LIMIT,
  reportJson,
} from './format'
import { appendEntry, isDuplicate, LOG_LIMIT, parseLog, pendingCrashes, recentEntries } from './log'
import {
  buildEntry,
  type ErrorEntry,
  MESSAGE_LIMIT,
  type ReportContext,
  scrubMessage,
  scrubRoute,
  scrubStack,
} from './scrub'

const context: ReportContext = {
  appVersion: '0.12.0',
  runtimeVersion: 'abc123',
  updateId: '0199f2d4-1c2b-7a3e-9b1f-2a3c4d5e6f70',
  channel: 'production',
  platform: 'ios',
  osVersion: '27.0',
  daemonVersion: '0.12.0',
}
const at = new Date('2026-10-19T12:00:00.000Z')

class DaemonRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'DaemonRequestError'
  }
}

const TRANSCRIPT = 'please refactor the billing module of acme-secret-project'
const STACK = [
  `Error: failed to render "${TRANSCRIPT}"`,
  `    at renderItem (/var/mobile/Containers/Data/Application/1234/.expo-internal/main.jsbundle:1:2345)`,
  '    at anonymous (address at /data/user/0/app/files/index.android.bundle:1:999)',
  '    at /Users/me/acme-secret-project/src/notes.md:3:4',
  '    at native',
].join('\n')

describe('scrubMessage', () => {
  test('replaces quoted text, urls, emails, ids, ips, paths and tokens', () => {
    expect(scrubMessage(`Property 'text' of "${TRANSCRIPT}" is undefined`)).toBe(
      'Property ‹…› of ‹…› is undefined',
    )
    expect(scrubMessage('fetch https://example.dev/a?token=1 failed')).toBe('fetch ‹url› failed')
    expect(scrubMessage('mail me@example.dev now')).toBe('mail ‹email› now')
    expect(scrubMessage('session 0199f2d4-1c2b-7a3e-9b1f-2a3c4d5e6f70 gone')).toBe('session ‹id› gone')
    expect(scrubMessage('ws://100.64.1.2:7860 closed')).toBe('‹url› closed')
    expect(scrubMessage('host 100.64.1.2:7860 closed')).toBe('host ‹ip› closed')
    expect(scrubMessage('cannot open /Users/me/work/api/.env')).toBe('cannot open ‹path›')
    expect(scrubMessage('cannot open ~/work/api')).toBe('cannot open ‹path›')
    expect(scrubMessage('cannot open C:\\Users\\me\\repo')).toBe('cannot open ‹path›')
    expect(scrubMessage('bad token sk-ant-api03-AbCdEfGhIjKlMnOpQrStUvWx')).toBe('bad token ‹token›')
  })

  test('keeps engine messages readable', () => {
    expect(scrubMessage("undefined is not a function (near '...x.map...')")).toBe(
      'undefined is not a function (near ‹…›)',
    )
    expect(scrubMessage('Maximum call stack size exceeded')).toBe('Maximum call stack size exceeded')
  })

  test('collapses lines and cuts long messages', () => {
    expect(scrubMessage('a\n  b')).toBe('a b')
    expect(scrubMessage('x '.repeat(400)).length).toBe(MESSAGE_LIMIT)
  })
})

describe('scrubStack', () => {
  test('keeps only frames, with bundle base names', () => {
    expect(scrubStack(STACK)).toBe(
      [
        '    at renderItem (main.jsbundle:1:2345)',
        '    at anonymous (index.android.bundle:1:999)',
        '    at ‹file›:3:4',
        '    at native',
      ].join('\n'),
    )
  })

  test('no frames, no stack', () => {
    expect(scrubStack('Error: only a message')).toBeNull()
  })
})

describe('scrubRoute', () => {
  test('keeps the route pattern', () => {
    expect(scrubRoute(['(main)', 'session', '[id]'])).toBe('(main)/session/[id]')
    expect(scrubRoute([])).toBeNull()
  })

  test('drops anything that is not a pattern segment', () => {
    expect(scrubRoute(['(main)', 'session', 'My Secret Session'])).toBe('(main)/session/‹…›')
  })
})

describe('buildEntry', () => {
  test('request errors carry type and code, never the daemon message', () => {
    const entry = buildEntry({
      at,
      source: 'request',
      error: new DaemonRequestError('invalid_cwd', 'not a directory: /Users/me/secret'),
      requestType: 'session.start',
      code: 'invalid_cwd',
      context,
    })
    expect(entry).toMatchObject({
      source: 'request',
      requestType: 'session.start',
      code: 'invalid_cwd',
      message: null,
      stack: null,
    })
  })

  test('a DaemonRequestError that escapes keeps only its code', () => {
    const entry = buildEntry({
      at,
      source: 'rejection',
      error: new DaemonRequestError('timeout', TRANSCRIPT),
      context,
    })
    expect(entry.message).toBeNull()
    expect(entry.code).toBe('timeout')
  })

  test('only allowlisted fields are kept', () => {
    const error = Object.assign(new Error('boom'), { prompt: TRANSCRIPT, cwd: '/Users/me/acme' })
    const entry = buildEntry({ at, source: 'error', error, route: ['(main)'], context })
    expect(Object.keys(entry).sort()).toEqual(
      ['at', 'code', 'context', 'message', 'name', 'requestType', 'route', 'source', 'stack'].sort(),
    )
    expect(JSON.stringify(entry)).not.toContain('acme')
  })

  test('odd names, codes and types are dropped', () => {
    const error = new Error('x')
    error.name = `Name with ${TRANSCRIPT}`
    const entry = buildEntry({
      at,
      source: 'error',
      error,
      requestType: 'Bad Type!',
      code: 'NOT A CODE',
      context,
    })
    expect(entry).toMatchObject({ name: 'Error', requestType: null, code: null })
    expect(buildEntry({ at, source: 'rejection', error: 42, context }).name).toBe('NonError')
  })

  test('a transcript string never ends up in a report', () => {
    const error = new Error(`failed to render "${TRANSCRIPT}" at /Users/me/acme-secret-project/notes.md`)
    error.stack = STACK
    const entries = [
      buildEntry({ at, source: 'fatal', error, route: ['(main)', 'session', '[id]'], context }),
      buildEntry({ at, source: 'render', error, context }),
      buildEntry({ at, source: 'rejection', error: new DaemonRequestError('internal', TRANSCRIPT), context }),
      buildEntry({
        at,
        source: 'request',
        error: new DaemonRequestError('invalid_cwd', TRANSCRIPT),
        requestType: 'session.start',
        code: 'invalid_cwd',
        context,
      }),
    ]
    const report = buildReport({ kind: 'crash', at, context, entries })
    for (const text of [reportJson(report), decodeURIComponent(githubIssueUrl(report))]) {
      expect(text).not.toContain(TRANSCRIPT)
      expect(text).not.toContain('acme-secret-project')
      expect(text).not.toContain('/Users/me')
    }
    for (const entry of report.entries) {
      const sent = errorFromEntry(entry)
      expect(`${sent.message}\n${sent.stack}`).not.toContain(TRANSCRIPT)
      expect(Object.values(crashlyticsAttributes(entry, context)).join(' ')).not.toContain(TRANSCRIPT)
    }
  })
})

describe('consent', () => {
  test('launch after a crash follows the preference', () => {
    expect(launchAction('auto', true)).toBe('send')
    expect(launchAction('ask', true)).toBe('prompt')
    expect(launchAction('never', true)).toBe('discard')
  })

  test('without a crash only never acts (drops waiting native reports)', () => {
    expect(launchAction('auto', false)).toBe('none')
    expect(launchAction('ask', false)).toBe('none')
    expect(launchAction('never', false)).toBe('discard')
  })

  test('collection and sending', () => {
    expect(collectionEnabled('auto')).toBe(true)
    expect(collectionEnabled('ask')).toBe(false)
    expect(sendsAsTheyHappen('auto', true)).toBe(true)
    expect(sendsAsTheyHappen('auto', false)).toBe(false)
    expect(canSend('ask', true)).toBe(true)
    expect(canSend('never', true)).toBe(false)
    expect(canSend('auto', false)).toBe(false)
  })

  test('stored values', () => {
    expect(isReportPreference('ask')).toBe(true)
    expect(isReportPreference('always')).toBe(false)
    expect(isReportPreference(null)).toBe(false)
  })
})

const entryAt = (iso: string, source: ErrorEntry['source'] = 'error'): ErrorEntry =>
  buildEntry({ at: new Date(iso), source, error: new Error(iso), context })

describe('log', () => {
  test('rotates at the limit', () => {
    let entries: ErrorEntry[] = []
    for (let i = 0; i < LOG_LIMIT + 1; i++)
      entries = appendEntry(entries, entryAt(new Date(at.getTime() + i * 1000).toISOString()))
    expect(entries).toHaveLength(LOG_LIMIT)
    expect(entries[0]?.at).toBe(new Date(at.getTime() + 1000).toISOString())
  })

  test('pending crashes are the fatal entries after the handled mark', () => {
    const entries = [
      entryAt('2026-10-19T10:00:00.000Z', 'fatal'),
      entryAt('2026-10-19T11:00:00.000Z', 'error'),
      entryAt('2026-10-19T12:00:00.000Z', 'fatal'),
    ]
    expect(pendingCrashes(entries, null)).toHaveLength(2)
    expect(pendingCrashes(entries, '2026-10-19T10:30:00.000Z').map((e) => e.at)).toEqual([
      '2026-10-19T12:00:00.000Z',
    ])
  })

  test('recent entries are newest first and limited', () => {
    const entries = ['01', '02', '03'].map((m) => entryAt(`2026-10-19T${m}:00:00.000Z`))
    expect(recentEntries(entries, { limit: 2 }).map((e) => e.at.slice(11, 13))).toEqual(['03', '02'])
    expect(recentEntries(entries, { since: '2026-10-19T01:30:00.000Z' })).toHaveLength(2)
  })

  test('the same error within a minute is a duplicate', () => {
    const first = buildEntry({ at, source: 'request', requestType: 'ping', code: 'timeout', context })
    const again = (seconds: number) =>
      buildEntry({
        at: new Date(at.getTime() + seconds * 1000),
        source: 'request',
        requestType: 'ping',
        code: 'timeout',
        context,
      })
    expect(isDuplicate([first], again(30))).toBe(true)
    expect(isDuplicate([first], again(90))).toBe(false)
    expect(isDuplicate([first], { ...again(30), code: 'internal' })).toBe(false)
  })

  test('parses the stored log defensively', () => {
    const entries = [entryAt('2026-10-19T01:00:00.000Z')]
    expect(parseLog(JSON.stringify(entries))).toEqual(entries)
    expect(parseLog('not json')).toEqual([])
    expect(parseLog('{"a":1}')).toEqual([])
    expect(parseLog(null)).toEqual([])
  })
})

describe('format', () => {
  test('entries repeat the context only when it differs', () => {
    const old = buildEntry({
      at,
      source: 'error',
      error: new Error('x'),
      context: { ...context, appVersion: '0.11.0' },
    })
    const report = buildReport({ kind: 'manual', at, context, entries: [entryAt(at.toISOString()), old] })
    expect(report.entries[0]).not.toHaveProperty('context')
    expect(report.entries[1]?.context?.appVersion).toBe('0.11.0')
  })

  test('description is trimmed and cut', () => {
    const report = buildReport({
      kind: 'manual',
      at,
      description: `  ${'d'.repeat(2000)} `,
      context,
      entries: [],
    })
    expect(report.description).toHaveLength(DESCRIPTION_LIMIT)
    expect(
      buildReport({ kind: 'manual', at, description: '   ', context, entries: [] }).description,
    ).toBeNull()
  })

  test('the GitHub issue body fits the limit', () => {
    const big = Array.from({ length: 50 }, (_, i) => {
      const error = new Error(`error ${i} ${'x'.repeat(250)}`)
      error.stack = STACK
      return buildEntry({ at, source: 'error', error, context })
    })
    const url = new URL(
      githubIssueUrl(buildReport({ kind: 'manual', at, description: 'Start button', context, entries: big })),
    )
    expect(url.searchParams.get('title')).toBe('Start button')
    expect(url.searchParams.get('body')?.length).toBeLessThanOrEqual(ISSUE_BODY_LIMIT)
  })

  test('errors for Crashlytics carry the scrubbed fields', () => {
    const entry = buildEntry({
      at,
      source: 'fatal',
      error: Object.assign(new TypeError('x is undefined'), { stack: STACK }),
      context,
    })
    const error = errorFromEntry(entry)
    expect(error.name).toBe('TypeError')
    expect(error.message).toBe('x is undefined')
    expect(error.stack?.split('\n')[1]).toBe('    at renderItem (main.jsbundle:1:2345)')
    expect(crashlyticsAttributes(entry, context)).toMatchObject({
      source: 'fatal',
      app_version: '0.12.0',
      code: '',
    })
  })
})

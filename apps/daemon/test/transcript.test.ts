import { appendFile, copyFile, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ServerMessage } from '@remote-harness/protocol'
import { afterEach, describe, expect, test } from 'vitest'
import { silentLogger } from '../src/core/logger.ts'
import {
  MAX_TOOL_RESULT_CHARS,
  parseMetaLine,
  parseTranscriptLine,
} from '../src/features/transcript/parser.ts'
import { TranscriptService } from '../src/features/transcript/service.ts'
import { TranscriptFile } from '../src/features/transcript/transcript-file.ts'
import { fakeConnection, useTempHome } from './helpers.ts'

const home = useTempHome()
const fixture = join(import.meta.dirname, 'fixtures', 'session.jsonl')

async function fixtureLines(): Promise<string[]> {
  return (await readFile(fixture, 'utf8')).split('\n').filter(Boolean)
}

describe('parser', () => {
  test('normalizes the fixture', async () => {
    const entries = (await fixtureLines()).flatMap((line, i) => parseTranscriptLine(line, i))
    expect(entries.map((e) => e.kind)).toEqual([
      'user',
      'thinking',
      'assistant_text',
      'tool_use',
      'tool_result',
      'tool_use',
      'tool_result',
      'system',
      'system',
      'unknown',
      'assistant_text',
    ])
  })

  test('maps fields', async () => {
    const lines = await fixtureLines()
    expect(parseTranscriptLine(lines[3]!, 3)[0]).toEqual({
      kind: 'user',
      text: 'Leia @src/app.ts e rode os testes',
      cursor: 3,
      index: 0,
      uuid: 'u1',
      key: 'u1:0',
      timestamp: '2026-10-14T11:11:10.862Z',
      isSidechain: false,
    })
    expect(parseTranscriptLine(lines[8]!, 8)[0]).toMatchObject({
      kind: 'tool_use',
      toolUseId: 'toolu_1',
      name: 'Bash',
      input: { command: 'pnpm test' },
    })
    expect(parseTranscriptLine(lines[9]!, 9)[0]).toMatchObject({
      kind: 'tool_result',
      isError: true,
      content: '1 failed',
    })
    expect(parseTranscriptLine(lines[13]!, 13)[0]).toMatchObject({
      kind: 'system',
      subtype: 'command',
      text: '/model opus',
    })
    expect(parseTranscriptLine(lines[15]!, 15)[0]).toMatchObject({
      kind: 'system',
      text: 'Turn completed in 1m 15s',
      durationMs: 75332,
    })
  })

  test('skips internal types, empty thinking, meta and broken lines', async () => {
    const lines = await fixtureLines()
    for (const i of [0, 1, 2, 4, 5, 12, 14, 17, 18]) expect(parseTranscriptLine(lines[i]!, i)).toEqual([])
  })

  test('truncates huge tool results', () => {
    const line = JSON.stringify({
      type: 'user',
      uuid: 'x',
      message: {
        content: [{ type: 'tool_result', tool_use_id: 't', content: 'a'.repeat(MAX_TOOL_RESULT_CHARS + 10) }],
      },
    })
    expect(parseTranscriptLine(line, 0)[0]).toMatchObject({ truncated: true })
  })

  test('reads session metadata lines', () => {
    expect(parseMetaLine('{"type":"permission-mode","permissionMode":"plan"}')).toEqual({
      permissionMode: 'plan',
    })
    expect(parseMetaLine('{"type":"custom-title","customTitle":"T"}')).toEqual({ customTitle: 'T' })
    expect(parseMetaLine('{"type":"user"}')).toBeNull()
  })
})

describe('TranscriptFile', () => {
  test('buffers partial lines until the newline arrives', async () => {
    const path = join(home.dir(), 't.jsonl')
    await writeFile(path, '{"a":1}\n{"b":')
    const file = new TranscriptFile(path)
    expect((await file.sync()).map((l) => l.cursor)).toEqual([0])
    await appendFile(path, '2}\n{"c":3}\n')
    expect(await file.sync()).toEqual([
      { cursor: 1, text: '{"b":2}' },
      { cursor: 2, text: '{"c":3}' },
    ])
    expect(file.lineCount).toBe(3)
    expect(await file.readLines(1, 3)).toEqual([
      { cursor: 1, text: '{"b":2}' },
      { cursor: 2, text: '{"c":3}' },
    ])
  })

  test('pages backwards by entries', async () => {
    const file = new TranscriptFile(fixture)
    await file.sync()
    const last = await file.page(file.lineCount, 3)
    expect(last.entries.map((e) => e.kind)).toEqual(['system', 'unknown', 'assistant_text'])
    expect(last.hasMore).toBe(true)
    const before = Math.min(...last.entries.map((e) => e.cursor))
    const prev = await file.page(before, 100)
    expect(prev.hasMore).toBe(false)
    expect(prev.entries).toHaveLength(8)
  })

  test('returns entries after a cursor', async () => {
    const file = new TranscriptFile(fixture)
    await file.sync()
    expect((await file.since(15)).map((e) => e.cursor)).toEqual([16, 19])
  })
})

describe('TranscriptService', () => {
  let service: TranscriptService | undefined
  afterEach(async () => {
    await service?.dispose()
  })

  test('streams appended entries to subscribers and resumes by cursor', async () => {
    const path = join(home.dir(), 's.jsonl')
    await copyFile(fixture, path)
    const metas: unknown[] = []
    service = new TranscriptService(silentLogger, (_id, meta) => metas.push(meta))
    const conn = fakeConnection()
    const first = await service.subscribe({ sessionId: 's', path }, conn)
    expect(first.entries.length).toBe(11)
    expect(first.lineCount).toBe(20)

    await appendFile(path, `${JSON.stringify({ type: 'permission-mode', permissionMode: 'plan' })}\n`)
    await appendFile(
      path,
      `${JSON.stringify({ type: 'assistant', uuid: 'z', message: { content: [{ type: 'text', text: 'novo' }] } })}\n`,
    )
    await waitFor(() => conn.sent.some((m) => m.type === 'transcript.entry'))
    const entry = conn.sent.find(
      (m): m is Extract<ServerMessage, { type: 'transcript.entry' }> => m.type === 'transcript.entry',
    )
    expect(entry).toMatchObject({
      sessionId: 's',
      cursor: 21,
      entry: { kind: 'assistant_text', text: 'novo' },
    })
    expect(metas).toContainEqual({ permissionMode: 'plan' })

    const other = fakeConnection()
    const resumed = await service.subscribe({ sessionId: 's', path }, other, 19)
    expect(resumed.entries.map((e) => e.cursor)).toEqual([21])
  })

  test('history works without a subscription', async () => {
    service = new TranscriptService(silentLogger)
    const page = await service.history({ sessionId: 's', path: fixture }, 9, 2)
    expect(page.entries.map((e) => e.cursor)).toEqual([7, 8])
    expect(page.hasMore).toBe(true)
  })
})

async function waitFor(predicate: () => boolean, timeoutMs = 3_000): Promise<void> {
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error('timeout waiting for condition')
    await new Promise((r) => setTimeout(r, 20))
  }
}

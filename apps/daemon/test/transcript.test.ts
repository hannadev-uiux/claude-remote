import { appendFile, copyFile, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { MAX_TRANSCRIPT_IMAGE_BYTES, type ServerMessage } from '@remote-harness/protocol'
import { afterEach, describe, expect, test } from 'vitest'
import { silentLogger } from '../src/core/logger.ts'
import {
  base64Bytes,
  findImage,
  MAX_TOOL_RESULT_CHARS,
  onlyTagsName,
  parseImageId,
  parseMetaLine,
  parseTranscriptLine,
} from '../src/features/transcript/parser.ts'
import { TranscriptService } from '../src/features/transcript/service.ts'
import { TranscriptFile } from '../src/features/transcript/transcript-file.ts'
import { fakeConnection, useTempHome } from './helpers.ts'

const home = useTempHome()
const fixture = join(import.meta.dirname, 'fixtures', 'session.jsonl')
const imagesFixture = join(import.meta.dirname, 'fixtures', 'images.jsonl')

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
      images: [],
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

  test('drops the "(no content)" placeholder of /exit and of empty replies (#220)', () => {
    const user = (text: string) =>
      JSON.stringify({ type: 'user', uuid: 'u', message: { role: 'user', content: text } })
    const assistant = (text: string) =>
      JSON.stringify({ type: 'assistant', uuid: 'a', message: { content: [{ type: 'text', text }] } })
    expect(
      parseTranscriptLine(user('<command-name>/exit</command-name><command-args></command-args>'), 0),
    ).toMatchObject([{ kind: 'system', subtype: 'command', text: '/exit' }])
    expect(parseTranscriptLine(user('<local-command-stdout>(no content)</local-command-stdout>'), 1)).toEqual(
      [],
    )
    expect(parseTranscriptLine(assistant('(no content)'), 2)).toEqual([])
    expect(parseTranscriptLine(user('<local-command-stdout>Bye!</local-command-stdout>'), 3)).toMatchObject([
      { kind: 'system', subtype: 'command_output', text: 'Bye!' },
    ])
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

describe('tagged user entries', () => {
  const user = (content: unknown) =>
    JSON.stringify({ type: 'user', uuid: 'u', message: { role: 'user', content } })
  const notification = [
    '<task-notification>',
    '<task-id>t1</task-id>',
    '<tool-use-id>toolu_1</tool-use-id>',
    '<output-file>/tmp/example/tasks/t1.output</output-file>',
    '<status>stopped</status>',
    '<summary>Background agent "Review" didn\'t finish before the previous session ended</summary>',
    '<result>long result</result>',
    '<usage><total_tokens>10</total_tokens></usage>',
    '<note>No completion record was found for it.</note>',
    '</task-notification>',
  ].join('\n')

  test('a task notification is a system entry with status, summary and note only', () => {
    const [entry, ...rest] = parseTranscriptLine(user(notification), 0)
    expect(rest).toEqual([])
    expect(entry).toMatchObject({
      kind: 'system',
      subtype: 'task_notification',
      status: 'stopped',
      text: 'Background agent "Review" didn\'t finish before the previous session ended',
      note: 'No completion record was found for it.',
    })
    const json = JSON.stringify(entry)
    for (const hidden of ['/tmp/example', 'toolu_1', 'long result', 'total_tokens'])
      expect(json).not.toContain(hidden)
  })

  test('several notifications in one entry, in a text part, without a note', () => {
    const done = '<task-notification><status>completed</status><summary>Done</summary></task-notification>'
    const entries = parseTranscriptLine(user([{ type: 'text', text: `${done}\n${notification}` }]), 0)
    expect(entries.map((e) => e.kind === 'system' && e.status)).toEqual(['completed', 'stopped'])
    expect(entries[0]).not.toHaveProperty('note')
  })

  test('a notification without a summary shows its status', () => {
    const [entry] = parseTranscriptLine(
      user('<task-notification><status>failed</status></task-notification>'),
      0,
    )
    expect(entry).toMatchObject({ subtype: 'task_notification', status: 'failed', text: 'failed' })
  })

  test('shell commands run with ! are system entries', () => {
    expect(parseTranscriptLine(user('<bash-input>git status</bash-input>'), 0)[0]).toMatchObject({
      kind: 'system',
      subtype: 'bash_input',
      text: 'git status',
    })
    const output = '<bash-stdout>On branch main\n</bash-stdout><bash-stderr>warning: x</bash-stderr>'
    expect(parseTranscriptLine(user(output), 0)[0]).toMatchObject({
      subtype: 'bash_output',
      text: 'On branch main\nwarning: x',
    })
    expect(parseTranscriptLine(user('<bash-stdout></bash-stdout><bash-stderr></bash-stderr>'), 0)).toEqual([])
  })

  test('unknown entries made only of tags are tagged system entries, not prompts', () => {
    const raw = '<new-thing>\n<detail a="1">x</detail>\n</new-thing>\n<other>y</other>\n'
    expect(parseTranscriptLine(user(raw), 0)[0]).toMatchObject({
      kind: 'system',
      subtype: 'tagged',
      tag: 'new-thing',
      text: raw.trim(),
    })
    expect(parseTranscriptLine(user('use <b>bold</b> here'), 0)[0]).toMatchObject({ kind: 'user' })
  })

  test('onlyTagsName', () => {
    expect(onlyTagsName('<a>1</a> <b-2 x="y">2</b-2>')).toBe('a')
    expect(onlyTagsName('<a>1</a> trailing')).toBeNull()
    expect(onlyTagsName('<a>never closed')).toBeNull()
    expect(onlyTagsName('plain')).toBeNull()
    expect(onlyTagsName(`${'<a>x</a>'.repeat(5_000)}junk`)).toBeNull()
  })
})

describe('compaction entries', () => {
  const compactSummary = (content: string) =>
    JSON.stringify({
      type: 'user',
      uuid: 'u',
      isCompactSummary: true,
      isVisibleInTranscriptOnly: true,
      message: { role: 'user', content },
    })
  const compactBoundary = (compactMetadata?: Record<string, unknown>) =>
    JSON.stringify({
      type: 'system',
      uuid: 'b',
      subtype: 'compact_boundary',
      content: 'Conversation compacted',
      ...(compactMetadata ? { compactMetadata } : {}),
    })

  test('the boilerplate written for the model is stripped from the summary', () => {
    const content =
      'Summary:\n1. Did things\n' +
      '\nIf you need specific details from before compaction (like exact code snippets, error messages, or content you generated), read the full transcript at: /tmp/example/session.jsonl\n' +
      'Continue the conversation from where it left off without asking the user any further questions.'
    const [entry, ...rest] = parseTranscriptLine(compactSummary(content), 0)
    expect(rest).toEqual([])
    expect(entry).toMatchObject({
      kind: 'system',
      subtype: 'compact_summary',
      text: 'Summary:\n1. Did things',
    })
    expect(JSON.stringify(entry)).not.toContain('/tmp/example/session.jsonl')
  })

  test('a summary without the boilerplate marker is kept whole', () => {
    const content = 'Summary:\n1. Did things, no trailing instructions here'
    expect(parseTranscriptLine(compactSummary(content), 0)[0]).toMatchObject({
      kind: 'system',
      subtype: 'compact_summary',
      text: content,
    })
  })

  test('a regular user line (no isCompactSummary) is not affected', () => {
    const line = JSON.stringify({ type: 'user', uuid: 'u', message: { role: 'user', content: 'hello' } })
    expect(parseTranscriptLine(line, 0)[0]).toMatchObject({ kind: 'user', text: 'hello' })
  })

  test('compact_boundary carries a known trigger', () => {
    expect(parseTranscriptLine(compactBoundary({ trigger: 'auto' }), 0)[0]).toMatchObject({
      kind: 'system',
      subtype: 'compact_boundary',
      text: 'Conversation compacted',
      trigger: 'auto',
    })
  })

  test('compact_boundary without compactMetadata has no trigger field', () => {
    const entry = parseTranscriptLine(compactBoundary(), 0)[0]
    expect(entry).toMatchObject({
      kind: 'system',
      subtype: 'compact_boundary',
      text: 'Conversation compacted',
    })
    expect(entry).not.toHaveProperty('trigger')
  })
})

describe('images', () => {
  async function imageLines(): Promise<string[]> {
    return (await readFile(imagesFixture, 'utf8')).split('\n').filter(Boolean)
  }

  test('prompt images go with the prompt text, tool images with the result, no placeholder text', async () => {
    const lines = await imageLines()
    const entries = lines.flatMap((line, i) => parseTranscriptLine(line, i))
    expect(entries.map((e) => e.kind)).toEqual(['user', 'tool_use', 'tool_result', 'user', 'user'])
    expect(entries[0]).toMatchObject({
      kind: 'user',
      text: 'what is wrong here?',
      images: [{ id: '0.0', mediaType: 'image/png', bytes: 70 }],
    })
    expect(entries[2]).toMatchObject({
      kind: 'tool_result',
      toolUseId: 't1',
      content: 'Read image (1x1)',
      images: [{ id: '2.0', mediaType: 'image/jpeg' }],
    })
    // Image-only prompt: empty text.
    expect(entries[3]).toMatchObject({ kind: 'user', text: '', images: [{ id: '3.0' }] })
    // A `url` image keeps its number (4.0) but has no ref.
    expect(entries[4]).toMatchObject({ kind: 'user', text: 'two images', images: [{ id: '4.1' }] })
    expect(JSON.stringify(entries)).not.toContain('[imagem]')
  })

  test('entries without images have an empty list', async () => {
    const entries = (await fixtureLines()).flatMap((line, i) => parseTranscriptLine(line, i))
    for (const e of entries) if (e.kind === 'user' || e.kind === 'tool_result') expect(e.images).toEqual([])
  })

  test('findImage walks the same order as the refs', async () => {
    const lines = await imageLines()
    expect(findImage(lines[0]!, 0)).toMatchObject({ mediaType: 'image/png', bytes: 70 })
    expect(findImage(lines[2]!, 0)).toMatchObject({ mediaType: 'image/jpeg' })
    expect(findImage(lines[4]!, 0)).toBeNull()
    expect(findImage(lines[4]!, 1)?.mediaType).toBe('image/png')
    expect(findImage(lines[0]!, 1)).toBeNull()
    expect(findImage(lines[1]!, 0)).toBeNull()
    expect(findImage('not json', 0)).toBeNull()
  })

  test('image ids and sizes', () => {
    expect(parseImageId('12.3')).toEqual({ cursor: 12, index: 3 })
    expect(parseImageId('12')).toBeNull()
    expect(parseImageId('a.1')).toBeNull()
    expect(parseImageId('-1.0')).toBeNull()
    expect(base64Bytes('AAAA')).toBe(3)
    expect(base64Bytes('AAA=')).toBe(2)
    expect(base64Bytes('AA==')).toBe(1)
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
    const activity: string[] = []
    service = new TranscriptService(
      silentLogger,
      (_id, meta) => metas.push(meta),
      (id) => activity.push(id),
    )
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
    // New lines read for the session count as its activity (the session list sorts by it).
    expect(activity).toContain('s')

    const other = fakeConnection()
    const resumed = await service.subscribe({ sessionId: 's', path }, other, 19)
    expect(resumed.entries.map((e) => e.cursor)).toEqual([21])
  })

  test('follow feeds new entries only and keeps the stream while subscribers remain', async () => {
    const path = join(home.dir(), 'f.jsonl')
    await copyFile(fixture, path)
    service = new TranscriptService(silentLogger)
    const seen: string[] = []
    const stop = await service.follow({ sessionId: 's', path }, (sessionId, entry) =>
      seen.push(`${sessionId}:${entry.kind}`),
    )
    const conn = fakeConnection()
    await service.subscribe({ sessionId: 's', path }, conn)
    stop()
    await appendFile(
      path,
      `${JSON.stringify({ type: 'assistant', uuid: 'y', message: { content: [{ type: 'text', text: 'one' }] } })}\n`,
    )
    await waitFor(() => conn.sent.some((m) => m.type === 'transcript.entry'))
    expect(seen).toEqual([])

    const again = await service.follow({ sessionId: 's', path }, (sessionId, entry) =>
      seen.push(`${sessionId}:${entry.kind}`),
    )
    await appendFile(
      path,
      `${JSON.stringify({ type: 'assistant', uuid: 'x', message: { content: [{ type: 'thinking', thinking: 'hm' }] } })}\n`,
    )
    await waitFor(() => seen.length > 0)
    expect(seen).toEqual(['s:thinking'])
    again()
  })

  test('serves an image of the transcript and rejects unknown ones', async () => {
    service = new TranscriptService(silentLogger)
    const target = { sessionId: 's', path: imagesFixture }
    const image = await service.image(target, '3.0')
    expect(image).toMatchObject({ imageId: '3.0', mediaType: 'image/png' })
    expect(base64Bytes(image.data)).toBe(70)
    await expect(service.image(target, '3.1')).rejects.toMatchObject({ code: 'not_found' })
    await expect(service.image(target, '99.0')).rejects.toMatchObject({ code: 'not_found' })
    await expect(service.image(target, 'nope')).rejects.toMatchObject({ code: 'not_found' })
  })

  test('serving an image does not swallow lines a live stream has not pumped yet', async () => {
    const path = join(home.dir(), 'live.jsonl')
    await copyFile(imagesFixture, path)
    service = new TranscriptService(silentLogger)
    const conn = fakeConnection()
    await service.subscribe({ sessionId: 's', path }, conn)
    await appendFile(
      path,
      `${JSON.stringify({ type: 'assistant', uuid: 'n', message: { content: [{ type: 'text', text: 'new' }] } })}\n`,
    )
    await service.image({ sessionId: 's', path }, '3.0')
    await service.history({ sessionId: 's', path }, 5, 2)
    await waitFor(() => conn.sent.some((m) => m.type === 'transcript.entry'))
    expect(conn.sent).toContainEqual(
      expect.objectContaining({
        type: 'transcript.entry',
        cursor: 5,
        entry: expect.objectContaining({ text: 'new' }),
      }),
    )
  })

  test('tool images next to a result without prompt text go to the result', () => {
    const png = { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AAAA' } }
    const line = {
      type: 'user',
      uuid: 'x',
      message: { content: [{ type: 'tool_result', tool_use_id: 't', content: 'done' }, png] },
    }
    expect(parseTranscriptLine(JSON.stringify(line), 7)).toMatchObject([
      { kind: 'tool_result', content: 'done', images: [{ id: '7.0' }] },
    ])
  })

  test('a tool result nested in a tool result is not numbered (same walk as findImage)', () => {
    const png = { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AAAA' } }
    const nested = { type: 'tool_result', tool_use_id: 'n', content: [png] }
    const line = JSON.stringify({
      type: 'user',
      uuid: 'y',
      message: { content: [{ type: 'tool_result', tool_use_id: 't', content: [nested, png] }] },
    })
    expect(parseTranscriptLine(line, 1)).toMatchObject([{ kind: 'tool_result', images: [{ id: '1.0' }] }])
    expect(findImage(line, 0)).toMatchObject({ mediaType: 'image/png' })
    expect(findImage(line, 1)).toBeNull()
  })

  test('refuses images over the size limit', async () => {
    const path = join(home.dir(), 'big.jsonl')
    const data = 'A'.repeat(Math.ceil((MAX_TRANSCRIPT_IMAGE_BYTES + 3) / 3) * 4)
    const line = {
      type: 'user',
      uuid: 'b',
      message: { content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data } }] },
    }
    await writeFile(path, `${JSON.stringify(line)}\n`)
    service = new TranscriptService(silentLogger)
    const [entry] = parseTranscriptLine(JSON.stringify(line), 0)
    expect(entry?.kind === 'user' && entry.images[0]?.bytes).toBeGreaterThan(MAX_TRANSCRIPT_IMAGE_BYTES)
    await expect(service.image({ sessionId: 's', path }, '0.0')).rejects.toMatchObject({ code: 'too_large' })
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

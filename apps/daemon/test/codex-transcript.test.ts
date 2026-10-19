import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import {
  approvalPolicyName,
  codexTranscript,
  extractCodexMeta,
  findCodexImage,
  parseCodexLine,
  parseCodexMeta,
  patchFiles,
  rolloutSessionId,
  threadName,
  toolOutput,
} from '../src/features/transcript/codex-format.ts'
import { TranscriptFile } from '../src/features/transcript/transcript-file.ts'

const fixtures = join(import.meta.dirname, 'fixtures')
const paginated = join(fixtures, 'codex-paginated.jsonl')
const legacy = join(fixtures, 'codex-legacy.jsonl')

async function lines(path: string): Promise<string[]> {
  return (await readFile(path, 'utf8')).split('\n').filter(Boolean)
}

async function entries(path: string) {
  return (await lines(path)).flatMap((line, i) => parseCodexLine(line, i))
}

describe('codex rollout parser', () => {
  test('paginated rollout: each message once, tool calls from response items', async () => {
    const all = await entries(paginated)
    expect(all.map((e) => e.kind)).toEqual([
      'user',
      'thinking',
      'tool_use',
      'tool_result',
      'tool_use',
      'tool_result',
      'tool_use',
      'tool_result',
      'assistant_text',
      'system',
      'system',
      'system',
    ])
    expect(all[0]).toMatchObject({
      kind: 'user',
      text: 'run the tests',
      images: [{ id: '5.0', mediaType: 'image/png' }],
      cursor: 5,
      uuid: 'line-5',
      key: 'line-5:0',
      isSidechain: false,
      timestamp: '2026-10-19T17:37:09.021Z',
    })
    expect(all[1]).toMatchObject({ kind: 'thinking', text: '**Running tests**' })
    expect(all[2]).toMatchObject({
      kind: 'tool_use',
      toolUseId: 'call_abc',
      name: 'exec',
      input: { command: 'pnpm test', workdir: '/Users/me/proj' },
    })
    expect(all[3]).toMatchObject({
      kind: 'tool_result',
      toolUseId: 'call_abc',
      content: 'ok',
      isError: false,
    })
    expect(all[4]).toMatchObject({
      kind: 'tool_use',
      name: 'apply_patch',
      input: { files: ['src/app.css'] },
    })
    expect(all[5]).toMatchObject({ kind: 'tool_result', toolUseId: 'call_patch', isError: false })
    expect(all[7]).toMatchObject({ kind: 'tool_result', content: 'error: boom', isError: true })
    expect(all[8]).toMatchObject({ kind: 'assistant_text', text: 'All tests pass.' })
    expect(all[9]).toMatchObject({
      subtype: 'turn_duration',
      durationMs: 16050,
      text: 'Turn completed in 16s',
    })
    expect(all[10]).toMatchObject({ subtype: 'turn_aborted', text: 'Interrupted' })
    // `compacted` is skipped in paginated rollouts: the ContextCompaction item says it once.
    expect(all[11]).toMatchObject({ subtype: 'compact_boundary', cursor: 22 })
  })

  test('injected context never becomes a prompt', async () => {
    const all = await entries(paginated)
    expect(all.some((e) => e.kind === 'user' && e.text.includes('environment_context'))).toBe(false)
  })

  test('legacy rollout: events for messages, response items for tools', async () => {
    const all = await entries(legacy)
    expect(all.map((e) => e.kind)).toEqual([
      'user',
      'thinking',
      'tool_use',
      'tool_result',
      'assistant_text',
      'tool_use',
      'tool_result',
      'system',
    ])
    expect(all[0]).toMatchObject({ text: 'list files', images: [{ id: '4.0', mediaType: 'image/jpeg' }] })
    expect(all[2]).toMatchObject({ name: 'exec', input: { command: 'ls', workdir: '/Users/me/old' } })
    expect(all[3]).toMatchObject({ content: 'a.txt\nb.txt\n', isError: false })
    expect(all[5]).toMatchObject({ name: 'web_search', input: { query: 'codex cli' } })
    expect(all[7]).toMatchObject({ subtype: 'compact_boundary' })
  })

  test('other function calls keep their name and arguments', () => {
    const line = JSON.stringify({
      timestamp: 't',
      ordinal: 1,
      type: 'response_item',
      payload: { type: 'function_call', name: 'update_plan', arguments: '{"plan":[]}', call_id: 'c' },
    })
    expect(parseCodexLine(line, 0)).toMatchObject([{ name: 'update_plan', input: { plan: [] } }])
    const bad = JSON.stringify({
      type: 'response_item',
      payload: { type: 'function_call', name: 'x', arguments: 'not json', call_id: 'c' },
    })
    expect(parseCodexLine(bad, 0)).toMatchObject([{ input: { arguments: 'not json' } }])
  })

  test('never throws on odd lines', () => {
    for (const raw of ['', 'nope', '[]', '{"type":"event_msg"}', '{"type":"response_item","payload":1}']) {
      expect(parseCodexLine(raw, 0)).toEqual([])
    }
  })

  test('images are found by the ids the parser gave them', async () => {
    const all = await lines(paginated)
    expect(findCodexImage(all[5]!, 0)).toMatchObject({ mediaType: 'image/png', data: 'iVBORw0KGgo=' })
    expect(findCodexImage(all[5]!, 1)).toBeNull()
    expect(findCodexImage(all[4]!, 0)).toBeNull()
    expect(findCodexImage('nope', 0)).toBeNull()
  })

  test('TranscriptFile pages with the Codex format', async () => {
    const file = new TranscriptFile(paginated, codexTranscript)
    await file.sync()
    const page = await file.page(file.lineCount, 3)
    expect(page.entries.map((e) => e.kind)).toEqual(['system', 'system', 'system'])
    expect(page.hasMore).toBe(true)
  })
})

describe('codex helpers', () => {
  test('meta lines carry the approval policy', async () => {
    const all = await lines(paginated)
    expect(parseCodexMeta(all[3]!)).toEqual({ approvalPolicy: 'on-request' })
    expect(parseCodexMeta(all[19]!)).toEqual({ approvalPolicy: 'never' })
    expect(parseCodexMeta(all[5]!)).toBeNull()
    expect(approvalPolicyName({ granular: { rules: true } })).toBe('granular')
    expect(approvalPolicyName(3)).toBeNull()
  })

  test('meta from head and tail', async () => {
    const all = await lines(paginated)
    expect(extractCodexMeta(all.slice(0, 8), all.slice(-4))).toEqual({
      id: '0199fd2a-7c1e-7a33-9a0e-5b0f2c1d4e6f',
      cwd: '/Users/me/proj',
      firstPrompt: 'run the tests',
      approvalPolicy: 'never',
    })
    const old = await lines(legacy)
    expect(extractCodexMeta(old, [])).toMatchObject({
      cwd: '/Users/me/old',
      firstPrompt: 'list files',
      approvalPolicy: 'untrusted',
    })
  })

  test('thread names: last wins', () => {
    const index = [
      '{"id":"a","thread_name":"First","updated_at":"1"}',
      '{"id":"b","thread_name":"Other","updated_at":"2"}',
      '{"id":"a","thread_name":"Renamed","updated_at":"3"}',
    ]
    expect(threadName(index, 'a')).toBe('Renamed')
    expect(threadName(index, 'c')).toBeNull()
  })

  test('rollout file names', () => {
    expect(rolloutSessionId('rollout-2026-10-19T14-37-08-0199fd2a-7c1e-7a33-9a0e-5b0f2c1d4e6f.jsonl')).toBe(
      '0199fd2a-7c1e-7a33-9a0e-5b0f2c1d4e6f',
    )
    expect(
      rolloutSessionId(
        'rollout-2026-10-19T14-37-08-0199fd2a-7c1e-7a33-9a0e-5b0f2c1d4e6f_0199fd2b-0000-7000-8000-000000000000.jsonl',
      ),
    ).toBe('0199fd2a-7c1e-7a33-9a0e-5b0f2c1d4e6f')
    expect(rolloutSessionId('rollout-2026-10-19T14-37-08-x.jsonl')).toBeNull()
    expect(rolloutSessionId('session_index.jsonl')).toBeNull()
  })

  test('patch files and tool outputs', () => {
    expect(
      patchFiles(
        '*** Begin Patch\n*** Add File: a.ts\n+x\n*** Update File: b.ts\n*** Move to: c.ts\n*** Delete File: d.ts\n',
      ),
    ).toEqual(['a.ts', 'b.ts', 'd.ts', 'c.ts'])
    expect(toolOutput('plain')).toEqual({ text: 'plain', isError: false })
    expect(toolOutput('Wall time: 1s\nProcess running with session ID 3\nOutput:\npartial')).toEqual({
      text: 'partial',
      isError: false,
    })
    expect(toolOutput('{"output":"x","metadata":{"exit_code":2}}')).toEqual({ text: 'x', isError: true })
  })
})

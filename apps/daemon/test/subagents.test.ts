import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ServerMessage } from '@remote-harness/protocol'
import { afterEach, describe, expect, test } from 'vitest'
import { silentLogger } from '../src/core/logger.ts'
import { SessionStore } from '../src/features/sessions/store.ts'
import type { SessionRecord } from '../src/features/sessions/types.ts'
import {
  cleanName,
  countToolUses,
  INACTIVITY_MS,
  SubagentTracker,
  subagentsDir,
} from '../src/features/subagents/tracker.ts'
import {
  parseTranscriptLine,
  subagentOutcome,
  subagentPromptLine,
} from '../src/features/transcript/parser.ts'
import { hookEvent, useTempHome } from './helpers.ts'

const fixture = join(import.meta.dirname, 'fixtures', 'session.jsonl')

const home = useTempHome()
let tracker: SubagentTracker | undefined
afterEach(async () => {
  await tracker?.dispose()
})

async function waitFor(predicate: () => boolean, timeoutMs = 3_000) {
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error('timeout')
    await new Promise((r) => setTimeout(r, 20))
  }
}

function setup(now = Date.now) {
  const sent: ServerMessage[] = []
  const store = new SessionStore(
    { broadcast: (m) => sent.push(m) },
    join(home.dir(), 's.json'),
    silentLogger,
    60_000,
  )
  store.dispose()
  tracker = new SubagentTracker(store, { broadcast: (m) => sent.push(m) }, silentLogger, {
    now,
    dirPollMs: 50,
    outcomeChecksMs: [],
  })
  store.onChange((s) => tracker!.sync(s))
  const transcriptPath = join(home.dir(), 'proj', 'sess.jsonl')
  const add = (patch: Partial<SessionRecord> = {}) =>
    store.upsert('sess', {}, () => ({
      id: 'sess',
      profileId: 'p',
      cwd: '/w',
      title: '',
      state: 'running',
      permissionMode: null,
      approvalPolicy: null,
      controllable: true,
      paneId: '%1',
      updatedAt: '',
      subagents: [],
      backgroundTasks: 0,
      checkout: null,
      status: null,
      transcriptPath,
      ...patch,
    }))
  return { sent, store, add, dir: subagentsDir(transcriptPath), transcriptPath }
}

const user = (content: unknown) => JSON.stringify({ type: 'user', message: { role: 'user', content } })

describe('subagent names and outcome', () => {
  test('blank names are null', () => {
    expect(cleanName('  Explore ')).toBe('Explore')
    expect(cleanName('   ')).toBeNull()
    expect(cleanName(undefined)).toBeNull()
  })

  test('the prompt line is the first non-empty line of the first user message', () => {
    expect(subagentPromptLine(user('\n  Review the diff\nDetails…'))).toBe('Review the diff')
    expect(subagentPromptLine(user([{ type: 'text', text: 'Find usages' }]))).toBe('Find usages')
    expect(subagentPromptLine(user('x'.repeat(100)))).toHaveLength(80)
    expect(subagentPromptLine(JSON.stringify({ type: 'assistant', message: { content: 'hi' } }))).toBeNull()
    expect(subagentPromptLine('not json')).toBeNull()
  })

  test('an error result of the spawning call means failed', () => {
    const lines = [
      user([{ type: 'tool_result', tool_use_id: 'toolu_1', is_error: true, content: 'boom' }]),
      user([{ type: 'tool_result', tool_use_id: 'toolu_2', content: 'ok' }]),
    ]
    expect(subagentOutcome(lines, { agentId: 'a1', toolUseId: 'toolu_1' })).toBe('failed')
    expect(subagentOutcome(lines, { agentId: 'a2', toolUseId: 'toolu_2' })).toBeNull()
  })

  test('a background task notification gives the status, the last one wins', () => {
    const note = (id: string, status: string) =>
      user(`<task-notification>\n<task-id>${id}</task-id>\n<status>${status}</status>\n</task-notification>`)
    expect(subagentOutcome([note('a1', 'killed')], { agentId: 'a1', toolUseId: null })).toBe('stopped')
    expect(subagentOutcome([note('a1', 'failed')], { agentId: 'a1', toolUseId: null })).toBe('failed')
    expect(
      subagentOutcome([note('a1', 'failed'), note('a1', 'completed')], { agentId: 'a1', toolUseId: null }),
    ).toBe('completed')
    expect(subagentOutcome([note('b9', 'failed')], { agentId: 'a1', toolUseId: null })).toBeNull()
  })
})

describe('SubagentTracker', () => {
  test('maps the subagents folder next to the transcript', () => {
    expect(subagentsDir('/p/proj/abc.jsonl')).toBe('/p/proj/abc/subagents')
  })

  test('discovers new subagent transcripts with their meta', async () => {
    const { store, add, dir, sent } = setup()
    add()
    await new Promise((r) => setTimeout(r, 100))
    await mkdir(dir, { recursive: true })
    await writeFile(
      join(dir, 'agent-a1.meta.json'),
      JSON.stringify({ agentType: 'Explore', description: 'Buscar código' }),
    )
    await writeFile(join(dir, 'agent-a1.jsonl'), '{}\n')
    await waitFor(() => (store.get('sess')?.subagents.length ?? 0) > 0)
    expect(store.get('sess')?.subagents[0]).toMatchObject({
      agentId: 'a1',
      agentType: 'Explore',
      description: 'Buscar código',
      state: 'running',
    })
    expect(sent.some((m) => m.type === 'subagent.updated')).toBe(true)
    expect(tracker!.transcriptPath('sess', 'a1')).toBe(join(dir, 'agent-a1.jsonl'))
    expect(tracker!.transcriptPath('sess', 'zz')).toBeNull()
  })

  test('discovers transcripts created while the folder watcher starts', async () => {
    const { store, add, dir } = setup()
    add()
    await mkdir(dir, { recursive: true })
    const ids = Array.from({ length: 20 }, (_, i) => `b${i}`)
    for (const id of ids) {
      await writeFile(join(dir, `agent-${id}.jsonl`), '{}\n')
      await new Promise((r) => setTimeout(r, 5))
    }
    await waitFor(() => (store.get('sess')?.subagents.length ?? 0) === ids.length)
  })

  test('a meta file written late, or missing, still names the subagent', async () => {
    const { store, add, dir } = setup()
    add()
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'agent-c1.jsonl'), `${user('Look for the login handler\nand more')}\n`)
    await tracker!.touch('sess', 'c1')
    // No meta yet: the prompt's first line.
    expect(store.get('sess')?.subagents[0]).toMatchObject({
      description: 'Look for the login handler',
      agentType: null,
    })
    await writeFile(
      join(dir, 'agent-c1.meta.json'),
      JSON.stringify({ agentType: ' Explore ', description: '' }),
    )
    await tracker!.touch('sess', 'c1')
    expect(store.get('sess')?.subagents[0]).toMatchObject({
      description: 'Look for the login handler',
      agentType: 'Explore',
    })
  })

  test('a failed spawning call marks the finished subagent failed', async () => {
    const { store, add, dir, transcriptPath } = setup()
    add()
    await mkdir(dir, { recursive: true })
    await writeFile(
      join(dir, 'agent-d1.meta.json'),
      JSON.stringify({ description: 'Run tests', toolUseId: 'toolu_9' }),
    )
    await writeFile(join(dir, 'agent-d1.jsonl'), '{}\n')
    await tracker!.touch('sess', 'd1')
    tracker!.handleHook(hookEvent('SubagentStop', { session_id: 'sess', agent_id: 'd1', agent_type: '' }))
    await writeFile(
      transcriptPath,
      `${user([{ type: 'tool_result', tool_use_id: 'toolu_9', is_error: true, content: 'boom' }])}\n`,
    )
    await tracker!.checkOutcome('sess', 'd1')
    expect(store.get('sess')?.subagents[0]).toMatchObject({
      state: 'done',
      outcome: 'failed',
      agentType: null,
    })
  })

  test('SubagentStop marks done and Stop records background tasks', async () => {
    const { store, add } = setup()
    add()
    await tracker!.touch('sess', 'a1')
    tracker!.handleHook(hookEvent('SubagentStop', { session_id: 'sess', agent_id: 'a1', agent_type: 'Plan' }))
    expect(store.get('sess')?.subagents[0]).toMatchObject({ state: 'done', agentType: 'Plan' })
    tracker!.handleHook(hookEvent('Stop', { session_id: 'sess', background_tasks: [{ id: 1 }, { id: 2 }] }))
    expect(store.get('sess')?.backgroundTasks).toBe(2)
  })

  test('counts tool uses incrementally, keeps the start time and settles the count on SubagentStop', async () => {
    const { store, add, dir } = setup()
    add()
    await mkdir(dir, { recursive: true })
    const lines = (await readFile(fixture, 'utf8')).split('\n').filter(Boolean)
    const total = countToolUses(lines)
    expect(total).toBeGreaterThan(0)
    const toolLine = lines.find((line) => parseTranscriptLine(line, 0).some((e) => e.kind === 'tool_use'))
    if (!toolLine) throw new Error('fixture without tool use')
    const file = join(dir, 'agent-t1.jsonl')
    await writeFile(file, `${lines.join('\n')}\n`)
    await tracker!.touch('sess', 't1')
    const first = store.get('sess')?.subagents.find((s) => s.agentId === 't1')
    expect(first).toMatchObject({ state: 'running', toolCount: total })
    expect(first?.startedAt).toBeTruthy()
    // A partial line (cut mid-way) is not counted until its end arrives.
    const half = Math.floor(toolLine.length / 2)
    await appendFile(file, toolLine.slice(0, half))
    await tracker!.touch('sess', 't1')
    expect(store.get('sess')?.subagents.find((s) => s.agentId === 't1')).toMatchObject({
      toolCount: total,
      startedAt: first?.startedAt,
    })
    await appendFile(file, `${toolLine.slice(half)}\n`)
    await tracker!.touch('sess', 't1')
    expect(store.get('sess')?.subagents.find((s) => s.agentId === 't1')?.toolCount).toBe(total + 1)
    // The hook may land before the last change event: the count is settled afterwards.
    await appendFile(file, `${toolLine}\n`)
    tracker!.handleHook(hookEvent('SubagentStop', { session_id: 'sess', agent_id: 't1' }))
    await waitFor(() => {
      const sub = store.get('sess')?.subagents.find((s) => s.agentId === 't1')
      return sub?.toolCount === total + 2 && sub.state === 'done'
    })
    expect(store.get('sess')?.subagents.find((s) => s.agentId === 't1')).toMatchObject({
      state: 'done',
      startedAt: first?.startedAt,
    })
  })

  test('a transcript read in flight when SubagentStop lands never flips the subagent back to running', async () => {
    const { store, add, dir } = setup()
    add()
    await mkdir(dir, { recursive: true })
    const lines = (await readFile(fixture, 'utf8')).split('\n').filter(Boolean)
    await writeFile(join(dir, 'agent-t2.jsonl'), `${lines.join('\n')}\n`)
    await tracker!.touch('sess', 't2')
    // `touch` has read the running record and is awaiting the transcript when the hook arrives.
    const inFlight = tracker!.touch('sess', 't2')
    tracker!.handleHook(hookEvent('SubagentStop', { session_id: 'sess', agent_id: 't2' }))
    await inFlight
    expect(store.get('sess')?.subagents.find((s) => s.agentId === 't2')).toMatchObject({
      state: 'done',
      toolCount: countToolUses(lines),
    })
  })

  test('countToolUses ignores blank and malformed lines', () => {
    expect(countToolUses(['', '   ', 'not json', '{"type":"nothing"}'])).toBe(0)
  })

  test('quiet subagents of idle sessions are swept to done', async () => {
    let now = Date.parse('2026-10-14T12:00:00Z')
    const { store, add } = setup(() => now)
    add()
    await tracker!.touch('sess', 'a1')
    store.upsert('sess', { state: 'idle' })
    now += INACTIVITY_MS + 1
    tracker!.sweep()
    expect(store.get('sess')?.subagents[0]?.state).toBe('done')
  })
})

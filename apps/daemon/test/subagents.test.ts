import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ServerMessage } from '@remote-harness/protocol'
import { afterEach, describe, expect, test } from 'vitest'
import { silentLogger } from '../src/core/logger.ts'
import { SessionStore } from '../src/features/sessions/store.ts'
import type { SessionRecord } from '../src/features/sessions/types.ts'
import { INACTIVITY_MS, SubagentTracker, subagentsDir } from '../src/features/subagents/tracker.ts'
import { hookEvent, useTempHome } from './helpers.ts'

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

  test('SubagentStop marks done and Stop records background tasks', async () => {
    const { store, add } = setup()
    add()
    await tracker!.touch('sess', 'a1')
    tracker!.handleHook(hookEvent('SubagentStop', { session_id: 'sess', agent_id: 'a1', agent_type: 'Plan' }))
    expect(store.get('sess')?.subagents[0]).toMatchObject({ state: 'done', agentType: 'Plan' })
    tracker!.handleHook(hookEvent('Stop', { session_id: 'sess', background_tasks: [{ id: 1 }, { id: 2 }] }))
    expect(store.get('sess')?.backgroundTasks).toBe(2)
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

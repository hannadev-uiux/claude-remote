import { join } from 'node:path'
import type { ServerMessage } from '@remote-harness/protocol'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { DaemonError } from '../src/core/errors.ts'
import { silentLogger } from '../src/core/logger.ts'
import { canDeliver, isBusy, nextDeliverable, TURN_GRACE_MS } from '../src/features/queue/queue.ts'
import { QueueService } from '../src/features/queue/service.ts'
import { SessionStore } from '../src/features/sessions/store.ts'
import type { SessionRecord } from '../src/features/sessions/types.ts'
import { useTempHome } from './helpers.ts'

const home = useTempHome()
const stores: SessionStore[] = []
const services: QueueService[] = []
afterEach(async () => {
  // Background persistence must finish before the temp home is removed.
  await Promise.all(services.splice(0).map((service) => service.dispose()))
  for (const store of stores.splice(0)) store.dispose()
})

function record(id: string, patch: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id,
    profileId: 'claudin',
    cwd: '/w',
    title: id,
    state: 'running',
    permissionMode: null,
    approvalPolicy: null,
    controllable: true,
    paneId: '%1',
    updatedAt: '2026-10-18T10:00:00Z',
    subagents: [],
    backgroundTasks: 0,
    checkout: null,
    status: null,
    transcriptPath: null,
    ...patch,
  }
}

async function waitFor(predicate: () => boolean, timeoutMs = 2_000): Promise<void> {
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error('timeout')
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
}

/** Long enough for a delivery (and its persistence) to run when it is going to. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 40))

function setup(options: { statePath?: string; sessions?: SessionRecord[] } = {}) {
  const sent: ServerMessage[] = []
  const store = new SessionStore({ broadcast: () => {} }, join(home.dir(), 's.json'), silentLogger, 60_000)
  stores.push(store)
  for (const session of options.sessions ?? [record('s')]) store.upsert(session.id, {}, () => session)
  const input = { sendText: vi.fn(async (_id: string, _text: string, _ids: readonly string[]) => {}) }
  let pending = false
  let now = Date.parse('2026-10-18T12:00:00Z')
  let seq = 0
  const service = new QueueService({
    store,
    input,
    hasPending: () => pending,
    broadcaster: { broadcast: (m) => sent.push(m) },
    statePath: options.statePath ?? join(home.dir(), `queue-${Math.random()}.json`),
    logger: silentLogger,
    now: () => now,
    sleep: async () => {},
    newId: () => `q${++seq}`,
  })
  services.push(service)
  store.onChange((session) => service.onSessionChange(session))
  const queues = () => sent.filter((m) => m.type === 'session.queue')
  const calls = () => input.sendText.mock.calls.map((c) => c[1])
  return {
    store,
    input,
    service,
    queues,
    calls,
    setPending: (value: boolean) => {
      pending = value
    },
    advance: (ms: number) => {
      now += ms
    },
  }
}

describe('queue logic', () => {
  test('busy, deliverable head and canDeliver', () => {
    expect(isBusy({ state: 'running', controllable: true }, false)).toBe(true)
    expect(isBusy({ state: 'idle', controllable: true }, true)).toBe(true)
    expect(isBusy({ state: 'idle', controllable: true }, false)).toBe(false)
    const item = { id: 'a', sessionId: 's', text: 'x', attachmentIds: [], createdAt: '', error: null }
    expect(nextDeliverable([item])).toEqual(item)
    expect(nextDeliverable([{ ...item, error: 'boom' }, item])).toBeNull()
    expect(nextDeliverable([])).toBeNull()
    const idle = { state: 'idle' as const, controllable: true }
    expect(canDeliver(idle, false, undefined, 0)).toBe(true)
    expect(canDeliver(idle, true, undefined, 0)).toBe(false)
    expect(canDeliver({ ...idle, controllable: false }, false, undefined, 0)).toBe(false)
    expect(canDeliver(undefined, false, undefined, 0)).toBe(false)
    expect(canDeliver(idle, false, 1_000, 1_000 + TURN_GRACE_MS - 1)).toBe(false)
    expect(canDeliver(idle, false, 1_000, 1_000 + TURN_GRACE_MS)).toBe(true)
  })
})

describe('QueueService.submit', () => {
  test('auto sends right away to an idle session and queues while it works; now always pastes', async () => {
    const { service, store, input, queues, calls } = setup()
    store.upsert('s', { state: 'idle' })
    expect(await service.submit('s', 'first', [], 'auto')).toEqual({ delivery: 'sent' })
    expect(input.sendText).toHaveBeenCalledWith('s', 'first', [])
    store.upsert('s', { state: 'running' })
    expect(await service.submit('s', 'later', ['img1'], 'auto')).toEqual({ delivery: 'queued', itemId: 'q1' })
    expect(calls()).toEqual(['first'])
    expect(queues().at(-1)).toMatchObject({
      sessionId: 's',
      items: [{ id: 'q1', text: 'later', attachmentIds: ['img1'] }],
    })
    expect(await service.submit('s', 'urgent', [], 'now')).toEqual({ delivery: 'sent' })
    expect(calls()).toEqual(['first', 'urgent'])
    // Turning idle delivers what waited; prompts arriving right after wait for that turn, in order.
    store.upsert('s', { state: 'idle' })
    await waitFor(() => calls().length === 3)
    expect(input.sendText).toHaveBeenLastCalledWith('s', 'later', ['img1'])
    await service.submit('s', 'third', [], 'queue')
    expect(await service.submit('s', 'fourth', [], 'auto')).toMatchObject({ delivery: 'queued' })
    await settle()
    expect(calls()).toHaveLength(3)
    expect(service.list('s').map((i) => i.text)).toEqual(['third', 'fourth'])
  })

  test('refuses empty prompts, read-only sessions and a full queue', async () => {
    const { service, store } = setup()
    await expect(service.submit('s', '  ', [], 'queue')).rejects.toMatchObject({ code: 'bad_request' })
    for (let i = 0; i < 20; i++) await service.submit('s', `m${i}`, [], 'queue')
    await expect(service.submit('s', 'one more', [], 'queue')).rejects.toMatchObject({ code: 'bad_request' })
    store.upsert('s', { controllable: false, paneId: null })
    await expect(service.submit('s', 'x', [], 'queue')).rejects.toMatchObject({ code: 'not_controllable' })
    await expect(service.submit('nope', 'x', [], 'queue')).rejects.toMatchObject({ code: 'not_found' })
  })
})

describe('QueueService delivery', () => {
  test('delivers the head when the session turns idle, then waits for that turn before the next', async () => {
    const { service, store, input, calls, advance } = setup()
    await service.submit('s', 'one', [], 'queue')
    await service.submit('s', 'two', ['img2'], 'queue')
    expect(input.sendText).not.toHaveBeenCalled()
    store.upsert('s', { state: 'idle' })
    await waitFor(() => calls().length === 1)
    expect(input.sendText).toHaveBeenCalledWith('s', 'one', [])
    await waitFor(() => service.list('s').length === 1)
    // Still idle (the prompt hook has not landed): a status touch must not push the next one.
    store.upsert('s', { backgroundTasks: 1 })
    await settle()
    expect(calls()).toEqual(['one'])
    // The turn runs and ends: the next prompt goes.
    store.upsert('s', { state: 'running' })
    store.upsert('s', { state: 'idle' })
    await waitFor(() => calls().length === 2)
    expect(input.sendText).toHaveBeenLastCalledWith('s', 'two', ['img2'])
    await waitFor(() => service.list('s').length === 0)
    // Without any state change, the grace period eventually lets a new prompt through.
    await service.submit('s', 'three', [], 'queue')
    await settle()
    expect(calls()).toHaveLength(2)
    advance(TURN_GRACE_MS)
    store.upsert('s', { backgroundTasks: 2 })
    await waitFor(() => calls().length === 3)
  })

  test('waits while a permission is pending', async () => {
    const { service, store, input, calls, setPending } = setup()
    await service.submit('s', 'one', [], 'queue')
    setPending(true)
    store.upsert('s', { state: 'idle' })
    await settle()
    expect(input.sendText).not.toHaveBeenCalled()
    setPending(false)
    store.upsert('s', { state: 'running' })
    store.upsert('s', { state: 'idle' })
    await waitFor(() => calls().length === 1)
    expect(input.sendText).toHaveBeenCalledWith('s', 'one', [])
  })

  test('a failed delivery keeps the prompt with its error until the user edits it', async () => {
    const { service, store, input, calls, queues } = setup()
    input.sendText.mockRejectedValueOnce(new DaemonError('not_found', 'attachment img9 not found'))
    await service.submit('s', 'one', ['img9'], 'queue')
    await service.submit('s', 'two', [], 'queue')
    store.upsert('s', { state: 'idle' })
    await waitFor(() => service.list('s')[0]?.error !== null)
    expect(service.list('s')[0]).toMatchObject({ text: 'one', error: 'attachment img9 not found' })
    await waitFor(() => queues().some((m) => m.type === 'session.queue' && m.items[0]?.error !== null))
    // Nothing else leaves the queue while the head waits for the user.
    store.upsert('s', { state: 'running' })
    store.upsert('s', { state: 'idle' })
    await settle()
    expect(calls()).toEqual(['one'])
    await service.update('s', 'q1', 'one, fixed')
    await waitFor(() => calls().length === 2)
    expect(input.sendText).toHaveBeenLastCalledWith('s', 'one, fixed', ['img9'])
    await waitFor(() => service.list('s').length === 1)
    expect(service.list('s').map((i) => i.text)).toEqual(['two'])
  })

  test('sendNow pastes one prompt mid-turn and puts it back with the error when it fails', async () => {
    const { service, input } = setup()
    await service.submit('s', 'one', [], 'queue')
    await service.submit('s', 'two', [], 'queue')
    await service.sendNow('s', 'q2')
    expect(input.sendText).toHaveBeenCalledWith('s', 'two', [])
    expect(service.list('s').map((i) => i.id)).toEqual(['q1'])
    input.sendText.mockRejectedValueOnce(new DaemonError('not_controllable', 'session has no live tmux pane'))
    await expect(service.sendNow('s', 'q1')).rejects.toMatchObject({ code: 'not_controllable' })
    expect(service.list('s')[0]).toMatchObject({ id: 'q1', error: 'session has no live tmux pane' })
    await expect(service.sendNow('s', 'zz')).rejects.toMatchObject({ code: 'not_found' })
  })

  test('flush sends everything in order and remove drops one', async () => {
    const { service, calls } = setup()
    await service.submit('s', 'one', [], 'queue')
    await service.submit('s', 'two', [], 'queue')
    await service.submit('s', 'three', [], 'queue')
    await service.remove('s', 'q2')
    await service.flush('s')
    expect(calls()).toEqual(['one', 'three'])
    expect(service.list('s')).toEqual([])
  })

  test('an ended session loses its queue, with a broadcast of the empty list', async () => {
    const { service, store, queues } = setup()
    await service.submit('s', 'one', [], 'queue')
    store.upsert('s', { state: 'ended', controllable: false, paneId: null })
    expect(service.list('s')).toEqual([])
    expect(queues().at(-1)).toMatchObject({ sessionId: 's', items: [] })
  })

  test('persists across instances and replays to a late client', async () => {
    const statePath = join(home.dir(), 'queue-shared.json')
    const first = setup({ statePath })
    await first.service.submit('s', 'one', [], 'queue')
    await first.service.submit('s', 'two', [], 'queue')
    const second = setup({ statePath })
    await second.service.load()
    expect(second.service.list('s').map((i) => i.text)).toEqual(['one', 'two'])
    const connection = { send: vi.fn() }
    second.service.replay(connection)
    expect(connection.send).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'session.queue', sessionId: 's' }),
    )
    // Loading into a daemon whose session ended meanwhile drops the prompts.
    const third = setup({
      statePath,
      sessions: [record('s', { state: 'ended', controllable: false, paneId: null })],
    })
    await third.service.load()
    expect(third.service.list('s')).toEqual([])
  })
})

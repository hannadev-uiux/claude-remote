import { PROTOCOL_VERSION } from '@remote-harness/protocol'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { DaemonClient, DaemonRequestError, daemonUrl, type SocketLike } from './daemon-client'

class FakeSocket implements SocketLike {
  static instances: FakeSocket[] = []
  readyState = 0
  sent: Record<string, unknown>[] = []
  onopen: SocketLike['onopen'] = null
  onmessage: SocketLike['onmessage'] = null
  onclose: SocketLike['onclose'] = null
  onerror: SocketLike['onerror'] = null
  constructor(readonly url: string) {
    FakeSocket.instances.push(this)
  }
  send(data: string) {
    this.sent.push(JSON.parse(data))
  }
  close() {
    this.readyState = 3
  }
  // test helpers
  open() {
    this.readyState = 1
    this.onopen?.({})
  }
  receive(message: unknown) {
    this.onmessage?.({ data: JSON.stringify(message) })
  }
  drop(code = 1006) {
    this.readyState = 3
    this.onclose?.({ code })
  }
  last() {
    return this.sent.at(-1) as { id: string; type: string }
  }
}

const hello = {
  protocolVersion: PROTOCOL_VERSION,
  daemonVersion: '0.1.0',
  profiles: [],
  defaultRuleScope: 'project',
  muted: { profiles: [], sessions: [] },
}

function makeClient(extra: Partial<ConstructorParameters<typeof DaemonClient>[0]> = {}) {
  return new DaemonClient({
    host: '100.64.0.2',
    port: 7337,
    token: 'tok',
    socketFactory: (url) => new FakeSocket(url),
    ...extra,
  })
}

function authenticate(socket: FakeSocket) {
  socket.open()
  const auth = socket.last()
  socket.receive({ type: 'auth.ok', replyTo: auth.id, ...hello })
}

beforeEach(() => {
  FakeSocket.instances = []
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('DaemonClient', () => {
  test('authenticates first and becomes ready', async () => {
    const client = makeClient()
    const ready = vi.fn()
    client.onReady(ready)
    client.connect()
    const socket = FakeSocket.instances[0]!
    expect(socket.url).toBe('ws://100.64.0.2:7337')
    socket.open()
    expect(socket.last()).toMatchObject({ type: 'auth', token: 'tok', protocolVersion: PROTOCOL_VERSION })
    expect(client.status).toBe('authenticating')
    socket.receive({ type: 'auth.ok', replyTo: socket.last().id, ...hello })
    await vi.runAllTicks()
    await Promise.resolve()
    expect(client.status).toBe('open')
    expect(ready).toHaveBeenCalledOnce()
  })

  test('correlates replies and rejects error replies', async () => {
    const client = makeClient()
    client.connect()
    const socket = FakeSocket.instances[0]!
    authenticate(socket)
    await Promise.resolve()
    const list = client.request({ type: 'sessions.list' })
    socket.receive({ type: 'sessions.snapshot', replyTo: socket.last().id, sessions: [] })
    await expect(list).resolves.toMatchObject({ type: 'sessions.snapshot' })
    const input = client.request({ type: 'session.input', sessionId: 's', text: 'oi' })
    socket.receive({ type: 'error', replyTo: socket.last().id, code: 'not_controllable', message: 'x' })
    await expect(input).rejects.toMatchObject({ code: 'not_controllable' })
  })

  test('times out requests', async () => {
    const client = makeClient({ requestTimeoutMs: 15_000 })
    client.connect()
    authenticate(FakeSocket.instances[0]!)
    await Promise.resolve()
    const pending = client.request({ type: 'ping' })
    vi.advanceTimersByTime(15_001)
    await expect(pending).rejects.toBeInstanceOf(DaemonRequestError)
  })

  test('reconnects with exponential backoff and resubscribes', async () => {
    const client = makeClient()
    const ready = vi.fn()
    client.onReady(ready)
    client.connect()
    authenticate(FakeSocket.instances[0]!)
    await Promise.resolve()
    FakeSocket.instances[0]!.drop()
    expect(client.status).toBe('reconnecting')
    vi.advanceTimersByTime(999)
    expect(FakeSocket.instances).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(FakeSocket.instances).toHaveLength(2)
    FakeSocket.instances[1]!.drop()
    vi.advanceTimersByTime(1_999)
    expect(FakeSocket.instances).toHaveLength(2)
    vi.advanceTimersByTime(1)
    authenticate(FakeSocket.instances[2]!)
    await Promise.resolve()
    expect(ready).toHaveBeenCalledTimes(2)
  })

  test('caps the backoff at 30s and resumes immediately on demand', () => {
    const client = makeClient()
    client.connect()
    for (let i = 0; i < 8; i++) {
      FakeSocket.instances.at(-1)!.drop()
      vi.advanceTimersByTime(30_000)
    }
    const count = FakeSocket.instances.length
    FakeSocket.instances.at(-1)!.drop()
    client.resumeNow()
    expect(FakeSocket.instances.length).toBe(count + 1)
  })

  test('stops on unauthorized', async () => {
    const client = makeClient()
    client.connect()
    const socket = FakeSocket.instances[0]!
    socket.open()
    socket.receive({
      type: 'error',
      replyTo: socket.last().id,
      code: 'unauthorized',
      message: 'invalid token',
    })
    await Promise.resolve()
    await Promise.resolve()
    socket.drop(4001)
    expect(client.status).toBe('unauthorized')
    vi.advanceTimersByTime(60_000)
    expect(FakeSocket.instances).toHaveLength(1)
  })

  test('formats IPv6 hosts', () => {
    expect(daemonUrl('fd7a::1', 7337)).toBe('ws://[fd7a::1]:7337')
  })
})

describe('selectProfiles', () => {
  test('returns a stable empty array before hello', async () => {
    const { selectProfiles, useConnectionStore } = await import('./connection-store')
    const state = useConnectionStore.getState()
    expect(selectProfiles(state)).toBe(selectProfiles({ ...state }))
  })
})

describe('DaemonClient unreachable computer', () => {
  test('an attempt with no answer is abandoned after the connect timeout and marked unreachable', async () => {
    const client = makeClient({ connectTimeoutMs: 10_000 })
    const statuses: Array<[string, boolean]> = []
    client.onStatus((status) => statuses.push([status, client.unreachable]))
    client.connect()
    const first = FakeSocket.instances[0]!
    vi.advanceTimersByTime(9_999)
    expect(client.unreachable).toBe(false)
    vi.advanceTimersByTime(1)
    expect(first.readyState).toBe(3)
    expect(client.unreachable).toBe(true)
    expect(client.status).toBe('reconnecting')
    expect(statuses.at(-1)).toEqual(['reconnecting', true])

    // The computer wakes: the next attempt opens and the flag clears.
    vi.advanceTimersByTime(1_000)
    const second = FakeSocket.instances[1]!
    authenticate(second)
    await Promise.resolve()
    expect(client.status).toBe('open')
    expect(client.unreachable).toBe(false)
    // A late close of the abandoned socket changes nothing.
    first.drop()
    expect(client.status).toBe('open')
  })

  test('a connection refused at once is not unreachable and notifies the flip', () => {
    const client = makeClient({ connectTimeoutMs: 10_000 })
    const flags: boolean[] = []
    client.onStatus(() => flags.push(client.unreachable))
    client.connect()
    vi.advanceTimersByTime(10_000)
    expect(client.unreachable).toBe(true)
    vi.advanceTimersByTime(1_000)
    FakeSocket.instances[1]!.drop()
    expect(client.unreachable).toBe(false)
    expect(client.status).toBe('reconnecting')
    expect(flags.at(-1)).toBe(false)
  })

  test('close() cancels a pending connect timeout', () => {
    const client = makeClient({ connectTimeoutMs: 10_000 })
    client.connect()
    client.close()
    vi.advanceTimersByTime(20_000)
    expect(client.unreachable).toBe(false)
    expect(client.status).toBe('closed')
    expect(FakeSocket.instances).toHaveLength(1)
  })
})

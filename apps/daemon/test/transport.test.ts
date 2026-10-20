import { PROTOCOL_VERSION, type ServerMessage } from '@remote-harness/protocol'
import { afterEach, describe, expect, test, vi } from 'vitest'
import WebSocket from 'ws'
import { silentLogger } from '../src/core/logger.ts'
import { paths } from '../src/core/paths.ts'
import { FileTokenStore } from '../src/core/secrets.ts'
import { type RunningDaemon, startDaemon } from '../src/main.ts'
import { SECRET_HEADER } from '../src/transport/hooks-server.ts'
import { fakeExecutor, useTempHome, writeTestConfig } from './helpers.ts'

const home = useTempHome()
let daemon: RunningDaemon | undefined

afterEach(async () => {
  await daemon?.stop()
  daemon = undefined
})

async function boot(): Promise<{ daemon: RunningDaemon; token: string }> {
  await writeTestConfig(home.dir())
  const store = new FileTokenStore()
  await store.set('secret-token')
  daemon = await startDaemon({
    logger: silentLogger,
    exec: fakeExecutor(),
    tokenStore: store,
    dev: true,
    wsPort: 0,
    hookPort: 0,
  })
  return { daemon, token: 'secret-token' }
}

type Client = { ws: WebSocket; next: () => Promise<ServerMessage>; closed: Promise<number> }

async function connect(port: number): Promise<Client> {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`)
  const queue: ServerMessage[] = []
  const waiters: Array<(m: ServerMessage) => void> = []
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString()) as ServerMessage
    const waiter = waiters.shift()
    if (waiter) waiter(msg)
    else queue.push(msg)
  })
  const closed = new Promise<number>((resolve) => ws.on('close', (code) => resolve(code)))
  await new Promise<void>((resolve, reject) => {
    ws.once('open', () => resolve())
    ws.once('error', reject)
  })
  return {
    ws,
    closed,
    next: () => {
      const queued = queue.shift()
      return queued ? Promise.resolve(queued) : new Promise((resolve) => waiters.push(resolve))
    },
  }
}

describe('websocket handshake', () => {
  test('accepts the right token and answers auth.ok', async () => {
    const { daemon, token } = await boot()
    const client = await connect(daemon.wsPort)
    client.ws.send(JSON.stringify({ type: 'auth', id: 'a1', token, protocolVersion: PROTOCOL_VERSION }))
    const reply = await client.next()
    expect(reply).toMatchObject({ type: 'auth.ok', replyTo: 'a1', protocolVersion: PROTOCOL_VERSION })
    client.ws.send(JSON.stringify({ type: 'ping', id: 'p1' }))
    expect(await client.next()).toEqual({ type: 'pong', replyTo: 'p1' })
    client.ws.close()
  })

  test('rejects a wrong token and closes', async () => {
    const { daemon } = await boot()
    const client = await connect(daemon.wsPort)
    client.ws.send(
      JSON.stringify({ type: 'auth', id: 'a1', token: 'nope', protocolVersion: PROTOCOL_VERSION }),
    )
    expect(await client.next()).toMatchObject({ type: 'error', code: 'unauthorized' })
    expect(await client.closed).toBe(4001)
  })

  test('logs and records a malformed message after auth, instead of swallowing it', async () => {
    const { daemon, token } = await boot()
    const client = await connect(daemon.wsPort)
    client.ws.send(JSON.stringify({ type: 'auth', id: 'a1', token, protocolVersion: PROTOCOL_VERSION }))
    await client.next()
    const warn = vi.spyOn(silentLogger, 'warn')
    client.ws.send(JSON.stringify({ type: 'session.input', id: 'm1' })) // missing required `sessionId`
    expect(await client.next()).toMatchObject({ type: 'error', replyTo: 'm1', code: 'bad_request' })
    expect(warn).toHaveBeenCalledWith({ type: 'session.input', code: 'bad_request' }, 'request rejected')
    client.ws.send(JSON.stringify({ type: 'diagnostics.errors', id: 'd1' }))
    expect(await client.next()).toMatchObject({
      type: 'diagnostics.result',
      replyTo: 'd1',
      errors: [{ type: 'session.input', code: 'bad_request' }],
    })
    client.ws.close()
  })

  test('rejects messages before auth', async () => {
    const { daemon } = await boot()
    const client = await connect(daemon.wsPort)
    client.ws.send(JSON.stringify({ type: 'sessions.list', id: 's1' }))
    expect(await client.next()).toMatchObject({ type: 'error', code: 'unauthorized' })
    expect(await client.closed).toBe(4001)
  })

  test('rejects a different protocol major version', async () => {
    const { daemon, token } = await boot()
    const client = await connect(daemon.wsPort)
    client.ws.send(JSON.stringify({ type: 'auth', id: 'a1', token, protocolVersion: PROTOCOL_VERSION + 1 }))
    expect(await client.next()).toMatchObject({ type: 'error', code: 'protocol_mismatch' })
    expect(await client.closed).toBe(4002)
  })

  test('reload-token closes existing connections', async () => {
    const { daemon, token } = await boot()
    const client = await connect(daemon.wsPort)
    client.ws.send(JSON.stringify({ type: 'auth', id: 'a1', token, protocolVersion: PROTOCOL_VERSION }))
    await client.next()
    const { readFile } = await import('node:fs/promises')
    const secret = (await readFile(paths.hookSecret(), 'utf8')).trim()
    await new FileTokenStore().set('rotated')
    const res = await fetch(`http://127.0.0.1:${daemon.hookPort}/admin/reload-token`, {
      method: 'POST',
      headers: { [SECRET_HEADER]: secret },
    })
    expect(res.ok).toBe(true)
    expect(await client.closed).toBe(4003)
  })
})

describe('hooks server', () => {
  test('returns 401 without the secret', async () => {
    const { daemon } = await boot()
    const res = await fetch(`http://127.0.0.1:${daemon.hookPort}/health`)
    expect(res.status).toBe(401)
  })
})

describe('sessions.list', () => {
  test('returns a snapshot correlated by id', async () => {
    const { daemon, token } = await boot()
    const client = await connect(daemon.wsPort)
    client.ws.send(JSON.stringify({ type: 'auth', id: 'a1', token, protocolVersion: PROTOCOL_VERSION }))
    await client.next()
    client.ws.send(JSON.stringify({ type: 'sessions.list', id: 'abc' }))
    expect(await client.next()).toEqual({ type: 'sessions.snapshot', replyTo: 'abc', sessions: [] })
    client.ws.close()
  })
})

describe('attachment.upload', () => {
  test('accepts frames above 1 MB and checks the session before saving', async () => {
    const { daemon, token } = await boot()
    const client = await connect(daemon.wsPort)
    client.ws.send(JSON.stringify({ type: 'auth', id: 'a1', token, protocolVersion: PROTOCOL_VERSION }))
    await client.next()
    const data = Buffer.alloc(2 * 1024 * 1024).toString('base64')
    client.ws.send(
      JSON.stringify({ type: 'attachment.upload', id: 'u1', sessionId: 'nope', mimeType: 'image/png', data }),
    )
    expect(await client.next()).toMatchObject({ type: 'error', replyTo: 'u1', code: 'not_found' })
    client.ws.close()
  })
})

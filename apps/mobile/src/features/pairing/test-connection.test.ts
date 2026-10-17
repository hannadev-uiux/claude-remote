import { PROTOCOL_VERSION } from '@remote-harness/protocol'
import { describe, expect, test } from 'vitest'
import type { SocketLike } from '@/core/connection/daemon-client'
import { testConnection } from './test-connection'

function socketFactory(reply: 'ok' | 'unauthorized' | 'refused') {
  return (): SocketLike => {
    const socket: SocketLike = {
      readyState: 0,
      onopen: null,
      onmessage: null,
      onclose: null,
      onerror: null,
      send(data: string) {
        const { id } = JSON.parse(data) as { id: string }
        const message =
          reply === 'ok'
            ? {
                type: 'auth.ok',
                replyTo: id,
                protocolVersion: PROTOCOL_VERSION,
                daemonVersion: '0.1.0',
                profiles: [],
                defaultRuleScope: 'project',
                muted: { profiles: [], sessions: [] },
              }
            : { type: 'error', replyTo: id, code: 'unauthorized', message: 'invalid token' }
        queueMicrotask(() => {
          socket.onmessage?.({ data: JSON.stringify(message) })
          if (reply === 'unauthorized') socket.onclose?.({ code: 4001 })
        })
      },
      close() {},
    }
    queueMicrotask(() => {
      if (reply === 'refused') {
        socket.onclose?.({ code: 1006, reason: 'refused' })
        return
      }
      socket.readyState = 1
      socket.onopen?.({})
    })
    return socket
  }
}

const credentials = { host: '127.0.0.1', port: 7337, token: 'x'.repeat(20) }

describe('testConnection', () => {
  test('succeeds on auth.ok', async () => {
    const result = await testConnection(credentials, { socketFactory: socketFactory('ok') })
    expect(result).toMatchObject({ ok: true, hello: { daemonVersion: '0.1.0' } })
  })

  test('reports a rejected token', async () => {
    expect(await testConnection(credentials, { socketFactory: socketFactory('unauthorized') })).toEqual({
      ok: false,
      error: 'unauthorized',
    })
  })

  test('reports connection failures', async () => {
    expect(await testConnection(credentials, { socketFactory: socketFactory('refused') })).toEqual({
      ok: false,
      error: 'failed',
      detail: 'refused',
    })
  })
})

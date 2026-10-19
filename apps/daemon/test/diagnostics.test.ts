import type { ServerMessage } from '@remote-harness/protocol'
import { describe, expect, test } from 'vitest'
import { DaemonError } from '../src/core/errors.ts'
import { silentLogger } from '../src/core/logger.ts'
import { DAEMON_VERSION } from '../src/core/version.ts'
import { RejectionLog, registerDiagnosticsFeature } from '../src/features/diagnostics/index.ts'
import { MessageRouter } from '../src/transport/router.ts'
import { fakeConnection } from './helpers.ts'

const at = new Date('2026-10-19T12:00:00.000Z')

function setup() {
  const router = new MessageRouter(silentLogger)
  const { log } = registerDiagnosticsFeature({ router }, () => at)
  return { router, log }
}

describe('MessageRouter rejections', () => {
  test('reports daemon errors, unknown types and handler crashes with type and code only', async () => {
    const router = new MessageRouter(silentLogger)
    const seen: Array<[string, string]> = []
    router.onRejected((type, code) => seen.push([type, code]))
    router.register('session.start', () => {
      throw new DaemonError('invalid_cwd', 'not a directory: /Users/me/secret')
    })
    router.register('pane.focus', () => {
      throw new Error('boom')
    })
    const connection = fakeConnection()
    await router.dispatch({ type: 'session.start', id: '1', profileId: 'p', cwd: '/x' }, connection)
    await router.dispatch({ type: 'pane.focus', id: '2', sessionId: 's' }, connection)
    await router.dispatch({ type: 'commands.list', id: '3', sessionId: 's' }, connection)
    expect(seen).toEqual([
      ['session.start', 'invalid_cwd'],
      ['pane.focus', 'internal'],
      ['commands.list', 'unknown_type'],
    ])
  })

  test('successful requests are not reported', async () => {
    const router = new MessageRouter(silentLogger)
    const seen: string[] = []
    router.onRejected((type) => seen.push(type))
    router.register('ping', () => ({ type: 'pong' }))
    await router.dispatch({ type: 'ping', id: '1' }, fakeConnection())
    expect(seen).toEqual([])
  })
})

describe('diagnostics', () => {
  test('diagnostics.errors lists recent rejections, newest first, without messages', async () => {
    const { router } = setup()
    router.register('session.start', () => {
      throw new DaemonError('invalid_cwd', 'not a directory: /Users/me/secret')
    })
    const connection = fakeConnection()
    await router.dispatch({ type: 'session.start', id: '1', profileId: 'p', cwd: '/x' }, connection)
    await router.dispatch({ type: 'commands.list', id: '2', sessionId: 's' }, connection)
    await router.dispatch({ type: 'diagnostics.errors', id: '3' }, connection)
    const reply = connection.sent.at(-1) as Extract<ServerMessage, { type: 'diagnostics.result' }>
    expect(reply).toEqual({
      type: 'diagnostics.result',
      replyTo: '3',
      daemonVersion: DAEMON_VERSION,
      errors: [
        { at: at.toISOString(), type: 'commands.list', code: 'unknown_type' },
        { at: at.toISOString(), type: 'session.start', code: 'invalid_cwd' },
      ],
    })
    expect(JSON.stringify(reply)).not.toContain('secret')
  })

  test('the log keeps only the last entries', () => {
    const log = new RejectionLog(2)
    for (const type of ['a', 'b', 'c']) log.push({ at: at.toISOString(), type, code: 'internal' })
    expect(log.recent().map((e) => e.type)).toEqual(['c', 'b'])
  })
})

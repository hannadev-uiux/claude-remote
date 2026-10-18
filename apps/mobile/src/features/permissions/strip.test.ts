import type { PermissionRequestInfo, Session } from '@remote-harness/protocol'
import { describe, expect, test } from 'vitest'
import { formatElapsed, pendingForStrip, stripSessionId } from './strip'

const session = (id: string, state: Session['state'], updatedAt: string) =>
  ({ id, state, updatedAt, profileId: 'p', title: id, cwd: '/w', subagents: [] }) as unknown as Session

const request = (requestId: string, sessionId: string, createdAt: string, interaction?: 'question') =>
  ({
    requestId,
    sessionId,
    profileId: 'p',
    tool: 'Bash',
    input: { command: 'ls' },
    suggestedRule: null,
    defaultScope: 'project',
    createdAt,
    expiresAt: '2026-10-18T13:00:00Z',
    ...(interaction ? { interaction: { kind: 'question', title: 'Q', questions: [] } } : {}),
  }) as unknown as PermissionRequestInfo

describe('pendingForStrip', () => {
  test('nothing waiting', () => {
    expect(pendingForStrip([session('a', 'running', '2026-10-18T12:00:00Z')], [])).toBeNull()
  })

  test('the oldest request first, distinct sessions counted, the next item as the "+N more" target', () => {
    const sessions = [
      session('a', 'waiting', '2026-10-18T12:05:00Z'),
      session('b', 'waiting', '2026-10-18T12:06:00Z'),
    ]
    const requests = [
      request('r2', 'b', '2026-10-18T12:03:00Z'),
      request('r1', 'a', '2026-10-18T12:01:00Z'),
      request('r3', 'a', '2026-10-18T12:04:00Z'),
    ]
    const strip = pendingForStrip(sessions, requests)
    expect(strip?.oldest.kind).toBe('request')
    expect(strip?.oldest.kind === 'request' && strip.oldest.request.requestId).toBe('r1')
    expect(strip?.oldest.kind === 'request' && strip.oldest.session?.id).toBe('a')
    expect(strip?.sessions).toBe(2)
    expect(strip?.more).toBe(2)
    expect(strip?.next && stripSessionId(strip.next)).toBe('b')
  })

  test('a waiting session without a request is listed (and not answerable inline)', () => {
    const sessions = [
      session('a', 'waiting', '2026-10-18T12:00:00Z'),
      session('b', 'idle', '2026-10-18T12:30:00Z'),
    ]
    const strip = pendingForStrip(sessions, [request('r', 'c', '2026-10-18T12:10:00Z')])
    expect(strip?.oldest).toMatchObject({ kind: 'waiting', session: { id: 'a' } })
    expect(strip?.sessions).toBe(2)
    // A request for a session the list does not know yet still shows (session null).
    expect(strip?.next).toMatchObject({ kind: 'request', session: null })
  })

  test('a waiting session that already has a request is not duplicated', () => {
    const sessions = [session('a', 'waiting', '2026-10-18T11:00:00Z')]
    const strip = pendingForStrip(sessions, [request('r', 'a', '2026-10-18T12:00:00Z')])
    expect(strip?.more).toBe(0)
    expect(strip?.sessions).toBe(1)
  })
})

test('formatElapsed', () => {
  expect(formatElapsed(0)).toBe('0:00')
  expect(formatElapsed(-500)).toBe('0:00')
  expect(formatElapsed(276_000)).toBe('4:36')
  expect(formatElapsed(3_725_000)).toBe('1:02:05')
})

import { describe, expect, test } from 'vitest'
import {
  type ClientMessage,
  checkoutPeers,
  parseClientMessage,
  parseServerMessage,
  type ServerMessage,
  type Session,
} from '../src/index.ts'

const clientSamples: ClientMessage[] = [
  { type: 'auth', id: '1', token: 't', protocolVersion: 1 },
  { type: 'ping', id: '1' },
  { type: 'sessions.list', id: '1' },
  { type: 'session.subscribe', id: '1', sessionId: 's', sinceCursor: 3 },
  { type: 'session.unsubscribe', id: '1', sessionId: 's' },
  { type: 'session.history', id: '1', sessionId: 's', before: 50, limit: 50 },
  { type: 'session.input', id: '1', sessionId: 's', text: 'oi\nlinha 2 @src/a.ts' },
  { type: 'session.key', id: '1', sessionId: 's', key: 'Escape' },
  { type: 'session.setMode', id: '1', sessionId: 's', mode: 'plan' },
  {
    type: 'permission.respond',
    id: '1',
    requestId: 'r',
    decision: 'allow',
    always: { rule: 'Bash(pnpm test:*)', scope: 'project' },
  },
  { type: 'device.register', id: '1', fcmToken: 'tok' },
  { type: 'device.register', id: '1', fcmToken: 'tok', platform: 'android' },
  { type: 'app.visibility', id: '1', foreground: true },
  { type: 'files.search', id: '1', sessionId: 's', query: 'src', limit: 20 },
  { type: 'commands.list', id: '1', sessionId: 's' },
  { type: 'projects.list', id: '1', profileId: 'claudin' },
  { type: 'session.start', id: '1', profileId: 'claudin', cwd: '/tmp' },
  { type: 'session.start', id: '1', profileId: 'claudin', cwd: '/tmp', worktree: true },
  { type: 'checkout.inspect', id: '1', profileId: 'claudin', cwd: '/tmp' },
  { type: 'session.resume', id: '1', profileId: 'claudin', sessionId: 's' },
  { type: 'pane.subscribe', id: '1', sessionId: 's' },
  { type: 'pane.unsubscribe', id: '1', sessionId: 's' },
  { type: 'settings.mute', id: '1', target: 'profile', targetId: 'claudin', muted: true },
]

const session: Session = {
  id: 's',
  profileId: 'claudin',
  cwd: '/tmp',
  title: 'x',
  state: 'idle',
  permissionMode: 'default',
  controllable: true,
  paneId: '%1',
  updatedAt: '2026-10-14T00:00:00Z',
  subagents: [],
  backgroundTasks: 0,
  checkout: { root: '/tmp', branch: 'main' },
}

const serverSamples: ServerMessage[] = [
  {
    type: 'auth.ok',
    protocolVersion: 1,
    daemonVersion: '0.1.0',
    profiles: [],
    defaultRuleScope: 'project',
    muted: { profiles: [], sessions: [] },
  },
  { type: 'pong', replyTo: '1' },
  { type: 'ack', replyTo: '1' },
  { type: 'error', replyTo: '1', code: 'not_found', message: 'x' },
  { type: 'sessions.snapshot', replyTo: 'abc', sessions: [session] },
  { type: 'session.updated', session },
  { type: 'session.removed', sessionId: 's' },
  { type: 'session.state', sessionId: 's', state: 'running', permissionMode: 'plan' },
  {
    type: 'transcript.entry',
    sessionId: 's',
    cursor: 2,
    entry: {
      key: 'u:0',
      cursor: 2,
      index: 0,
      uuid: 'u',
      timestamp: null,
      isSidechain: false,
      kind: 'user',
      text: 'oi',
    },
  },
  { type: 'transcript.page', replyTo: '1', sessionId: 's', entries: [], hasMore: false, lineCount: 0 },
  { type: 'pane.frame', sessionId: 's', text: '>', cols: 80, rows: 24 },
  {
    type: 'permission.request',
    request: {
      requestId: 'r',
      sessionId: 's',
      profileId: 'claudin',
      tool: 'Bash',
      input: { command: 'ls' },
      suggestedRule: 'Bash(ls:*)',
      defaultScope: 'project',
      createdAt: 'now',
      expiresAt: 'later',
    },
  },
  { type: 'permission.resolved', requestId: 'r', sessionId: 's', outcome: 'expired' },
  {
    type: 'subagent.updated',
    sessionId: 's',
    subagent: { agentId: 'a', agentType: null, description: null, state: 'running', updatedAt: 'now' },
  },
  { type: 'files.results', replyTo: '1', query: 'q', items: [{ path: 'src/', kind: 'dir' }] },
  {
    type: 'commands.results',
    replyTo: '1',
    items: [{ name: 'clear', description: '', source: 'builtin', interactive: false }],
  },
  { type: 'projects.results', replyTo: '1', items: [{ cwd: '/tmp', lastUsedAt: 'now' }] },
  { type: 'mute.updated', muted: { profiles: ['claudin'], sessions: [] } },
  { type: 'checkout.info', replyTo: '1', checkout: { root: '/tmp', branch: null }, peers: [] },
  { type: 'checkout.info', replyTo: '1', checkout: null, peers: [{ id: 's', title: 'x' }] },
]

describe('client messages', () => {
  test.each(clientSamples)('parses $type', (msg) => {
    const result = parseClientMessage(JSON.stringify(msg))
    expect(result).toEqual({ ok: true, value: msg })
  })

  test('rejects missing required field without throwing', () => {
    const result = parseClientMessage('{"type":"session.input","id":"1"}')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('bad_request')
      expect(result.error.id).toBe('1')
    }
  })

  test('rejects invalid JSON', () => {
    expect(parseClientMessage('{oops')).toMatchObject({ ok: false, error: { code: 'bad_request' } })
  })

  test('rejects unknown type', () => {
    expect(parseClientMessage({ type: 'nope', id: '1' })).toMatchObject({
      ok: false,
      error: { code: 'unknown_type' },
    })
  })

  test('strips unknown fields', () => {
    const result = parseClientMessage({ type: 'ping', id: '1', extra: true })
    expect(result).toEqual({ ok: true, value: { type: 'ping', id: '1' } })
  })

  test('accepts any key string (the daemon enforces the allow list)', () => {
    expect(parseClientMessage({ type: 'session.key', id: '1', sessionId: 's', key: 'C-z' }).ok).toBe(true)
  })

  test('rejects an unknown device platform', () => {
    expect(parseClientMessage({ type: 'device.register', id: '1', fcmToken: 't', platform: 'web' }).ok).toBe(
      false,
    )
  })

  test('applies defaults', () => {
    const result = parseClientMessage({ type: 'files.search', id: '1', sessionId: 's', query: 'a' })
    expect(result).toMatchObject({ ok: true, value: { limit: 20 } })
  })
})

describe('server messages', () => {
  test.each(serverSamples)('parses $type', (msg) => {
    const result = parseServerMessage(JSON.stringify(msg))
    expect(result.ok).toBe(true)
  })

  test('correlates replies by replyTo', () => {
    const result = parseServerMessage({ type: 'sessions.snapshot', replyTo: 'abc', sessions: [] })
    expect(result).toMatchObject({ ok: true, value: { replyTo: 'abc' } })
  })
})

describe('session checkout', () => {
  test('defaults to null for older daemons', () => {
    const { checkout: _omit, ...old } = session
    const result = parseServerMessage({ type: 'session.updated', session: old })
    expect(result).toMatchObject({ ok: true, value: { session: { checkout: null } } })
  })

  const at = (id: string, root: string | null, patch: Partial<Session> = {}): Session => ({
    ...session,
    id,
    checkout: root ? { root, branch: 'main' } : null,
    ...patch,
  })

  test('peers are the other live sessions in the same checkout', () => {
    const me = at('a', '/w/api')
    const all = [
      me,
      at('b', '/w/api'),
      at('c', '/w/api/.claude/worktrees/remote-1'),
      at('d', '/w/api', { state: 'ended' }),
      at('e', '/w/api', { controllable: false }),
      at('f', '/w/web'),
    ]
    expect(checkoutPeers(me, all).map((s) => s.id)).toEqual(['b'])
  })

  test('no peers outside git', () => {
    expect(checkoutPeers(at('a', null), [at('a', null), at('b', null)])).toEqual([])
  })
})

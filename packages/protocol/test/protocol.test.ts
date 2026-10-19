import { describe, expect, test } from 'vitest'
import {
  type ClientMessage,
  checkoutPeers,
  LiveStatusPropsSchema,
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
  { type: 'session.input', id: '1', sessionId: 's', text: 'oi\nlinha 2 @src/a.ts', mode: 'now' },
  { type: 'session.input', id: '1', sessionId: 's', text: '', attachmentIds: ['a1', 'a2'], mode: 'now' },
  { type: 'attachment.upload', id: '1', sessionId: 's', mimeType: 'image/png', data: 'iVBORw0KGgo=' },
  { type: 'transcript.image', id: '1', sessionId: 's', agentId: 'a', imageId: '12.0' },
  { type: 'session.key', id: '1', sessionId: 's', key: 'Escape' },
  { type: 'session.setMode', id: '1', sessionId: 's', mode: 'plan' },
  {
    type: 'permission.respond',
    id: '1',
    requestId: 'r',
    decision: 'allow',
    always: { rule: 'Bash(pnpm test:*)', scope: 'project' },
  },
  {
    type: 'permission.answer',
    id: '1',
    requestId: 'r',
    answer: { kind: 'question', answers: { 'Which database?': 'Postgres, SQLite' } },
  },
  {
    type: 'permission.answer',
    id: '1',
    requestId: 'r',
    answer: { kind: 'plan', decision: 'keepPlanning', feedback: 'split step 2' },
  },
  { type: 'device.register', id: '1', fcmToken: 'tok' },
  { type: 'device.register', id: '1', fcmToken: 'tok', platform: 'android' },
  { type: 'device.unregister', id: '1', fcmToken: 'tok' },
  { type: 'app.visibility', id: '1', foreground: true },
  { type: 'push.test', id: '1', fcmToken: 'tok' },
  { type: 'live.register', id: '1', sessionId: 's', platform: 'ios', fcmToken: 'tok', activityToken: 'ab12' },
  { type: 'live.register', id: '1', sessionId: 's', platform: 'android', fcmToken: 'tok' },
  { type: 'live.unregister', id: '1', sessionId: 's' },
  { type: 'session.close', id: '1', sessionId: 's' },
  { type: 'session.close', id: '1', sessionId: 's', worktree: 'push-delete' },
  { type: 'worktree.inspect', id: '1', sessionId: 's' },
  { type: 'worktree.cleanup', id: '1', sessionId: 's', action: 'delete' },
  { type: 'session.input', id: '1', sessionId: 's', text: 'later', mode: 'auto' },
  { type: 'queue.update', id: '1', sessionId: 's', itemId: 'q1', text: 'edited' },
  { type: 'queue.remove', id: '1', sessionId: 's', itemId: 'q1' },
  { type: 'queue.sendNow', id: '1', sessionId: 's', itemId: 'q1' },
  { type: 'queue.flush', id: '1', sessionId: 's' },
  { type: 'pane.focus', id: '1', sessionId: 's' },
  { type: 'daemon.update.check', id: '1' },
  { type: 'daemon.update.check', id: '1', channel: 'development', force: true },
  { type: 'daemon.update.start', id: '1', channel: 'main' },
  {
    type: 'device.register',
    id: '1',
    fcmToken: 'tok',
    platform: 'ios',
    relay: { url: 'https://relay.example/r', grant: 'g' },
  },
  {
    type: 'live.register',
    id: '1',
    sessionId: 's',
    platform: 'ios',
    fcmToken: 'tok',
    relay: { url: 'https://relay.example/r', grant: 'g' },
  },
  {
    type: 'live.register',
    id: '1',
    sessionId: 's',
    platform: 'android',
    fcmToken: 'tok',
    palette: {
      background: '#0D0D0D',
      text: '#E8E6E3',
      textMuted: '#8A8784',
      accent: '#E8A33D',
      success: '#7FB069',
      warning: '#F3DC7A',
    },
  },
  { type: 'files.search', id: '1', sessionId: 's', query: 'src', limit: 20 },
  { type: 'commands.list', id: '1', sessionId: 's' },
  { type: 'projects.list', id: '1', profileId: 'claudin' },
  { type: 'models.list', id: '1', profileId: 'work' },
  { type: 'provider.status', id: '1', profileId: 'work' },
  { type: 'directories.list', id: '1', path: '~', limit: 200 },
  { type: 'directories.list', id: '1', path: '~/work', prefix: 'ap', hidden: true, limit: 20 },
  { type: 'session.start', id: '1', profileId: 'claudin', cwd: '/tmp' },
  { type: 'session.start', id: '1', profileId: 'claudin', cwd: '/tmp', worktree: true },
  { type: 'session.start', id: '1', profileId: 'work', cwd: '/tmp', model: 'anthropic/claude-opus-5.5' },
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
  status: { model: 'Opus 5.5', effort: 'high', context: { usedTokens: 124_000, size: 200_000, percent: 62 } },
}

const serverSamples: ServerMessage[] = [
  {
    type: 'auth.ok',
    protocolVersion: 1,
    daemonVersion: '0.1.0',
    host: 'mac',
    profiles: [],
    defaultRuleScope: 'project',
    muted: { profiles: [], sessions: [] },
    push: { mode: 'relay' },
  },
  { type: 'push.testResult', replyTo: '1', result: 'unregistered' },
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
      images: [],
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
  {
    type: 'permission.request',
    request: {
      requestId: 'r',
      sessionId: 's',
      profileId: 'claudin',
      tool: 'AskUserQuestion',
      input: {},
      suggestedRule: null,
      defaultScope: 'project',
      createdAt: 'now',
      expiresAt: 'later',
      interaction: {
        kind: 'question',
        title: null,
        questions: [
          {
            question: 'Which database?',
            header: 'DB',
            kind: 'choice',
            options: [{ label: 'Postgres', description: null }],
            multiSelect: false,
          },
        ],
      },
    },
  },
  { type: 'permission.resolved', requestId: 'r', sessionId: 's', outcome: 'expired' },
  {
    type: 'subagent.updated',
    sessionId: 's',
    subagent: {
      agentId: 'a',
      agentType: null,
      description: null,
      state: 'running',
      updatedAt: 'now',
      startedAt: null,
      toolCount: 0,
    },
  },
  { type: 'files.results', replyTo: '1', query: 'q', items: [{ path: 'src/', kind: 'dir' }] },
  {
    type: 'commands.results',
    replyTo: '1',
    items: [{ name: 'clear', description: '', source: 'builtin', interactive: false }],
  },
  {
    type: 'projects.results',
    replyTo: '1',
    items: [{ cwd: '/tmp', lastUsedAt: 'now', branch: 'main', sessions: 2 }],
  },
  {
    type: 'models.results',
    replyTo: '1',
    profileId: 'work',
    models: [
      {
        id: 'anthropic/claude-sonnet-5.5',
        name: 'Claude Sonnet 5.5',
        contextLength: 200000,
        promptPrice: 3,
        completionPrice: 15,
        tools: true,
        reasoning: true,
        caching: true,
      },
    ],
    fetchedAt: 'now',
    stale: false,
  },
  { type: 'provider.info', replyTo: '1', profileId: 'work', hasKey: true, credits: { total: 50, used: 7.9 } },
  { type: 'provider.info', replyTo: '1', profileId: 'work', hasKey: false, credits: null },
  {
    type: 'directories.results',
    replyTo: '1',
    path: '/home/me/work',
    parent: '/home/me',
    home: '/home/me',
    items: [{ name: 'api', path: '/home/me/work/api', git: true }],
    truncated: false,
  },
  {
    type: 'directories.results',
    replyTo: '1',
    path: '/home/me',
    parent: null,
    home: '/home/me',
    items: [],
    truncated: true,
  },
  { type: 'mute.updated', muted: { profiles: ['claudin'], sessions: [] } },
  {
    type: 'daemon.update.info',
    replyTo: '1',
    info: {
      current: '0.12.0',
      channel: 'main',
      checkedAt: '2026-10-19T10:00:00.000Z',
      checking: false,
      available: { version: '0.13.0', commit: 'abc1234', downgrade: false },
      blocked: null,
      busy: true,
      run: {
        channel: 'main',
        from: '0.12.0',
        to: '0.13.0',
        commit: 'abc1234',
        step: 'failed',
        error: 'build failed',
        rolledBack: true,
        startedAt: '2026-10-19T10:01:00.000Z',
        finishedAt: '2026-10-19T10:03:00.000Z',
      },
    },
  },
  {
    type: 'daemon.update.info',
    info: {
      current: '0.12.0',
      channel: 'development',
      checkedAt: null,
      checking: true,
      available: null,
      blocked: 'not-installer',
      busy: false,
      run: null,
    },
  },
  {
    type: 'limits.updated',
    limits: {
      profileId: 'claudin',
      fiveHour: { percent: 41, resetsAt: 1_792_000_000_000 },
      sevenDay: null,
      updatedAt: '2026-10-18T00:00:00Z',
    },
  },
  { type: 'checkout.info', replyTo: '1', checkout: { root: '/tmp', branch: null }, peers: [] },
  { type: 'checkout.info', replyTo: '1', checkout: null, peers: [{ id: 's', title: 'x' }] },
  { type: 'attachment.uploaded', replyTo: '1', attachmentId: 'a1' },
  { type: 'transcript.image', replyTo: '1', imageId: '12.0', mediaType: 'image/png', data: 'iVBORw0KGgo=' },
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

  test('session.input defaults to immediate delivery and refuses unknown modes', () => {
    const parsed = parseClientMessage({ type: 'session.input', id: '1', sessionId: 's', text: 'hi' })
    expect(parsed.ok && parsed.value.type === 'session.input' ? parsed.value.mode : null).toBe('now')
    expect(
      parseClientMessage({ type: 'session.input', id: '1', sessionId: 's', text: 'hi', mode: 'later' }).ok,
    ).toBe(false)
  })

  test('worktree actions are a closed set', () => {
    expect(
      parseClientMessage({ type: 'worktree.cleanup', id: '1', sessionId: 's', action: 'wipe' }),
    ).toMatchObject({
      ok: false,
      error: { code: 'bad_request' },
    })
    expect(parseClientMessage({ type: 'session.close', id: '1', sessionId: 's', worktree: 'keep' }).ok).toBe(
      false,
    )
  })

  test('live status props carry only the allowed fields', () => {
    const props = { title: 'Work', state: 'working', status: 'Working', step: '', tools: '', startedAt: 1 }
    const full = {
      ...props,
      host: 'mac',
      session: 'Fix login',
      path: '~/app',
      recent: ['Bash · running a command'],
      ago: '{time} ago',
      changedAt: 2,
      endedAt: 3,
      glyphs: ['⌘'],
      pending: { requestId: 'r1', tool: 'Bash', allow: 'Allow', deny: 'Deny' },
      hint: '',
    }
    expect(LiveStatusPropsSchema.parse({ ...full, prompt: 'secret' })).toEqual(full)
    // The pending request carries identifiers and labels only.
    expect(
      LiveStatusPropsSchema.parse({ ...full, pending: { ...full.pending, input: { command: 'rm' } } })
        .pending,
    ).toEqual(full.pending)
    expect(LiveStatusPropsSchema.safeParse({ ...props, state: 'error' }).success).toBe(false)
  })

  test('live status props carry the app palette when the registration had one', () => {
    const props = { title: 'Work', state: 'working', status: 'Working', step: '', tools: '', startedAt: 1 }
    const palette = {
      background: '#0D0D0D',
      text: '#E8E6E3',
      textMuted: '#8A8784',
      accent: '#E8A33D',
      success: '#7FB069',
      warning: '#F3DC7A',
    }
    expect(LiveStatusPropsSchema.parse({ ...props, palette }).palette).toEqual(palette)
    expect(LiveStatusPropsSchema.parse(props).palette).toBeUndefined()
    expect(
      LiveStatusPropsSchema.safeParse({ ...props, palette: { ...palette, accent: 'amber' } }).success,
    ).toBe(false)
    const register = { type: 'live.register', id: '1', sessionId: 's', platform: 'ios', fcmToken: 'tok' }
    expect(parseClientMessage({ ...register, palette })).toMatchObject({ ok: true, value: { palette } })
    expect(parseClientMessage({ ...register, palette: { accent: '#E8A33D' } }).ok).toBe(false)
  })

  test('live status props from older daemons get defaults', () => {
    const props = { title: 'Work', state: 'done', status: 'Done', step: '', tools: '', startedAt: 1 }
    expect(LiveStatusPropsSchema.parse(props)).toEqual({
      ...props,
      host: '',
      session: '',
      path: '',
      recent: [],
      ago: '',
      changedAt: 0,
      endedAt: null,
      glyphs: [],
      pending: null,
      hint: '',
    })
  })

  test('relay URLs must be HTTPS', () => {
    const msg = {
      type: 'device.register',
      id: '1',
      fcmToken: 't',
      relay: { url: 'http://relay.example', grant: 'g' },
    }
    expect(parseClientMessage(msg).ok).toBe(false)
  })

  test('rejects an unknown device platform', () => {
    expect(parseClientMessage({ type: 'device.register', id: '1', fcmToken: 't', platform: 'web' }).ok).toBe(
      false,
    )
  })

  test('rejects an attachment type Claude cannot read', () => {
    const msg = { type: 'attachment.upload', id: '1', sessionId: 's', mimeType: 'application/pdf', data: 'x' }
    expect(parseClientMessage(msg)).toMatchObject({ ok: false, error: { code: 'bad_request' } })
  })

  test('limits attachments per prompt', () => {
    const msg = {
      type: 'session.input',
      id: '1',
      sessionId: 's',
      text: '',
      attachmentIds: ['1', '2', '3', '4', '5'],
    }
    expect(parseClientMessage(msg)).toMatchObject({ ok: false, error: { code: 'bad_request' } })
  })

  test('applies defaults', () => {
    const result = parseClientMessage({ type: 'files.search', id: '1', sessionId: 's', query: 'a' })
    expect(result).toMatchObject({ ok: true, value: { limit: 20 } })
  })

  test('caps the directory listing limit', () => {
    expect(parseClientMessage({ type: 'directories.list', id: '1', path: '~' })).toMatchObject({
      ok: true,
      value: { limit: 200 },
    })
    expect(parseClientMessage({ type: 'directories.list', id: '1', path: '~', limit: 501 })).toMatchObject({
      ok: false,
      error: { code: 'bad_request' },
    })
  })

  test('daemon.update.start needs a known channel', () => {
    expect(parseClientMessage({ type: 'daemon.update.start', id: '1', channel: 'beta' })).toMatchObject({
      ok: false,
      error: { code: 'bad_request' },
    })
    expect(parseClientMessage({ type: 'daemon.update.start', id: '1' })).toMatchObject({ ok: false })
  })
})

describe('server messages', () => {
  test.each(serverSamples)('parses $type', (msg) => {
    const result = parseServerMessage(JSON.stringify(msg))
    expect(result.ok).toBe(true)
  })

  test('transcript entries without images (older daemons) get an empty list', () => {
    const base = { cursor: 1, index: 0, uuid: 'u', key: 'u:0', timestamp: null, isSidechain: false }
    const result = parseServerMessage({
      type: 'transcript.page',
      sessionId: 's',
      entries: [
        { ...base, kind: 'user', text: 'hi' },
        {
          ...base,
          index: 1,
          key: 'u:1',
          kind: 'tool_result',
          toolUseId: 't',
          content: '',
          isError: false,
          truncated: false,
        },
      ],
      hasMore: false,
      lineCount: 2,
    })
    expect(result.ok && result.value.type === 'transcript.page' && result.value.entries).toMatchObject([
      { kind: 'user', images: [] },
      { kind: 'tool_result', images: [] },
    ])
  })

  test('keeps image refs on prompts and tool results', () => {
    const ref = { id: '3.0', mediaType: 'image/png', bytes: 1024 }
    const result = parseServerMessage({
      type: 'transcript.entry',
      sessionId: 's',
      cursor: 3,
      entry: {
        cursor: 3,
        index: 0,
        uuid: 'u',
        key: 'u:0',
        timestamp: null,
        isSidechain: false,
        kind: 'user',
        text: '',
        images: [ref],
      },
    })
    expect(result).toMatchObject({ ok: true, value: { entry: { images: [ref] } } })
    expect(
      parseServerMessage({ type: 'transcript.image', replyTo: '1', imageId: '3.0', mediaType: 'image/png' })
        .ok,
    ).toBe(false)
  })

  test('correlates replies by replyTo', () => {
    const result = parseServerMessage({ type: 'sessions.snapshot', replyTo: 'abc', sessions: [] })
    expect(result).toMatchObject({ ok: true, value: { replyTo: 'abc' } })
  })
})

describe('session status', () => {
  test('defaults to null for older daemons', () => {
    const { status: _omit, ...old } = session
    const result = parseServerMessage({ type: 'session.updated', session: old })
    expect(result).toMatchObject({ ok: true, value: { session: { status: null } } })
  })

  test('unknown items are null, not zero', () => {
    const status = { model: null, effort: null, context: null }
    const result = parseServerMessage({ type: 'session.updated', session: { ...session, status } })
    expect(result).toMatchObject({ ok: true, value: { session: { status } } })
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

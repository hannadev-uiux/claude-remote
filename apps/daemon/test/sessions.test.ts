import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Profile, ServerMessage } from '@remote-harness/protocol'
import { afterEach, describe, expect, test } from 'vitest'
import { silentLogger } from '../src/core/logger.ts'
import { SessionService } from '../src/features/sessions/service.ts'
import { SessionStore } from '../src/features/sessions/store.ts'
import { extractMeta, findCustomTitle, readTranscriptMeta } from '../src/features/sessions/transcript-meta.ts'
import { TmuxClient } from '../src/infra/tmux.ts'
import { fakeExecutor, hookEvent, useTempHome } from './helpers.ts'

const home = useTempHome()
const stores: SessionStore[] = []
afterEach(() => {
  for (const store of stores.splice(0)) store.dispose()
})

function setup(panes: string[] = ['%1']) {
  const sent: ServerMessage[] = []
  const livePanes = new Set(panes)
  const exec = fakeExecutor((call) => {
    if (call.args[0] === 'list-panes') {
      return { stdout: [...livePanes].map((p) => `${p}\t1\tclaude-remote\tw\t/tmp`).join('\n') }
    }
    return undefined
  })
  const tmux = new TmuxClient(exec)
  const store = new SessionStore(
    { broadcast: (m) => sent.push(m) },
    join(home.dir(), 'state.json'),
    silentLogger,
    60_000,
  )
  stores.push(store)
  const profiles: Profile[] = [{ id: 'claudin', name: 'P', configDir: join(home.dir(), 'cfg'), color: '' }]
  const service = new SessionService(store, tmux, profiles, silentLogger, { recentDays: 7, scanCacheMs: 0 })
  return { sent, store, service, livePanes, exec, profiles }
}

describe('TmuxClient', () => {
  test('treats a missing server as no panes', async () => {
    const tmux = new TmuxClient(
      fakeExecutor(() => ({ exitCode: 1, stderr: 'no server running on /tmp/tmux-501/default' })),
    )
    expect(await tmux.listPanes()).toEqual([])
  })

  test('forces UTF-8 so -F tabs survive without a locale (launchd)', async () => {
    const exec = fakeExecutor(() => ({ stdout: '%1\t42\tcr\tw\t/p\n' }))
    expect(await new TmuxClient(exec).listPanes()).toEqual([
      { paneId: '%1', pid: 42, sessionName: 'cr', windowName: 'w', cwd: '/p' },
    ])
    expect(exec.calls[0]?.rawArgs[0]).toBe('-u')
  })

  test('pastes through a named buffer with bracketed paste', async () => {
    const exec = fakeExecutor()
    await new TmuxClient(exec).pasteText('%3', 'a\nb', 'cr-s1')
    expect(exec.calls.map((c) => c.args)).toEqual([
      ['load-buffer', '-b', 'cr-s1', '-'],
      ['paste-buffer', '-p', '-d', '-b', 'cr-s1', '-t', '%3'],
    ])
    expect(exec.calls[0]?.options?.input).toBe('a\nb')
  })
})

describe('transcript meta', () => {
  test('prefers custom title, reads cwd and mode', () => {
    const meta = extractMeta(
      [
        { type: 'custom-title', customTitle: 'Minha tarefa' },
        { type: 'permission-mode', permissionMode: 'plan' },
        { type: 'system', cwd: '/w/app' },
      ],
      [],
    )
    expect(meta).toEqual({ title: 'Minha tarefa', cwd: '/w/app', permissionMode: 'plan' })
  })

  test('falls back to the first real user prompt', () => {
    const meta = extractMeta(
      [],
      [
        { type: 'user', isMeta: true, message: { content: 'meta' } },
        { type: 'user', message: { content: '<command-name>/clear</command-name>' } },
        { type: 'user', cwd: '/w', message: { content: 'corrija   o\nbug' } },
      ],
    )
    expect(meta.title).toBe('corrija o bug')
  })

  test('reads from a file and tolerates broken lines', async () => {
    const path = join(home.dir(), 's.jsonl')
    await writeFile(path, `{"type":"user","cwd":"/w","message":{"content":"oi"}}\n{broken\n`)
    expect(await readTranscriptMeta(path)).toMatchObject({ title: 'oi', cwd: '/w' })
  })

  const filler = (kb: number) =>
    Array.from({ length: kb }, (_, i) =>
      JSON.stringify({ type: 'assistant', cwd: '/w', text: `${i}`.padEnd(1000, '.') }),
    ).join('\n')

  test('finds a name given before the last 64 KB', async () => {
    const path = join(home.dir(), 'long.jsonl')
    await writeFile(
      path,
      [
        '{"type":"user","cwd":"/w","message":{"content":"primeiro prompt"}}',
        '{"type":"custom-title","customTitle":"Nome antigo"}',
        '{"type":"custom-title","customTitle":"Nome novo"}',
        filler(200),
        '{"type":"last-prompt","lastPrompt":"último"}',
        '',
      ].join('\n'),
    )
    expect(await readTranscriptMeta(path)).toMatchObject({ title: 'Nome novo', cwd: '/w' })
  })

  test('picks up a rename appended after an earlier read', async () => {
    const path = join(home.dir(), 'grow.jsonl')
    const start = `{"type":"custom-title","customTitle":"A"}\n${filler(100)}\n`
    await writeFile(path, start)
    expect((await readTranscriptMeta(path)).title).toBe('A')
    await writeFile(path, `${start}{"type":"custom-title","customTitle":"B"}\n${filler(100)}\n`)
    expect((await readTranscriptMeta(path)).title).toBe('B')
  })

  test('keeps the prompt fallbacks for a long session never named', async () => {
    const path = join(home.dir(), 'unnamed.jsonl')
    await writeFile(
      path,
      `{"type":"user","cwd":"/w","message":{"content":"primeiro prompt"}}\n${filler(200)}\n`,
    )
    expect((await readTranscriptMeta(path)).title).toBe('primeiro prompt')
  })

  test('findCustomTitle ignores lines that only mention the marker', () => {
    expect(
      findCustomTitle(
        [
          '{"type":"custom-title","customTitle":"X"}',
          '{"type":"user","message":{"content":"\\"custom-title\\""}}',
          '{broken "custom-title"',
        ].join('\n'),
      ),
    ).toBe('X')
  })
})

describe('session state from hooks', () => {
  test('follows the hook lifecycle', async () => {
    const { service, store, sent } = setup()
    await service.handleHook(
      hookEvent(
        'SessionStart',
        { session_id: 's1', cwd: '/w/api', permission_mode: 'default' },
        { paneId: '%1' },
      ),
    )
    expect(store.get('s1')).toMatchObject({
      state: 'idle',
      controllable: true,
      paneId: '%1',
      title: 'api',
      permissionMode: 'default',
    })
    await service.handleHook(hookEvent('UserPromptSubmit', { session_id: 's1', prompt: 'rode os testes' }))
    expect(store.get('s1')).toMatchObject({ state: 'running', title: 'rode os testes' })
    await service.handleHook(
      hookEvent('Notification', { session_id: 's1', notification_type: 'permission_prompt' }),
    )
    expect(store.get('s1')?.state).toBe('waiting')
    await service.handleHook(hookEvent('Stop', { session_id: 's1' }))
    expect(store.get('s1')?.state).toBe('idle')
    await service.handleHook(hookEvent('SessionEnd', { session_id: 's1', reason: 'other' }))
    expect(store.get('s1')).toMatchObject({ state: 'ended', controllable: false, paneId: null })
    expect(sent.filter((m) => m.type === 'session.updated').length).toBe(5)
  })

  test('a new session in the same pane ends the previous one', async () => {
    const { service, store } = setup()
    await service.handleHook(hookEvent('SessionStart', { session_id: 'old', cwd: '/w' }, { paneId: '%1' }))
    await service.handleHook(
      hookEvent('SessionStart', { session_id: 'new', cwd: '/w', source: 'clear' }, { paneId: '%1' }),
    )
    expect(store.get('old')).toMatchObject({ state: 'ended', controllable: false })
    expect(store.get('new')).toMatchObject({ controllable: true })
  })

  test('sessions outside tmux are read-only', async () => {
    const { service, store } = setup()
    await service.handleHook(hookEvent('SessionStart', { session_id: 's', cwd: '/w' }))
    expect(store.get('s')?.controllable).toBe(false)
  })

  test('duplicate updates are not broadcast', async () => {
    const { service, sent } = setup()
    await service.handleHook(hookEvent('Stop', { session_id: 's', cwd: '/w' }))
    await service.handleHook(hookEvent('Stop', { session_id: 's', cwd: '/w' }))
    expect(sent).toHaveLength(1)
  })
})

describe('panes and persistence', () => {
  test('dead panes end the session', async () => {
    const { service, store, livePanes } = setup()
    await service.handleHook(hookEvent('SessionStart', { session_id: 's', cwd: '/w' }, { paneId: '%1' }))
    livePanes.clear()
    await service.reconcilePanes()
    expect(store.get('s')).toMatchObject({ state: 'ended', controllable: false, paneId: null })
  })

  test('restores links whose pane still exists', async () => {
    const first = setup(['%1', '%2'])
    await first.service.handleHook(
      hookEvent('SessionStart', { session_id: 'a', cwd: '/w/a' }, { paneId: '%1' }),
    )
    await first.service.handleHook(
      hookEvent('SessionStart', { session_id: 'b', cwd: '/w/b' }, { paneId: '%2' }),
    )
    await first.store.save()
    const second = setup(['%1'])
    await second.service.restore()
    expect(second.store.get('a')).toMatchObject({ controllable: true, paneId: '%1' })
    expect(second.store.get('b')).toBeUndefined()
  })

  test('a restart keeps each session’s last activity, so the order does not change', async () => {
    const first = setup(['%1', '%2'])
    await first.service.handleHook(
      hookEvent('SessionStart', { session_id: 'a', cwd: '/w/a' }, { paneId: '%1' }),
    )
    await first.service.handleHook(
      hookEvent('SessionStart', { session_id: 'b', cwd: '/w/b' }, { paneId: '%2' }),
    )
    // Stamps only move forward: give each session a distinct later activity.
    const later = Date.now() + 60_000
    first.store.upsert('a', { updatedAt: new Date(later).toISOString() })
    first.store.upsert('b', { updatedAt: new Date(later + 5_000).toISOString() })
    await first.store.save()
    const second = setup(['%1', '%2'])
    await second.service.restore()
    expect(second.store.get('a')?.updatedAt).toBe(new Date(later).toISOString())
    expect(second.store.get('b')?.updatedAt).toBe(new Date(later + 5_000).toISOString())
    expect(second.store.all().map((s) => s.id)).toEqual(['b', 'a'])
  })

  test('transcript activity touches updatedAt at most every 5 s and only for known sessions', async () => {
    const { service, store, sent } = setup()
    await service.handleHook(hookEvent('SessionStart', { session_id: 's', cwd: '/w' }, { paneId: '%1' }))
    // Activity stamps only move forward: start after the session's creation time.
    const t0 = Date.now() + 60_000
    const broadcasts = () => sent.filter((m) => m.type === 'session.updated').length
    const before = broadcasts()
    service.noteActivity('s', t0)
    expect(store.get('s')?.updatedAt).toBe(new Date(t0).toISOString())
    service.noteActivity('s', t0 + 2_000)
    expect(store.get('s')?.updatedAt).toBe(new Date(t0).toISOString())
    service.noteActivity('s', t0 + 5_000)
    expect(store.get('s')?.updatedAt).toBe(new Date(t0 + 5_000).toISOString())
    expect(broadcasts()).toBe(before + 2)
    service.noteActivity('ghost', t0 + 10_000)
    expect(store.get('ghost')).toBeUndefined()
  })

  test('an older stamp or a metadata refresh does not move updatedAt', async () => {
    const { service, store } = setup()
    await service.handleHook(hookEvent('SessionStart', { session_id: 's', cwd: '/w' }, { paneId: '%1' }))
    const stamp = store.get('s')!.updatedAt
    store.upsert('s', { updatedAt: '2000-01-01T00:00:00.000Z' })
    expect(store.get('s')?.updatedAt).toBe(stamp)
    store.upsert('s', { status: { model: 'Opus', effort: null, context: null }, updatedAt: stamp })
    expect(store.get('s')).toMatchObject({ status: { model: 'Opus' }, updatedAt: stamp })
  })

  test('recent transcripts appear as read-only sessions', async () => {
    const { service, store, profiles } = setup([])
    const dir = join(profiles[0]!.configDir, 'projects', '-w-api')
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'abc.jsonl'), `{"type":"user","cwd":"/w/api","message":{"content":"olá"}}\n`)
    await writeFile(join(dir, 'empty.jsonl'), '')
    await service.scanRecent(true)
    expect(store.get('abc')).toMatchObject({
      state: 'ended',
      controllable: false,
      title: 'olá',
      profileId: 'claudin',
    })
    expect(store.get('empty')).toBeUndefined()
  })
})

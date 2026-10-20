import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { silentLogger } from '../src/core/logger.ts'
import { waitForPaneSession } from '../src/features/lifecycle/index.ts'
import { LifecycleService, validateCwd, WAIT_FOR_SESSION_MS } from '../src/features/lifecycle/service.ts'
import { SessionStore } from '../src/features/sessions/store.ts'
import type { SessionRecord } from '../src/features/sessions/types.ts'
import { fakeExecutor, useTempHome } from './helpers.ts'

const home = useTempHome()

function record(id: string, patch: Partial<SessionRecord>): SessionRecord {
  return {
    id,
    profileId: 'claudin',
    cwd: '/w',
    title: '',
    state: 'ended',
    permissionMode: null,
    approvalPolicy: null,
    controllable: false,
    paneId: null,
    updatedAt: '2026-10-14T10:00:00Z',
    subagents: [],
    backgroundTasks: 0,
    checkout: null,
    status: null,
    transcriptPath: null,
    ...patch,
  }
}

async function setup() {
  const project = join(home.dir(), 'proj')
  await mkdir(project, { recursive: true })
  const exec = fakeExecutor(() => ({ stdout: '%9\n' }))
  const store = new SessionStore({ broadcast: () => {} }, join(home.dir(), 's.json'), silentLogger, 60_000)
  store.dispose()
  const service = new LifecycleService(
    exec,
    store,
    [{ id: 'claudin', name: 'P', configDir: '/c', color: '' }],
    '/bin-dir',
    home.dir(),
  )
  return { exec, store, service, project }
}

describe('validateCwd', () => {
  test('accepts directories inside home only', async () => {
    const dir = join(home.dir(), 'a')
    await mkdir(dir)
    expect(await validateCwd(dir, home.dir())).toBe(dir)
    await expect(validateCwd('/etc', home.dir())).rejects.toMatchObject({ code: 'invalid_cwd' })
    await expect(validateCwd(join(home.dir(), 'missing'), home.dir())).rejects.toMatchObject({
      code: 'invalid_cwd',
    })
    await expect(validateCwd(`${home.dir()}/../`, home.dir())).rejects.toMatchObject({ code: 'invalid_cwd' })
  })
})

describe('LifecycleService', () => {
  test('starts the profile launcher without attaching', async () => {
    const { exec, service, project } = await setup()
    expect(await service.start('claudin', project)).toEqual({ paneId: '%9', sessionId: null })
    expect(exec.calls[0]).toMatchObject({
      file: '/bin-dir/claudin',
      args: [],
      options: { cwd: project, env: { CLAUDE_REMOTE_NO_ATTACH: '1' } },
    })
    await service.start('claudin', project, { model: 'anthropic/claude-opus-5.5' })
    expect(exec.calls[1]?.args).toEqual(['--model', 'anthropic/claude-opus-5.5'])
    await expect(service.start('nope', project)).rejects.toMatchObject({ code: 'not_found' })
  })

  test('fails when Claude Code exits before the settle check', async () => {
    const { exec, store, project } = await setup()
    const alive = new Set<string>()
    const service = new LifecycleService(
      exec,
      store,
      [{ id: 'claudin', name: 'P', configDir: '/c', color: '' }],
      '/bin-dir',
      home.dir(),
      async (pane) => alive.has(pane),
      undefined,
      undefined,
      1,
    )
    await expect(service.start('claudin', project)).rejects.toMatchObject({
      code: 'internal',
      message: expect.stringContaining('exited right after starting'),
    })
    alive.add('%9')
    expect(await service.start('claudin', project)).toEqual({ paneId: '%9', sessionId: null })
  })

  test('resolves the session id once the launched pane registers', async () => {
    const { exec, store, project } = await setup()
    const waitForSession = async (paneId: string) => (paneId === '%9' ? 'new-session' : null)
    const service = new LifecycleService(
      exec,
      store,
      [{ id: 'claudin', name: 'P', configDir: '/c', color: '' }],
      '/bin-dir',
      home.dir(),
      undefined,
      undefined,
      undefined,
      0,
      waitForSession,
    )
    expect(await service.start('claudin', project)).toEqual({ paneId: '%9', sessionId: 'new-session' })
  })

  test('resolves a null session id when the wait times out', async () => {
    const { exec, store, project } = await setup()
    const waitForSession = async (_paneId: string, timeoutMs: number) => {
      expect(timeoutMs).toBe(WAIT_FOR_SESSION_MS)
      return null
    }
    const service = new LifecycleService(
      exec,
      store,
      [{ id: 'claudin', name: 'P', configDir: '/c', color: '' }],
      '/bin-dir',
      home.dir(),
      undefined,
      undefined,
      undefined,
      0,
      waitForSession,
    )
    expect(await service.start('claudin', project)).toEqual({ paneId: '%9', sessionId: null })
  })

  test('names the actual agent when a Codex profile exits before the settle check', async () => {
    const { exec, store, project } = await setup()
    const service = new LifecycleService(
      exec,
      store,
      [{ id: 'cdx', name: 'P', configDir: '/c', color: '', agent: 'codex' }],
      '/bin-dir',
      home.dir(),
      async () => false,
      undefined,
      undefined,
      1,
    )
    await expect(service.start('cdx', project)).rejects.toMatchObject({
      code: 'internal',
      message: expect.stringContaining('Codex exited right after starting'),
    })
  })

  test('reports a failing launcher in English when it prints nothing', async () => {
    const { store, project } = await setup()
    const exec = fakeExecutor(() => ({ stdout: '', exitCode: 1 }))
    const service = new LifecycleService(
      exec,
      store,
      [{ id: 'claudin', name: 'P', configDir: '/c', color: '' }],
      '/bin-dir',
      home.dir(),
    )
    await expect(service.start('claudin', project)).rejects.toMatchObject({
      code: 'internal',
      message: expect.stringContaining('launcher failed'),
    })
  })

  test('starts in a git worktree when asked, only inside a checkout', async () => {
    const { exec, store, project } = await setup()
    const checkout = async (dir: string) => (dir === project ? { root: project, branch: 'main' } : null)
    const service = new LifecycleService(
      exec,
      store,
      [{ id: 'claudin', name: 'P', configDir: '/c', color: '' }],
      '/bin-dir',
      home.dir(),
      undefined,
      checkout,
      () => new Date(2026, 9, 15, 16, 5, 0),
    )
    await service.start('claudin', project, { worktree: true })
    expect(exec.calls[0]).toMatchObject({
      args: ['--worktree', 'remote-20261015-160500'],
      options: { cwd: project },
    })
    const plain = join(home.dir(), 'plain')
    await mkdir(plain)
    await expect(service.start('claudin', plain, { worktree: true })).rejects.toMatchObject({
      code: 'bad_request',
    })
    expect(exec.calls).toHaveLength(1)
    await service.start('claudin', plain)
    expect(exec.calls[1]).toMatchObject({ args: [] })
  })

  test('resumes an ended session in its original directory', async () => {
    const { exec, store, service, project } = await setup()
    store.upsert('old', {}, () => record('old', { cwd: project }))
    await service.resume('claudin', 'old')
    expect(exec.calls[0]).toMatchObject({ args: ['--resume', 'old'], options: { cwd: project } })
    // Linked right away: a background session (`claude --bg`) is attached, and that window fires no hooks.
    expect(store.get('old')).toMatchObject({ paneId: '%9', controllable: true, state: 'idle' })
    store.upsert('live', {}, () => record('live', { cwd: project, controllable: true, paneId: '%1' }))
    await expect(service.resume('claudin', 'live')).rejects.toMatchObject({ code: 'bad_request' })
  })

  test('does not link a pane that a hook already gave to another session', async () => {
    const { store, service, project } = await setup()
    store.upsert('old', {}, () => record('old', { cwd: project }))
    store.upsert('copy', {}, () =>
      record('copy', { cwd: project, paneId: '%9', controllable: true, state: 'idle' }),
    )
    await service.resume('claudin', 'old')
    expect(store.get('old')).toMatchObject({ paneId: null, controllable: false })
  })

  test('a repeated resume reuses the pane while it is alive', async () => {
    const { exec, store, project } = await setup()
    const alive = new Set(['%9'])
    const service = new LifecycleService(
      exec,
      store,
      [{ id: 'claudin', name: 'P', configDir: '/c', color: '' }],
      '/bin-dir',
      home.dir(),
      async (pane) => alive.has(pane),
    )
    store.upsert('old', {}, () => record('old', { cwd: project }))
    expect(await service.resume('claudin', 'old')).toEqual({ paneId: '%9' })
    expect(await service.resume('claudin', 'old')).toEqual({ paneId: '%9' })
    expect(exec.calls).toHaveLength(1)
    // It was waiting when its window closed: the dead pane ends it, so the new window starts idle.
    store.upsert('old', { state: 'waiting' })
    alive.clear()
    await service.resume('claudin', 'old')
    expect(exec.calls).toHaveLength(2)
    expect(store.get('old')?.state).toBe('idle')
  })

  test('concurrent resumes launch a single window', async () => {
    const { exec, store, project } = await setup()
    const service = new LifecycleService(
      exec,
      store,
      [{ id: 'claudin', name: 'P', configDir: '/c', color: '' }],
      '/bin-dir',
      home.dir(),
      async (pane) => pane === '%9',
    )
    store.upsert('old', {}, () => record('old', { cwd: project }))
    const results = await Promise.all([service.resume('claudin', 'old'), service.resume('claudin', 'old')])
    expect(results).toEqual([{ paneId: '%9' }, { paneId: '%9' }])
    expect(exec.calls).toHaveLength(1)
  })

  test('lists recent directories per profile with the latest branch and the sessions this week', async () => {
    const { exec, store } = await setup()
    const service = new LifecycleService(
      exec,
      store,
      [{ id: 'claudin', name: 'P', configDir: '/c', color: '' }],
      '/bin-dir',
      home.dir(),
      undefined,
      undefined,
      () => new Date('2026-10-18T12:00:00Z'),
    )
    const at = (id: string, updatedAt: string, patch: Partial<SessionRecord>) =>
      store.upsert(id, { updatedAt }, () => record(id, patch))
    at('a', '2026-10-14T10:00:00Z', { cwd: '/w/a', checkout: { root: '/w/a', branch: 'old' } })
    at('b', '2026-10-14T12:00:00Z', { cwd: '/w/b' })
    at('c', '2026-10-14T13:00:00Z', { cwd: '/w/a', checkout: { root: '/w/a', branch: 'main' } })
    // A month ago: still a recent directory, not a session of this week.
    at('e', '2026-09-18T13:00:00Z', { cwd: '/w/a' })
    at('d', '2026-10-14T14:00:00Z', { cwd: '/w/x', profileId: 'other' })
    expect(service.projects('claudin')).toEqual([
      { cwd: '/w/a', lastUsedAt: '2026-10-14T13:00:00Z', branch: 'main', sessions: 2 },
      { cwd: '/w/b', lastUsedAt: '2026-10-14T12:00:00Z', branch: null, sessions: 1 },
    ])
  })
})

describe('waitForPaneSession', () => {
  test('resolves right away when a session is already linked to the pane', async () => {
    const { store } = await setup()
    store.upsert('s1', {}, () => record('s1', { paneId: '%9', controllable: true, state: 'idle' }))
    expect(await waitForPaneSession(store, '%9', 1_000)).toBe('s1')
  })

  test('resolves once a session registers against the pane mid-wait', async () => {
    const { store } = await setup()
    const pending = waitForPaneSession(store, '%9', 1_000)
    store.upsert('s2', {}, () => record('s2', { paneId: '%9', controllable: true, state: 'idle' }))
    expect(await pending).toBe('s2')
  })

  test('ignores a registration for a different pane', async () => {
    const { store } = await setup()
    const pending = waitForPaneSession(store, '%9', 50)
    store.upsert('other', {}, () => record('other', { paneId: '%1', controllable: true, state: 'idle' }))
    expect(await pending).toBeNull()
  })

  test('resolves null when nothing registers before the timeout', async () => {
    const { store } = await setup()
    expect(await waitForPaneSession(store, '%9', 50)).toBeNull()
  })
})

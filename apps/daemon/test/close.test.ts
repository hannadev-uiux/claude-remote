import { join } from 'node:path'
import type { WorktreeInfo } from '@remote-harness/protocol'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { silentLogger } from '../src/core/logger.ts'
import {
  type CloseDeps,
  CloseService,
  cleanupPlan,
  WIP_COMMIT_MESSAGE,
} from '../src/features/lifecycle/close.ts'
import { SessionStore } from '../src/features/sessions/store.ts'
import type { SessionRecord } from '../src/features/sessions/types.ts'
import { useTempHome } from './helpers.ts'

const home = useTempHome()
const stores: SessionStore[] = []
afterEach(() => {
  for (const store of stores.splice(0)) store.dispose()
})

function record(id: string, patch: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id,
    profileId: 'claudin',
    cwd: '/w/app/.claude/worktrees/remote-1',
    title: id,
    state: 'idle',
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

const worktree: WorktreeInfo = {
  path: '/w/app/.claude/worktrees/remote-1',
  branch: 'remote-1',
  mainRoot: '/w/app',
  dirty: 0,
  unpushed: 0,
}

function setup(
  options: {
    paneAlive?: () => boolean
    worktree?: WorktreeInfo | null
    /** What a later inspection sees (after a commit/push, or after the agent exited). */
    later?: WorktreeInfo | null
  } = {},
) {
  const store = new SessionStore({ broadcast: () => {} }, join(home.dir(), 's.json'), silentLogger, 60_000)
  stores.push(store)
  store.upsert('s', {}, () => record('s'))
  const tmux = {
    sendKeys: vi.fn(async () => {}),
    sendLiteral: vi.fn(async () => {}),
    hasPane: vi.fn(async () => options.paneAlive?.() ?? true),
    killPane: vi.fn(async () => {}),
  }
  let inspections = 0
  const git = {
    worktreeInfo: vi.fn(async (): Promise<WorktreeInfo | null> => {
      inspections++
      if (inspections > 1 && options.later !== undefined) return options.later
      return options.worktree === undefined ? null : options.worktree
    }),
    commitAll: vi.fn(async () => {}),
    push: vi.fn(async () => {}),
    removeWorktree: vi.fn(async () => ({ purged: Promise.resolve() })),
  }
  const denyPending = vi.fn()
  const lock = { run: <T>(_key: string, task: () => Promise<T>) => task() }
  const log = { warn: vi.fn() }
  const deps: CloseDeps = {
    store,
    tmux,
    git,
    lock,
    denyPending,
    log,
    sleep: async () => {},
    timeoutMs: 2_000,
    pollMs: 500,
  }
  return { store, tmux, git, denyPending, log, service: new CloseService(deps) }
}

describe('CloseService.close', () => {
  test('denies pending requests, sends Escape and /exit, and reports exited when the hook ends the session', async () => {
    const { service, store, tmux, denyPending } = setup()
    // The SessionEnd hook arrives while the daemon waits.
    tmux.hasPane.mockImplementation(async () => {
      store.upsert('s', { state: 'ended', controllable: false, paneId: null })
      return true
    })
    const result = await service.close('s')
    expect(result).toEqual({ closed: 'exited' })
    expect(denyPending).toHaveBeenCalledWith('s')
    expect(tmux.sendKeys.mock.calls[0]).toEqual(['%1', ['Escape']])
    expect(tmux.sendLiteral).toHaveBeenCalledWith('%1', '/exit')
    expect(tmux.sendKeys.mock.calls[1]).toEqual(['%1', ['Enter']])
    expect(tmux.killPane).not.toHaveBeenCalled()
  })

  test('a pane that disappears counts as exited and the session is marked ended', async () => {
    const { service, store, tmux } = setup({ paneAlive: () => false })
    expect(await service.close('s')).toEqual({ closed: 'exited' })
    expect(store.get('s')).toMatchObject({ state: 'ended', controllable: false, paneId: null })
    expect(tmux.killPane).not.toHaveBeenCalled()
  })

  test('kills the pane after the timeout when the agent ignores /exit', async () => {
    const { service, store, tmux } = setup()
    expect(await service.close('s')).toEqual({ closed: 'killed' })
    expect(tmux.hasPane).toHaveBeenCalledTimes(4)
    expect(tmux.killPane).toHaveBeenCalledWith('%1')
    expect(store.get('s')).toMatchObject({ state: 'ended', controllable: false, paneId: null })
  })

  test('never kills a pane another session took over', async () => {
    const { service, store, tmux } = setup()
    tmux.hasPane.mockImplementation(async () => {
      store.upsert('other', {}, () => record('other', { paneId: '%1' }))
      store.upsert('s', { paneId: null, controllable: false, state: 'ended' })
      return true
    })
    expect(await service.close('s')).toEqual({ closed: 'exited' })
    expect(tmux.killPane).not.toHaveBeenCalled()
  })

  test('refuses read-only sessions and unknown ones', async () => {
    const { service, store } = setup()
    store.upsert('s', { controllable: false, paneId: null, state: 'ended' })
    await expect(service.close('s')).rejects.toMatchObject({ code: 'not_controllable' })
    await expect(service.close('nope')).rejects.toMatchObject({ code: 'not_found' })
  })

  test('with a worktree action: closes first, then commits, pushes and removes', async () => {
    const { service, git } = setup({
      paneAlive: () => false,
      worktree: { ...worktree, dirty: 2, unpushed: 3 },
      later: worktree,
    })
    expect(await service.close('s', 'push-delete')).toEqual({ closed: 'exited', worktree: 'deleted' })
    expect(git.commitAll).toHaveBeenCalledWith(worktree.path, WIP_COMMIT_MESSAGE)
    expect(git.push).toHaveBeenCalledWith(worktree.path)
    expect(git.removeWorktree).toHaveBeenCalledWith(expect.objectContaining({ path: worktree.path }), {
      force: false,
    })
  })

  test('a failed push keeps the worktree and surfaces git’s message', async () => {
    const { service, git } = setup({ paneAlive: () => false, worktree: { ...worktree, unpushed: 1 } })
    git.push.mockRejectedValueOnce(new Error('rejected: non-fast-forward'))
    await expect(service.close('s', 'push-delete')).rejects.toMatchObject({
      code: 'internal',
      message: 'rejected: non-fast-forward',
    })
    expect(git.removeWorktree).not.toHaveBeenCalled()
  })

  test('refuses a plain delete that would lose work, before touching the session', async () => {
    const { service, tmux } = setup({ worktree: { ...worktree, dirty: 1 } })
    await expect(service.close('s', 'delete')).rejects.toMatchObject({ code: 'bad_request' })
    expect(tmux.sendLiteral).not.toHaveBeenCalled()
  })

  test('changes that appear while the agent exits stop a plain delete and keep the worktree', async () => {
    const { service, git, log } = setup({
      paneAlive: () => false,
      worktree,
      later: { ...worktree, dirty: 1 },
    })
    await expect(service.close('s', 'delete')).rejects.toMatchObject({
      code: 'bad_request',
      message: expect.stringContaining('1 modified or untracked files'),
    })
    expect(git.removeWorktree).not.toHaveBeenCalled()
    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ path: worktree.path, action: 'delete' }),
      'worktree cleanup failed',
    )
  })

  test('a failed removal is logged with the path and reaches the app with its reason', async () => {
    const { service, git, log } = setup({ paneAlive: () => false, worktree })
    git.removeWorktree.mockRejectedValueOnce(new Error('could not move the worktree folder: EPERM'))
    await expect(service.close('s', 'delete')).rejects.toMatchObject({
      code: 'internal',
      message: 'could not move the worktree folder: EPERM',
    })
    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ path: worktree.path, reason: 'could not move the worktree folder: EPERM' }),
      'worktree cleanup failed',
    )
  })

  test('a session outside a linked worktree cannot ask for cleanup', async () => {
    const { service } = setup({ worktree: null })
    await expect(service.close('s', 'delete')).rejects.toMatchObject({ code: 'bad_request' })
  })
})

describe('CloseService.cleanup', () => {
  test('only for sessions that are not running; discard removes with force', async () => {
    const { service, store, git } = setup({ worktree: { ...worktree, dirty: 4 } })
    await expect(service.cleanup('s', 'discard-delete')).rejects.toMatchObject({ code: 'session_busy' })
    store.upsert('s', { controllable: false, paneId: null, state: 'ended' })
    await service.cleanup('s', 'discard-delete')
    expect(git.commitAll).not.toHaveBeenCalled()
    expect(git.push).not.toHaveBeenCalled()
    expect(git.removeWorktree).toHaveBeenCalledWith(expect.objectContaining({ branch: 'remote-1' }), {
      force: true,
    })
  })

  test('inspect returns the worktree or null', async () => {
    const { service } = setup({ worktree })
    expect(await service.inspect('s')).toEqual(worktree)
    const none = setup({ worktree: null })
    expect(await none.service.inspect('s')).toBeNull()
  })
})

describe('cleanupPlan', () => {
  test('delete needs a clean, pushed worktree; push-delete commits only when dirty; discard forces', () => {
    expect(cleanupPlan({ dirty: 0, unpushed: 0 }, 'delete')).toEqual({
      commit: false,
      push: false,
      force: false,
    })
    expect(() => cleanupPlan({ dirty: 0, unpushed: 2 }, 'delete')).toThrow(/unpushed/)
    expect(cleanupPlan({ dirty: 0, unpushed: 2 }, 'push-delete')).toEqual({
      commit: false,
      push: true,
      force: false,
    })
    expect(cleanupPlan({ dirty: 3, unpushed: 0 }, 'push-delete')).toEqual({
      commit: true,
      push: true,
      force: false,
    })
    expect(cleanupPlan({ dirty: 3, unpushed: 2 }, 'discard-delete')).toEqual({
      commit: false,
      push: false,
      force: true,
    })
  })
})

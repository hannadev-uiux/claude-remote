import { mkdir, realpath } from 'node:fs/promises'
import { join } from 'node:path'
import type { Checkout, ServerMessage } from '@remote-harness/protocol'
import { describe, expect, test, vi } from 'vitest'
import { silentLogger } from '../src/core/logger.ts'
import { registerCheckoutFeature } from '../src/features/checkout/index.ts'
import {
  CHECKOUT_CACHE_MS,
  CheckoutResolver,
  needsCheckout,
  worktreeName,
} from '../src/features/checkout/resolver.ts'
import { SessionStore } from '../src/features/sessions/store.ts'
import type { SessionRecord } from '../src/features/sessions/types.ts'
import { execaExecutor } from '../src/infra/exec.ts'
import { GitClient } from '../src/infra/git.ts'
import type { DaemonContext } from '../src/main.ts'
import { MessageRouter } from '../src/transport/router.ts'
import { fakeConnection, fakeExecutor, useTempHome } from './helpers.ts'

const home = useTempHome()

async function git(dir: string, ...args: string[]) {
  const result = await execaExecutor('git', ['-C', dir, ...args])
  if (result.exitCode !== 0) throw new Error(result.stderr)
}

/** A real repository with one commit on `main`, inside the temp home. */
async function repo(): Promise<string> {
  const dir = await realpath(home.dir()).then((h) => join(h, 'api'))
  await mkdir(join(dir, 'src'), { recursive: true })
  await git(dir, 'init', '-q', '-b', 'main')
  await git(dir, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'init')
  return dir
}

function record(id: string, patch: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id,
    profileId: 'claudin',
    cwd: '/w',
    title: id,
    state: 'idle',
    permissionMode: null,
    controllable: true,
    paneId: '%1',
    updatedAt: '2026-10-15T10:00:00Z',
    subagents: [],
    backgroundTasks: 0,
    checkout: null,
    status: null,
    transcriptPath: null,
    ...patch,
  }
}

describe('GitClient.checkout', () => {
  test('worktree root and branch of a directory inside a repository', async () => {
    const dir = await repo()
    const git = new GitClient(execaExecutor)
    expect(await git.checkout(join(dir, 'src'))).toEqual({ root: dir, branch: 'main' })
  })

  test('a linked worktree is its own checkout', async () => {
    const dir = await repo()
    const tree = join(dir, '.claude', 'worktrees', 'remote-1')
    await git(dir, 'worktree', 'add', '-q', '-b', 'worktree-remote-1', tree)
    expect(await new GitClient(execaExecutor).checkout(tree)).toEqual({
      root: tree,
      branch: 'worktree-remote-1',
    })
  })

  test('detached HEAD has no branch; a repository without commits has one', async () => {
    const dir = await repo()
    await git(dir, 'checkout', '-q', '--detach')
    expect(await new GitClient(execaExecutor).checkout(dir)).toEqual({ root: dir, branch: null })
    const empty = join(await realpath(home.dir()), 'empty')
    await mkdir(empty)
    await git(empty, 'init', '-q', '-b', 'trunk')
    expect(await new GitClient(execaExecutor).checkout(empty)).toEqual({ root: empty, branch: 'trunk' })
  })

  test('null outside git, for a missing directory or when git fails', async () => {
    const git = new GitClient(execaExecutor)
    expect(await git.checkout(home.dir())).toBeNull()
    expect(await git.checkout(join(home.dir(), 'missing'))).toBeNull()
    const broken = new GitClient(async () => {
      throw new Error('spawn git ENOENT')
    })
    expect(await broken.checkout('/w')).toBeNull()
  })
})

describe('CheckoutResolver', () => {
  test('caches by directory for a while; fresh skips the cache', async () => {
    let now = 0
    const calls: string[] = []
    const resolver = new CheckoutResolver(
      {
        checkout: async (dir) => {
          calls.push(dir)
          return { root: dir, branch: `b${calls.length}` }
        },
      },
      1_000,
      () => now,
    )
    expect(await resolver.resolve('/w')).toEqual({ root: '/w', branch: 'b1' })
    expect(await resolver.resolve('/w')).toEqual({ root: '/w', branch: 'b1' })
    now = 1_000
    expect(await resolver.resolve('/w')).toEqual({ root: '/w', branch: 'b2' })
    expect(await resolver.resolve('/w', { fresh: true })).toEqual({ root: '/w', branch: 'b3' })
    expect(await resolver.resolve('')).toBeNull()
    expect(calls).toEqual(['/w', '/w', '/w'])
  })
})

describe('needsCheckout', () => {
  test('new session, changed directory or a new turn', () => {
    expect(needsCheckout({ cwd: '/a', state: 'idle' }, undefined)).toBe(true)
    expect(needsCheckout({ cwd: '/b', state: 'idle' }, { cwd: '/a', state: 'idle' })).toBe(true)
    expect(needsCheckout({ cwd: '/a', state: 'running' }, { cwd: '/a', state: 'idle' })).toBe(true)
    expect(needsCheckout({ cwd: '/a', state: 'running' }, { cwd: '/a', state: 'running' })).toBe(false)
    expect(needsCheckout({ cwd: '/a', state: 'waiting' }, { cwd: '/a', state: 'running' })).toBe(false)
  })
})

test('worktreeName is a valid, sortable branch and directory name', () => {
  expect(worktreeName(new Date(2026, 9, 5, 7, 3, 9))).toBe('remote-20261005-070309')
})

describe('checkout feature', () => {
  function setup(checkouts: Record<string, Checkout | null>) {
    const broadcast: ServerMessage[] = []
    const store = new SessionStore(
      { broadcast: (m) => broadcast.push(m) },
      join(home.dir(), 's.json'),
      silentLogger,
      60_000,
    )
    store.dispose()
    const router = new MessageRouter(silentLogger)
    const exec = fakeExecutor((call) => {
      const dir = call.args[1] ?? ''
      const checkout = checkouts[dir]
      if (!checkout) return { exitCode: 128, stderr: 'fatal: not a git repository' }
      if (call.args[2] === 'rev-parse') return { stdout: `${checkout.root}\n` }
      return checkout.branch ? { stdout: `${checkout.branch}\n` } : { exitCode: 1 }
    })
    const ctx = {
      exec,
      router,
      profiles: [{ id: 'claudin', name: 'P', configDir: '/c', color: '' }],
    } as unknown as DaemonContext
    registerCheckoutFeature(ctx, store, home.dir())
    return { store, router, exec, broadcast }
  }

  const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

  test('fills session.checkout without reordering the list', async () => {
    const api = { root: '/w/api', branch: 'main' }
    const { store, exec } = setup({ '/w/api/src': api, '/w/web': null })
    const created = store.upsert('a', {}, () => record('a', { cwd: '/w/api/src' }))
    store.upsert('b', {}, () => record('b', { cwd: '/w/web' }))
    await settle()
    expect(store.get('a')).toMatchObject({ checkout: api, updatedAt: created?.updatedAt })
    expect(store.get('b')?.checkout).toBeNull()
    const calls = exec.calls.length
    store.upsert('a', { title: 'renamed' })
    await settle()
    expect(exec.calls).toHaveLength(calls)
  })

  test('a new turn picks up a branch switched after the cache expired', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    try {
      const checkouts: Record<string, Checkout | null> = { '/w/api': { root: '/w/api', branch: 'main' } }
      const { store } = setup(checkouts)
      store.upsert('a', {}, () => record('a', { cwd: '/w/api' }))
      await settle()
      checkouts['/w/api'] = { root: '/w/api', branch: 'feat/x' }
      store.upsert('a', { state: 'running' })
      await settle()
      expect(store.get('a')?.checkout?.branch).toBe('main')
      store.upsert('a', { state: 'idle' })
      vi.advanceTimersByTime(CHECKOUT_CACHE_MS)
      store.upsert('a', { state: 'running' })
      await settle()
      expect(store.get('a')?.checkout?.branch).toBe('feat/x')
    } finally {
      vi.useRealTimers()
    }
  })

  test('checkout.inspect lists the live sessions in the checkout', async () => {
    const dir = join(home.dir(), 'api')
    await mkdir(dir)
    const api = { root: dir, branch: 'main' }
    const { store, router } = setup({ [dir]: api })
    store.upsert('live', {}, () => record('live', { cwd: dir, title: 'Fix login' }))
    store.upsert('ended', {}, () => record('ended', { cwd: dir, state: 'ended', controllable: false }))
    await settle()
    const conn = fakeConnection()
    await router.dispatch({ type: 'checkout.inspect', id: '1', profileId: 'claudin', cwd: dir }, conn)
    expect(conn.sent[0]).toEqual({
      type: 'checkout.info',
      replyTo: '1',
      checkout: api,
      peers: [{ id: 'live', title: 'Fix login' }],
    })
    await router.dispatch({ type: 'checkout.inspect', id: '2', profileId: 'claudin', cwd: '/etc' }, conn)
    expect(conn.sent[1]).toMatchObject({ type: 'error', code: 'invalid_cwd' })
    await router.dispatch({ type: 'checkout.inspect', id: '3', profileId: 'nope', cwd: dir }, conn)
    expect(conn.sent[2]).toMatchObject({ type: 'error', code: 'not_found' })
  })
})

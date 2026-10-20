import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { DaemonUpdateChannel, ServerMessage } from '@remote-harness/protocol'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { createLogger } from '../src/core/logger.ts'
import { SourceUpdater } from '../src/features/update/update.ts'
import type { UpdateState } from '../src/features/updates/checker.ts'
import { updateBlocker } from '../src/features/updates/index.ts'
import {
  buildUpdateInfo,
  launchRefusal,
  RemoteUpdates,
  runInProgress,
} from '../src/features/updates/remote.ts'
import {
  advanceRun,
  RunRecorder,
  readRun,
  reconcileRun,
  STALE_RUN_MS,
  startRun,
  writeRun,
} from '../src/features/updates/run.ts'
import { execaExecutor } from '../src/infra/exec.ts'
import { MessageRouter } from '../src/transport/router.ts'
import { fakeConnection, useTempHome } from './helpers.ts'

const home = useTempHome()
const logger = createLogger({ level: 'silent' })
const t0 = new Date('2026-10-19T10:00:00.000Z')
const later = (ms: number) => new Date(t0.getTime() + ms)

describe('update run record', () => {
  test('steps keep the run and only final steps get finishedAt', () => {
    const run = startRun({ channel: 'main', from: '0.12.0', now: t0 })
    expect(run).toMatchObject({ step: 'fetching', from: '0.12.0', to: null, finishedAt: null })
    const building = advanceRun(run, 'building', later(1000), { to: '0.13.0', commit: 'abc' })
    expect(building).toMatchObject({ step: 'building', to: '0.13.0', commit: 'abc', finishedAt: null })
    const failed = advanceRun(building, 'failed', later(2000), { error: 'boom', rolledBack: true })
    expect(failed).toMatchObject({ step: 'failed', rolledBack: true, finishedAt: later(2000).toISOString() })
  })

  test('a starting daemon finishes a restarting run and fails a stale one', () => {
    const run = startRun({ channel: 'main', from: '0.12.0', now: t0 })
    const restarting = advanceRun(run, 'restarting', later(1000))
    expect(reconcileRun(restarting, '0.13.0', later(5000))).toMatchObject({ step: 'done', to: '0.13.0' })
    expect(reconcileRun(run, '0.12.0', later(60_000))).toBeNull()
    expect(reconcileRun(run, '0.12.0', later(STALE_RUN_MS + 1))).toMatchObject({
      step: 'failed',
      error: 'interrupted',
    })
    expect(reconcileRun(advanceRun(run, 'done', later(1)), '0.12.0', later(STALE_RUN_MS + 1))).toBeNull()
  })

  test('the recorder continues the run the daemon started and writes every step', async () => {
    const path = join(home.dir(), 'update-run.json')
    await writeRun(path, startRun({ channel: 'development', from: '0.12.0', now: t0 }))
    const recorder = await RunRecorder.open({
      path,
      channel: 'development',
      from: '0.12.0',
      now: () => later(500),
    })
    expect(recorder.current.startedAt).toBe(t0.toISOString())
    await recorder.step('building', { to: '0.13.0' })
    expect(await readRun(path)).toMatchObject({ step: 'building', to: '0.13.0', startedAt: t0.toISOString() })

    // Another channel (or a stale record) starts a new run.
    const other = await RunRecorder.open({ path, channel: 'main', from: '0.12.0', now: () => later(600) })
    expect(other.current).toMatchObject({
      channel: 'main',
      step: 'fetching',
      startedAt: later(600).toISOString(),
    })
  })

  test('runInProgress ignores finished and stale runs', () => {
    const run = startRun({ channel: 'main', from: '0.12.0', now: t0 })
    expect(runInProgress(run, later(1000))).toBe(true)
    expect(runInProgress(run, later(STALE_RUN_MS))).toBe(false)
    expect(runInProgress(advanceRun(run, 'done', later(1)), later(2))).toBe(false)
    expect(runInProgress(null, t0)).toBe(false)
  })
})

describe('update info', () => {
  const state = (channel: DaemonUpdateChannel): UpdateState => ({
    channel,
    checkedAt: t0.toISOString(),
    available: { version: '0.13.0', commit: 'abc', downgrade: false },
    notifiedCommit: 'abc',
  })

  test('shows the check of the current channel only', () => {
    const base = { current: '0.12.0', blocked: null, busy: false, run: null }
    expect(
      buildUpdateInfo({ ...base, channel: 'main', checker: { state: state('main'), checking: false } }),
    ).toMatchObject({ checkedAt: t0.toISOString(), available: { version: '0.13.0' } })
    expect(
      buildUpdateInfo({ ...base, channel: 'development', checker: { state: state('main'), checking: true } }),
    ).toMatchObject({ checkedAt: null, available: null, checking: true })
    expect(buildUpdateInfo({ ...base, channel: 'main', checker: null })).toMatchObject({
      available: null,
      checking: false,
    })
  })

  test('the blocker follows the source and the service manager', () => {
    expect(updateBlocker({ ok: false, reason: 'not-built' }, true)).toBe('not-built')
    expect(updateBlocker({ ok: false, reason: 'not-installer', root: '/x' }, true)).toBe('not-installer')
    expect(updateBlocker({ ok: true, root: '/x' }, false)).toBe('no-service')
    expect(updateBlocker({ ok: true, root: '/x' }, true)).toBeNull()
  })
})

describe('RemoteUpdates', () => {
  afterEach(() => vi.useRealTimers())

  function setup(o: { blocked?: 'no-service' | null; available?: boolean; launch?: boolean } = {}) {
    const router = new MessageRouter(logger)
    const broadcasts: ServerMessage[] = []
    let channel: DaemonUpdateChannel = 'main'
    let failure: ((code: number | null) => void) | undefined
    const checks: boolean[] = []
    const launches: DaemonUpdateChannel[] = []
    const finished: string[] = []
    // Like the feature: set while the spawned updater runs, cleared when it exits (any code).
    let updating = false
    const runPath = join(home.dir(), 'update-run.json')
    const remote: RemoteUpdates = new RemoteUpdates({
      hub: { broadcast: (message) => broadcasts.push(message) },
      router,
      logger,
      runPath,
      current: '0.12.0',
      blocked: o.blocked ?? null,
      channel: () => channel,
      checker: () => ({
        state: {
          channel,
          checkedAt: t0.toISOString(),
          available: o.available === false ? null : { version: '0.13.0', commit: 'abc', downgrade: false },
          notifiedCommit: null,
        },
        checking: false,
      }),
      busy: () => true,
      check: async (force) => {
        checks.push(force)
      },
      saveChannel: async (next) => {
        channel = next
      },
      refusal: () =>
        launchRefusal({
          updating: updating || remote.running(),
          installer: true,
          available: o.available !== false,
        }),
      launch: (onFailure) => {
        failure = onFailure
        launches.push(channel)
        if (o.launch === false) return { ok: false, error: 'spawn node ENOENT' }
        updating = true
        return { ok: true }
      },
      onFinished: (run) => {
        updating = false
        finished.push(run.step)
      },
      pollMs: 20,
    })
    remote.register()
    const connection = fakeConnection()
    const send = async (message: Parameters<MessageRouter['dispatch']>[0]) => {
      await router.dispatch(message, connection)
      return connection.sent.at(-1)
    }
    const exit = (code: number) => {
      updating = false
      if (code !== 0) failure?.(code)
    }
    return { remote, send, broadcasts, checks, launches, finished, runPath, fail: exit, exit }
  }

  test('check saves a new channel and answers the info', async () => {
    const { send, checks } = setup()
    const reply = await send({ type: 'daemon.update.check', id: '1', channel: 'development', force: true })
    expect(reply).toMatchObject({
      type: 'daemon.update.info',
      replyTo: '1',
      info: { channel: 'development', current: '0.12.0', busy: true, available: { version: '0.13.0' } },
    })
    expect(checks).toEqual([true])
  })

  test('start records the run, launches the updater and follows the record until it finishes', async () => {
    const { send, launches, runPath, broadcasts, remote } = setup()
    const reply = await send({ type: 'daemon.update.start', id: '1', channel: 'main' })
    expect(reply).toMatchObject({
      type: 'daemon.update.info',
      info: { run: { step: 'fetching', from: '0.12.0' } },
    })
    expect(launches).toEqual(['main'])
    expect(await send({ type: 'daemon.update.start', id: '2', channel: 'main' })).toMatchObject({
      type: 'error',
      code: 'bad_request',
      message: 'an update is already running',
    })

    // The CLI writes the next steps; the daemon broadcasts them.
    const run = (await readRun(runPath))!
    await writeRun(runPath, advanceRun(run, 'building', new Date(), { to: '0.13.0' }))
    await vi.waitFor(() =>
      expect(broadcasts.at(-1)).toMatchObject({ info: { run: { step: 'building', to: '0.13.0' } } }),
    )
    await writeRun(runPath, advanceRun(run, 'failed', new Date(), { error: 'build', rolledBack: true }))
    await vi.waitFor(() => expect(broadcasts.at(-1)).toMatchObject({ info: { run: { step: 'failed' } } }))
    remote.stop()
  })

  test('an updater that dies without a record is marked failed', async () => {
    const { send, fail, runPath, broadcasts, remote } = setup()
    await send({ type: 'daemon.update.start', id: '1', channel: 'main' })
    fail(1)
    await vi.waitFor(async () =>
      expect(await readRun(runPath)).toMatchObject({ step: 'failed', error: 'updater exited (1)' }),
    )
    expect(broadcasts.at(-1)).toMatchObject({ info: { run: { step: 'failed' } } })
    remote.stop()
  })

  test('start refuses when blocked, up to date or the updater cannot start', async () => {
    expect(
      await setup({ blocked: 'no-service' }).send({ type: 'daemon.update.start', id: '1', channel: 'main' }),
    ).toMatchObject({ type: 'error', message: 'cannot update: no-service' })
    expect(
      await setup({ available: false }).send({ type: 'daemon.update.start', id: '1', channel: 'main' }),
    ).toMatchObject({ type: 'error', message: 'already up to date' })
    const broken = setup({ launch: false })
    expect(await broken.send({ type: 'daemon.update.start', id: '1', channel: 'main' })).toMatchObject({
      type: 'error',
      code: 'internal',
      message: 'could not start the updater: spawn node ENOENT',
    })
    expect(await readRun(broken.runPath)).toMatchObject({
      step: 'failed',
      error: 'could not start the updater: spawn node ENOENT',
    })
  })

  test('a refused start records no run (#225)', async () => {
    const upToDate = setup({ available: false })
    await upToDate.send({ type: 'daemon.update.start', id: '1', channel: 'main' })
    expect(await readRun(upToDate.runPath)).toBeNull()
    expect(upToDate.launches).toEqual([])
  })

  test('after an updater that exits 0 without a restart, the next update starts (#225)', async () => {
    const { send, exit, launches, runPath, finished, remote } = setup()
    await send({ type: 'daemon.update.start', id: '1', channel: 'main' })
    // The CLI found the checkout up to date: it records done and exits 0, and this daemon stays.
    const run = (await readRun(runPath))!
    await writeRun(runPath, advanceRun(run, 'done', new Date(), { to: '0.12.0', commit: 'abc' }))
    exit(0)
    await vi.waitFor(() => expect(finished).toEqual(['done']))
    expect(await send({ type: 'daemon.update.start', id: '2', channel: 'main' })).toMatchObject({
      type: 'daemon.update.info',
      info: { run: { step: 'fetching' } },
    })
    expect(launches).toEqual(['main', 'main'])
    remote.stop()
  })

  test('launchRefusal names why an update cannot start', () => {
    expect(launchRefusal({ updating: true, installer: true, available: true })).toBe('running')
    expect(launchRefusal({ updating: false, installer: false, available: true })).toBe('not-installer')
    expect(launchRefusal({ updating: false, installer: true, available: false })).toBe('nothing')
    expect(launchRefusal({ updating: false, installer: true, available: true })).toBeNull()
  })

  test('start on another channel saves it and checks before updating', async () => {
    const { send, checks, launches, remote } = setup()
    await send({ type: 'daemon.update.start', id: '1', channel: 'development' })
    expect(checks).toEqual([true])
    expect(launches).toEqual(['development'])
    remote.stop()
  })

  test('load completes a run the restart finished', async () => {
    const { remote, runPath } = setup()
    const run = startRun({ channel: 'main', from: '0.11.0', now: new Date() })
    await writeRun(runPath, advanceRun(run, 'restarting', new Date(), { to: '0.12.0' }))
    await remote.load()
    expect(remote.info().run).toMatchObject({ step: 'done', to: '0.12.0', from: '0.11.0' })
    expect(await readRun(runPath)).toMatchObject({ step: 'done' })
  })
})

describe('rollback pieces', () => {
  test('SourceUpdater reads HEAD and restores a previous commit over local changes', async () => {
    const repo = join(home.dir(), 'repo')
    const git = (...args: string[]) => execaExecutor('git', ['-C', repo, ...args])
    await mkdir(repo)
    await git('init', '-q')
    await git('config', 'user.email', 't@example.com')
    await git('config', 'user.name', 'T')
    await git('config', 'commit.gpgsign', 'false')
    await writeFile(join(repo, 'a.txt'), 'one')
    await git('add', '.')
    await git('commit', '-qm', 'one')
    const updater = new SourceUpdater(execaExecutor, repo)
    const first = await updater.head()
    await writeFile(join(repo, 'a.txt'), 'two')
    await git('commit', '-qam', 'two')
    expect(await updater.head()).not.toBe(first)
    await writeFile(join(repo, 'a.txt'), 'half-built')
    expect(await updater.restore(first ?? '')).toBe(true)
    expect(await readFile(join(repo, 'a.txt'), 'utf8')).toBe('one')
    expect(await updater.head()).toBe(first)
  })

  test('install.sh can be sourced for build_daemon without running the installer', async () => {
    const script = fileURLToPath(new URL('../../../install.sh', import.meta.url))
    const result = await execaExecutor('bash', ['-c', 'source "$1" && type -t build_daemon', 'bash', script])
    expect(result.exitCode).toBe(0)
    expect(result.stdout.trim().split('\n').at(-1)).toBe('function')
  })
})

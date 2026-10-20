import { readFileSync, writeFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, test, vi } from 'vitest'
import { loadConfig } from '../src/core/config.ts'
import { messagesFor } from '../src/core/i18n/index.ts'
import { silentLogger } from '../src/core/logger.ts'
import { paths } from '../src/core/paths.ts'
import type { FetchResult } from '../src/features/update/update.ts'
import {
  compareVersions,
  isDowngrade,
  isQuietMoment,
  underServiceManager,
  updateLabel,
} from '../src/features/updates/channel.ts'
import { CHECK_INTERVAL_MS, readUpdateState, UpdateChecker } from '../src/features/updates/checker.ts'
import { buildTrayMenu, type TrayItem, type TrayMenuState } from '../src/features/updates/menu.ts'
import { TrayHost } from '../src/features/updates/tray-host.ts'
import { runDetachedUpdate } from '../src/infra/desktop.ts'
import { spawnJsonLines, type TrayProcess, trayAssetsDir, trayCommand } from '../src/infra/tray-helper.ts'
import { fakeExecutor, useTempHome } from './helpers.ts'

const home = useTempHome()

describe('versions and moments', () => {
  test('compareVersions', () => {
    expect(compareVersions('0.10.0', '0.9.0')).toBeGreaterThan(0)
    expect(compareVersions('v1.2.3', '1.2.3')).toBe(0)
    expect(compareVersions('1.2.3-beta.1', '1.2.3')).toBe(0)
    expect(compareVersions('1.2', '1.2.1')).toBeLessThan(0)
  })

  test('updateLabel', () => {
    expect(updateLabel({ version: '0.11.0', commit: 'abcdef123' }, '0.10.0')).toBe('0.11.0')
    expect(updateLabel({ version: '0.10.0', commit: 'abcdef123' }, '0.10.0')).toBe('0.10.0 (abcdef1)')
    expect(updateLabel({ version: null, commit: 'abcdef123' }, '0.10.0')).toBe('abcdef1')
  })

  test('isDowngrade', () => {
    expect(isDowngrade('0.11.0', '0.10.0')).toBe(true)
    expect(isDowngrade('0.10.0', '0.11.0')).toBe(false)
    expect(isDowngrade('0.10.0', null)).toBe(false)
  })

  test('isQuietMoment', () => {
    const idle = [
      { id: 'a', state: 'idle' },
      { id: 'b', state: 'ended' },
    ]
    expect(isQuietMoment(idle, () => false)).toBe(true)
    expect(isQuietMoment([...idle, { id: 'c', state: 'running' }], () => false)).toBe(false)
    expect(isQuietMoment([{ id: 'c', state: 'waiting' }], () => false)).toBe(false)
    expect(isQuietMoment(idle, (id) => id === 'a')).toBe(false)
  })

  test('underServiceManager', () => {
    expect(underServiceManager({ XPC_SERVICE_NAME: 'tech.doctorx.claude-remote' })).toBe(true)
    expect(underServiceManager({ INVOCATION_ID: 'abc' })).toBe(true)
    expect(underServiceManager({ XPC_SERVICE_NAME: '0' })).toBe(false)
  })

  test('config defaults', async () => {
    const config = await loadConfig(silentLogger)
    expect(config.update).toEqual({ channel: 'main', auto: false })
    expect(config.tray).toBe(true)
  })
})

describe('buildTrayMenu', () => {
  const t = messagesFor('en-US').updates.tray
  const base: TrayMenuState = {
    version: '0.10.0',
    channel: 'main',
    auto: false,
    available: null,
    checking: false,
    updating: false,
    canUpdate: true,
    canRestart: true,
  }
  const ids = (items: TrayItem[]): string[] =>
    items.flatMap((i) => ('id' in i ? [i.id] : 'items' in i ? ids(i.items) : []))

  test('up to date', () => {
    const menu = buildTrayMenu(base, t)
    expect(menu.tooltip).toBe('Remote Harness 0.10.0')
    expect(menu.items[0]).toEqual({ id: 'status', label: 'Running · 0.10.0', enabled: false })
    expect(ids(menu.items)).toEqual([
      'status',
      'new',
      'pair',
      'docs',
      'prefs',
      'check',
      'auto',
      'channel:main',
      'channel:development',
      'logs',
      'restart',
      'doctor',
      'quit',
    ])
    const channel = menu.items.find((i) => 'type' in i && i.type === 'submenu')
    expect(channel).toMatchObject({ items: [{ checked: true }, { checked: false }] })
  })

  test('update available, older version, updating', () => {
    const available = buildTrayMenu({ ...base, available: { version: '0.11.0', downgrade: false } }, t)
    expect(available.items[0]).toMatchObject({ label: 'Update available: 0.11.0' })
    expect(available.items).toContainEqual({ id: 'update', label: 'Update now (0.11.0)', enabled: true })
    const older = buildTrayMenu({ ...base, available: { version: '0.9.0', downgrade: true } }, t)
    expect(older.items).toContainEqual({ id: 'update', label: 'Install 0.9.0 (older)', enabled: true })
    const updating = buildTrayMenu(
      { ...base, available: { version: '0.11.0', downgrade: false }, updating: true },
      t,
    )
    expect(updating.items[0]).toMatchObject({ label: 'Updating…' })
    expect(updating.items).toContainEqual({ id: 'update', label: 'Update now (0.11.0)', enabled: false })
  })

  test('development clone and no service manager', () => {
    const menu = buildTrayMenu({ ...base, canUpdate: false, canRestart: false }, t)
    expect(ids(menu.items)).toEqual(['status', 'new', 'pair', 'docs', 'prefs', 'logs', 'doctor', 'quit'])
  })

  test('translated', () => {
    const menu = buildTrayMenu(base, messagesFor('pt-BR').updates.tray)
    expect(menu.items).toContainEqual({ id: 'check', label: 'Procurar atualizações', enabled: true })
  })
})

describe('UpdateChecker', () => {
  function setup(results: FetchResult[], current = '0.10.0') {
    let now = Date.parse('2026-10-18T12:00:00Z')
    const notified: unknown[] = []
    const fetch = vi.fn(async () => results.shift() ?? { status: 'current' as const, commit: 'c0' })
    const checker = new UpdateChecker({
      fetch,
      statePath: paths.updates(),
      currentVersion: current,
      logger: silentLogger,
      onAvailable: (a) => void notified.push(a),
      now: () => now,
    })
    return { checker, fetch, notified, advance: (ms: number) => (now += ms) }
  }

  test('notifies once per commit and persists', async () => {
    const available = { status: 'available' as const, commit: 'c1', version: '0.11.0' }
    const { checker, notified, advance } = setup([available, available])
    expect((await checker.check('main')).available).toEqual({
      version: '0.11.0',
      commit: 'c1',
      downgrade: false,
    })
    advance(CHECK_INTERVAL_MS)
    await checker.check('main')
    expect(notified).toHaveLength(1)
    expect((await readUpdateState(paths.updates()))?.notifiedCommit).toBe('c1')
  })

  test('rate limits, forced checks and channel changes', async () => {
    const { checker, fetch, advance } = setup([])
    await checker.check('main')
    await checker.check('main')
    expect(fetch).toHaveBeenCalledTimes(1)
    await checker.check('main', true)
    await checker.check('main', true)
    expect(fetch).toHaveBeenCalledTimes(2)
    advance(60_000)
    await checker.check('main', true)
    await checker.check('development')
    expect(fetch).toHaveBeenCalledTimes(4)
    expect(fetch).toHaveBeenLastCalledWith('development')
  })

  test('marks downgrades and keeps the last result when the fetch fails', async () => {
    const { checker, advance } = setup(
      [
        { status: 'available', commit: 'c9', version: '0.9.0' },
        { status: 'failed', error: 'offline' },
      ],
      '0.10.0',
    )
    expect((await checker.check('main')).available?.downgrade).toBe(true)
    advance(CHECK_INTERVAL_MS)
    expect((await checker.check('main')).available?.commit).toBe('c9')
  })

  test('loads the saved state', async () => {
    const { checker } = setup([{ status: 'available', commit: 'c1', version: '0.11.0' }])
    await checker.check('main')
    const again = setup([])
    await again.checker.load()
    expect(again.checker.state.available?.commit).toBe('c1')
    expect(again.checker.due('main')).toBe(false)
  })

  test('a saved offer of the commit already checked out is dropped on load (#225)', async () => {
    const { checker } = setup([{ status: 'available', commit: 'c1', version: '0.11.0' }])
    await checker.check('main')
    const updated = new UpdateChecker({
      fetch: async () => ({ status: 'current', commit: 'c1' }),
      head: async () => 'c1',
      statePath: paths.updates(),
      currentVersion: '0.11.0',
      logger: silentLogger,
      onAvailable: () => undefined,
    })
    await updated.load()
    expect(updated.state.available).toBeNull()
    expect((await readUpdateState(paths.updates()))?.available).toBeNull()
  })

  test('a saved offer of another commit stays on load', async () => {
    const { checker } = setup([{ status: 'available', commit: 'c1', version: '0.11.0' }])
    await checker.check('main')
    const behind = new UpdateChecker({
      fetch: async () => ({ status: 'current', commit: 'c0' }),
      head: async () => 'c0',
      statePath: paths.updates(),
      currentVersion: '0.10.0',
      logger: silentLogger,
      onAvailable: () => undefined,
    })
    await behind.load()
    expect(behind.state.available?.commit).toBe('c1')
  })

  test('recheck runs now, past the rate limit of forced checks', async () => {
    const { checker, fetch } = setup([
      { status: 'available', commit: 'c1', version: '0.11.0' },
      { status: 'current', commit: 'c1' },
    ])
    await checker.check('main', true)
    expect(checker.state.available?.commit).toBe('c1')
    expect((await checker.recheck('main')).available).toBeNull()
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})

function fakeProcess() {
  const sent: object[] = []
  let message: (m: unknown) => void = () => {}
  let exit: (code: number | null, early: boolean) => void = () => {}
  const process: TrayProcess & { sent: object[] } = {
    sent,
    send: (m) => sent.push(m),
    onMessage: (fn) => {
      message = fn
    },
    onExit: (fn) => {
      exit = fn
    },
    stop: vi.fn(),
  }
  return {
    process,
    click: (id: string, value?: string) => message({ type: 'click', id, ...(value ? { value } : {}) }),
    ready: (windows: boolean) => message({ type: 'ready', windows }),
    exit: (early: boolean) => exit(1, early),
  }
}

describe('TrayHost', () => {
  const menu = { type: 'menu' as const, tooltip: 'x', icon: 'idle' as const, items: [] }

  test('sends the menu and reports clicks', async () => {
    const fake = fakeProcess()
    const clicks: string[] = []
    const host = new TrayHost(
      async () => fake.process,
      (id) => clicks.push(id),
      silentLogger,
    )
    host.update(menu)
    await host.launch()
    expect(fake.process.sent).toEqual([menu])
    fake.click('check')
    expect(clicks).toEqual(['check'])
    host.stop()
    expect(fake.process.stop).toHaveBeenCalled()
  })

  test('reports a click value and whether the helper supports windows', async () => {
    const fake = fakeProcess()
    const clicks: [string, string | undefined][] = []
    const ready: boolean[] = []
    const host = new TrayHost(
      async () => fake.process,
      (id, value) => clicks.push([id, value]),
      silentLogger,
      undefined,
      (windows) => ready.push(windows),
    )
    await host.launch()
    fake.ready(true)
    expect(ready).toEqual([true])
    fake.click('rename:a', 'New name')
    fake.click('check')
    expect(clicks).toEqual([
      ['rename:a', 'New name'],
      ['check', undefined],
    ])
  })

  test('stays headless after an early exit, retries a later crash', async () => {
    vi.useFakeTimers()
    try {
      const fakes = [fakeProcess(), fakeProcess(), fakeProcess()]
      let started = 0
      const host = new TrayHost(
        async () => fakes[started++]!.process,
        () => {},
        silentLogger,
        10,
      )
      await host.launch()
      fakes[0]!.exit(false)
      await vi.advanceTimersByTimeAsync(10)
      expect(started).toBe(2)
      fakes[1]!.exit(true)
      await vi.advanceTimersByTimeAsync(1000)
      expect(started).toBe(2)
      expect(host.running).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('tray helper process', () => {
  test('JSON lines both ways with a fake helper', async () => {
    const script = join(home.dir(), 'helper.mjs')
    await writeFile(
      script,
      `import { createInterface } from 'node:readline'
console.log(JSON.stringify({ type: 'ready' }))
createInterface({ input: process.stdin }).on('line', (line) => {
  const menu = JSON.parse(line)
  console.log(JSON.stringify({ type: 'click', id: menu.items[0].id }))
})
`,
    )
    const helper = spawnJsonLines(process.execPath, [script], { earlyMs: 0 })
    const messages: unknown[] = []
    helper.onMessage((m) => messages.push(m))
    const exited = new Promise<boolean>((resolve) => helper.onExit((_code, early) => resolve(early)))
    helper.send({ type: 'menu', tooltip: '', items: [{ id: 'check', label: 'Check' }] })
    for (let i = 0; i < 100 && messages.length < 2; i++) await new Promise((r) => setTimeout(r, 20))
    expect(messages).toEqual([{ type: 'ready' }, { type: 'click', id: 'check' }])
    helper.stop()
    expect(await exited).toBe(false)
  })

  test('where the helper comes from', async () => {
    const assetsDir = trayAssetsDir()
    expect(assetsDir).not.toBeNull()
    const exec = fakeExecutor()
    const linux = {
      platform: 'linux' as const,
      wsl: false,
      exec,
      assetsDir,
      buildDir: join(home.dir(), 'tray'),
    }
    expect(await trayCommand({ ...linux, env: {} })).toEqual({ unavailable: 'no graphical session' })
    expect(await trayCommand({ ...linux, wsl: true, env: { DISPLAY: ':0' } })).toEqual({
      unavailable: 'no tray in WSL',
    })
    expect(await trayCommand({ ...linux, env: { WAYLAND_DISPLAY: 'wayland-0' } })).toEqual({
      command: 'python3',
      args: [join(assetsDir!, 'linux', 'tray.py')],
    })
    const failing = fakeExecutor(() => ({ exitCode: 1, stderr: 'no swiftc' }))
    expect(await trayCommand({ ...linux, platform: 'darwin', exec: failing, env: {} })).toEqual({
      unavailable: 'swiftc failed: no swiftc',
    })
  })

  test('compiles the macOS helper once', async () => {
    const assetsDir = trayAssetsDir()
    const exec = fakeExecutor((call) => {
      writeFileSync(call.args[3]!, '#!/bin/sh\n')
      return undefined
    })
    const o = {
      platform: 'darwin' as const,
      wsl: false,
      env: {},
      exec,
      assetsDir,
      buildDir: join(home.dir(), 'tray'),
    }
    const first = await trayCommand(o)
    const second = await trayCommand(o)
    expect(first).toEqual(second)
    expect(first).toMatchObject({ command: expect.stringMatching(/RemoteHarnessTray-[0-9a-f]{12}$/) })
    expect(exec.calls.filter((c) => c.file === 'swiftc')).toHaveLength(1)
  })
})

describe('runDetachedUpdate', () => {
  test('runs `update --ref <channel>` detached, logging to a new folder, and reports the exit', async () => {
    const cli = join(home.dir(), 'cli.mjs')
    await writeFile(cli, 'console.log(process.argv.slice(2).join(" ")); process.exit(3)\n')
    const logFile = join(home.dir(), 'logs', 'update.log')
    const code = await new Promise<number | null>((resolve) =>
      runDetachedUpdate({
        nodePath: process.execPath,
        cliPath: cli,
        ref: 'development',
        logFile,
        systemdRun: false,
        onExit: resolve,
      }),
    )
    expect(code).toBe(3)
    expect(readFileSync(logFile, 'utf8')).toBe('update --ref development\n')
  })
})

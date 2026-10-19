import type { SessionState } from '@remote-harness/protocol'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { ConfigSchema } from '../src/core/config.ts'
import { createLogger } from '../src/core/logger.ts'
import { KeepAwakeController } from '../src/features/power/index.ts'
import { isActive, KEEP_AWAKE_GRACE_MS, keepAwakeDecision } from '../src/features/power/policy.ts'
import { ProcessSleepInhibitor, type SleepInhibitor, sleepHelperCommand } from '../src/infra/power.ts'

const logger = createLogger({ level: 'silent' })

describe('keep awake policy', () => {
  test('a running or waiting session is active; idle and ended are not', () => {
    const of = (...states: SessionState[]) => states.map((state) => ({ state }))
    expect(isActive(of('idle', 'running'))).toBe(true)
    expect(isActive(of('waiting'))).toBe(true)
    expect(isActive(of('idle', 'ended'))).toBe(false)
    expect(isActive([])).toBe(false)
  })

  test('off never holds and always holds', () => {
    const base = { active: true, lastActiveAt: 0, now: 0 }
    expect(keepAwakeDecision({ ...base, mode: 'off' })).toEqual({ hold: false, recheckInMs: null })
    expect(keepAwakeDecision({ ...base, mode: 'always', active: false, lastActiveAt: null })).toEqual({
      hold: true,
      recheckInMs: null,
    })
  })

  test('sessions holds while active, then for the grace period after the last activity', () => {
    const mode = 'sessions'
    expect(keepAwakeDecision({ mode, active: true, lastActiveAt: 0, now: 0 })).toEqual({
      hold: true,
      recheckInMs: null,
    })
    expect(keepAwakeDecision({ mode, active: false, lastActiveAt: null, now: 0 })).toEqual({
      hold: false,
      recheckInMs: null,
    })
    expect(keepAwakeDecision({ mode, active: false, lastActiveAt: 1000, now: 61_000 })).toEqual({
      hold: true,
      recheckInMs: KEEP_AWAKE_GRACE_MS - 60_000,
    })
    expect(
      keepAwakeDecision({ mode, active: false, lastActiveAt: 1000, now: 1000 + KEEP_AWAKE_GRACE_MS }),
    ).toEqual({ hold: false, recheckInMs: null })
  })

  test('the config defaults to sessions and rejects unknown modes', () => {
    const profiles = [{ id: 'p', name: 'P', configDir: '~/.claude', color: '#D97757' }]
    expect(ConfigSchema.parse({ profiles }).keepAwake).toBe('sessions')
    expect(ConfigSchema.safeParse({ profiles, keepAwake: 'never' }).success).toBe(false)
  })
})

describe('sleep helper commands', () => {
  test('macOS: caffeinate prevents idle sleep until the daemon exits', () => {
    expect(sleepHelperCommand({ platform: 'darwin', wsl: false, pid: 42, why: 'x' })).toEqual({
      helper: 'caffeinate',
      command: 'caffeinate',
      args: ['-i', '-w', '42'],
      stdinBound: false,
    })
  })

  test('Linux: systemd-inhibit blocks idle and sleep while cat reads the daemon pipe', () => {
    const cmd = sleepHelperCommand({ platform: 'linux', wsl: false, pid: 42, why: 'Sessions running' })
    expect(cmd.command).toBe('systemd-inhibit')
    expect(cmd.args).toEqual([
      '--what=idle:sleep',
      '--who=Remote Harness',
      '--why=Sessions running',
      '--mode=block',
      'cat',
    ])
    expect(cmd.stdinBound).toBe(true)
  })

  test('WSL: PowerShell holds ES_CONTINUOUS | ES_SYSTEM_REQUIRED until stdin closes', () => {
    const cmd = sleepHelperCommand({ platform: 'linux', wsl: true, pid: 42, why: 'x' })
    expect(cmd).toMatchObject({ helper: 'windows', command: 'powershell.exe', stdinBound: true })
    const script = cmd.args.at(-1) ?? ''
    expect(script).toContain('SetThreadExecutionState([uint32]2147483649)')
    expect(script).toContain('[Console]::In.ReadLine()')
    expect(0x80000001).toBe(2147483649)
  })
})

describe('ProcessSleepInhibitor', () => {
  const cmd = (script: string) => ({
    helper: 'caffeinate' as const,
    command: '/bin/sh',
    args: ['-c', script],
    stdinBound: true,
  })

  test('a helper that exits at once is reported unavailable with its error', async () => {
    const inhibitor = new ProcessSleepInhibitor(cmd('echo "not allowed" >&2; exit 1'), 300)
    expect(await inhibitor.acquire()).toEqual({ ok: false, reason: 'not allowed' })
    expect(inhibitor.holding).toBe(false)
    const missing = new ProcessSleepInhibitor({ ...cmd(''), command: '/nonexistent/helper' }, 300)
    expect((await missing.acquire()).ok).toBe(false)
  })

  test('holds while the helper runs, ends it on release and reports a helper that dies', async () => {
    const inhibitor = new ProcessSleepInhibitor(cmd('cat >/dev/null'), 200)
    expect(await inhibitor.acquire()).toEqual({ ok: true })
    expect(inhibitor.holding).toBe(true)
    inhibitor.release()
    expect(inhibitor.holding).toBe(false)

    const dying = new ProcessSleepInhibitor(cmd('sleep 0.4'), 100)
    const lost = vi.fn()
    dying.onLost(lost)
    expect(await dying.acquire()).toEqual({ ok: true })
    await vi.waitFor(() => expect(lost).toHaveBeenCalledOnce(), { timeout: 2000 })
    expect(dying.holding).toBe(false)
  })
})

/** Records acquire/release; `fail` makes acquire report the helper as unavailable. */
function fakeInhibitor(fail?: string): SleepInhibitor & { calls: string[]; lose(): void } {
  let holding = false
  const lost: Array<() => void> = []
  const calls: string[] = []
  return {
    helper: 'caffeinate',
    calls,
    get holding() {
      return holding
    },
    async acquire() {
      calls.push('acquire')
      if (fail) return { ok: false, reason: fail }
      holding = true
      return { ok: true }
    },
    release() {
      calls.push('release')
      holding = false
    },
    onLost: (listener) => lost.push(listener),
    lose() {
      holding = false
      for (const listener of lost) listener()
    },
  }
}

describe('KeepAwakeController', () => {
  afterEach(() => vi.useRealTimers())

  test('holds while a session runs, keeps the grace period and releases after it', async () => {
    vi.useFakeTimers()
    let states: SessionState[] = ['idle']
    const inhibitor = fakeInhibitor()
    const controller = new KeepAwakeController({
      inhibitor,
      mode: 'sessions',
      sessions: () => states.map((state) => ({ state })),
      logger,
      now: () => Date.now(),
      graceMs: 60_000,
    })
    await controller.evaluate()
    expect(inhibitor.calls).toEqual([])

    states = ['running']
    await controller.evaluate()
    expect(controller.state()).toEqual({
      mode: 'sessions',
      holding: true,
      available: true,
      helper: 'caffeinate',
    })

    // A long turn: the grace starts when it ends, not when it started.
    vi.advanceTimersByTime(30 * 60_000)
    states = ['idle']
    await controller.evaluate()
    expect(inhibitor.holding).toBe(true)
    await vi.advanceTimersByTimeAsync(59_000)
    expect(inhibitor.holding).toBe(true)
    await vi.advanceTimersByTimeAsync(2_000)
    expect(inhibitor.holding).toBe(false)
    expect(inhibitor.calls).toEqual(['acquire', 'release'])
  })

  test('switching to off releases at once; a failed helper is reported and retried after a mode change', async () => {
    const inhibitor = fakeInhibitor()
    const controller = new KeepAwakeController({ inhibitor, mode: 'always', sessions: () => [], logger })
    await controller.evaluate()
    expect(inhibitor.holding).toBe(true)
    await controller.setMode('off')
    expect(inhibitor.holding).toBe(false)

    const broken = fakeInhibitor('polkit refused')
    const failing = new KeepAwakeController({ inhibitor: broken, mode: 'always', sessions: () => [], logger })
    await failing.evaluate()
    await failing.evaluate()
    expect(broken.calls).toEqual(['acquire'])
    expect(failing.state()).toMatchObject({ available: false, reason: 'polkit refused', holding: false })
    await failing.setMode('always')
    expect(broken.calls).toEqual(['acquire', 'acquire'])
  })

  test('re-acquires a helper that died and releases on stop', async () => {
    vi.useFakeTimers()
    const inhibitor = fakeInhibitor()
    const controller = new KeepAwakeController({ inhibitor, mode: 'always', sessions: () => [], logger })
    await controller.evaluate()
    inhibitor.lose()
    expect(inhibitor.holding).toBe(false)
    await vi.advanceTimersByTimeAsync(30_000)
    expect(inhibitor.holding).toBe(true)
    controller.stop()
    expect(inhibitor.holding).toBe(false)
    await controller.evaluate()
    expect(inhibitor.holding).toBe(false)
  })

  test('without an inhibitor (development runs) it only reports the mode', async () => {
    const controller = new KeepAwakeController({
      inhibitor: null,
      mode: 'always',
      sessions: () => [],
      logger,
    })
    await controller.evaluate()
    expect(controller.state()).toEqual({ mode: 'always', holding: false, available: false, helper: null })
  })
})

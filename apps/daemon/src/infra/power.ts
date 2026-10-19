import { type ChildProcess, spawn } from 'node:child_process'
import type { Platform } from './platform.ts'

/** OS helper that holds the "no idle sleep" assertion while it runs. */
export type SleepHelper = 'caffeinate' | 'systemd-inhibit' | 'windows'

export type HelperCommand = {
  helper: SleepHelper
  command: string
  args: string[]
  /** The helper exits when its stdin closes, so it dies with the daemon. */
  stdinBound: boolean
}

/** ES_CONTINUOUS | ES_SYSTEM_REQUIRED, held until the process exits (stdin closed). */
const WINDOWS_SCRIPT = [
  `$t = Add-Type -Name P -Namespace RemoteHarness -PassThru -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint f);'`,
  '[void]$t::SetThreadExecutionState([uint32]2147483649)',
  'while ($null -ne [Console]::In.ReadLine()) {}',
].join('; ')

/**
 * The helper of this platform: `caffeinate` (macOS, ends with the daemon pid), `systemd-inhibit`
 * (Linux) or PowerShell's `SetThreadExecutionState` (WSL, on the Windows host). Idle sleep only:
 * the display may still turn off and the screen still locks.
 */
export function sleepHelperCommand(o: {
  platform: Platform
  wsl: boolean
  pid: number
  why: string
}): HelperCommand {
  if (o.platform === 'darwin') {
    return {
      helper: 'caffeinate',
      command: 'caffeinate',
      args: ['-i', '-w', String(o.pid)],
      stdinBound: false,
    }
  }
  if (o.wsl) {
    return {
      helper: 'windows',
      command: 'powershell.exe',
      args: ['-NoProfile', '-NonInteractive', '-Command', WINDOWS_SCRIPT],
      stdinBound: true,
    }
  }
  return {
    helper: 'systemd-inhibit',
    command: 'systemd-inhibit',
    args: ['--what=idle:sleep', '--who=Remote Harness', `--why=${o.why}`, '--mode=block', 'cat'],
    stdinBound: true,
  }
}

export interface SleepInhibitor {
  readonly helper: SleepHelper
  /** Starts the helper; false (with the reason) when it exits right away or cannot start. */
  acquire(): Promise<{ ok: true } | { ok: false; reason: string }>
  release(): void
  readonly holding: boolean
  /** Called when a held helper ends on its own (killed, crashed). */
  onLost(listener: () => void): void
}

/** Runs the helper as a child process; holding = the child is alive. */
export class ProcessSleepInhibitor implements SleepInhibitor {
  private child: ChildProcess | null = null
  private readonly lost = new Set<() => void>()

  constructor(
    private readonly cmd: HelperCommand,
    private readonly startupMs = 1000,
  ) {}

  get helper(): SleepHelper {
    return this.cmd.helper
  }

  get holding(): boolean {
    return this.child !== null
  }

  onLost(listener: () => void): void {
    this.lost.add(listener)
  }

  acquire(): Promise<{ ok: true } | { ok: false; reason: string }> {
    if (this.child) return Promise.resolve({ ok: true })
    return new Promise((resolve) => {
      let settled = false
      let stderr = ''
      const settle = (result: { ok: true } | { ok: false; reason: string }) => {
        if (settled) return
        settled = true
        resolve(result)
      }
      const child = spawn(this.cmd.command, this.cmd.args, {
        stdio: [this.cmd.stdinBound ? 'pipe' : 'ignore', 'ignore', 'pipe'],
      })
      child.stdin?.on('error', () => undefined)
      child.stderr?.on('data', (chunk: Buffer) => {
        stderr = `${stderr}${chunk.toString()}`.slice(-500)
      })
      const timer = setTimeout(() => {
        this.child = child
        settle({ ok: true })
      }, this.startupMs)
      const fail = (reason: string) => {
        clearTimeout(timer)
        const held = this.child === child
        if (held) this.child = null
        if (!settled) settle({ ok: false, reason })
        else if (held) for (const listener of this.lost) listener()
      }
      child.on('error', (error) => fail(error.message))
      child.on('exit', (code, signal) => fail(stderr.trim() || `exited (${signal ?? code})`))
    })
  }

  release(): void {
    const child = this.child
    if (!child) return
    this.child = null
    child.stdin?.end()
    child.kill()
  }
}

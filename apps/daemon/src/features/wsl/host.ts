import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { type NetworkInterfaceInfo, networkInterfaces, tmpdir } from 'node:os'
import { join, posix } from 'node:path'
import type { Executor } from '../../infra/exec.ts'
import { writeFileAtomic } from '../../infra/fs.ts'
import { systemdIsPid1, type WslInfo } from '../../infra/platform.ts'
import { BACKUP_SUFFIX } from '../hooks/installer.ts'
import { LogonTask } from './logon-task.ts'
import {
  enableMirroredNetworking,
  findWslTailscale,
  parseCmdEcho,
  type WslTailscale,
  wslNetworkingMode,
} from './networking.ts'
import {
  displayCommand,
  enableSystemdInWslConf,
  WSL_CONF,
  wslConfHasSystemd,
  wslConfSudoArgs,
} from './wsl-conf.ts'

async function readTextOrNull(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

export type WslHostOptions = {
  wsl: WslInfo
  /** `/etc/wsl.conf` (tests point it at a temp file). */
  wslConfPath?: string
  systemdRunning?: () => boolean
  interfaces?: () => NodeJS.Dict<NetworkInterfaceInfo[]>
}

export type SystemdEnableResult =
  | { status: 'unchanged' }
  | { status: 'written' }
  | { status: 'failed'; error: string }

/**
 * Everything the setup, `doctor` and `service` need inside WSL2: systemd in `/etc/wsl.conf`, the Windows
 * `.wslconfig` networking mode and the logon task. Windows tools are reached through interop
 * (`cmd.exe`, `wslpath`, `schtasks.exe`) via the injected executor.
 */
export class WslHost {
  readonly distro: string | null
  readonly logonTask: LogonTask
  readonly wslConfPath: string

  constructor(
    private readonly exec: Executor,
    private readonly o: WslHostOptions,
  ) {
    this.distro = o.wsl.distro
    this.logonTask = new LogonTask(exec, o.wsl.distro)
    this.wslConfPath = o.wslConfPath ?? WSL_CONF
  }

  /** systemd is PID 1 (WSL booted it); without it there are no user units. */
  systemdRunning(): boolean {
    return (this.o.systemdRunning ?? systemdIsPid1)()
  }

  /** `[boot] systemd=true` is already in `/etc/wsl.conf` (it takes effect after `wsl --shutdown`). */
  async systemdConfigured(): Promise<boolean> {
    return wslConfHasSystemd(await readTextOrNull(this.wslConfPath))
  }

  /** The command `enableSystemd` runs, for the user to see before agreeing. */
  async systemdCommand(): Promise<string> {
    const current = await readTextOrNull(this.wslConfPath)
    return displayCommand('sudo', wslConfSudoArgs('<merged wsl.conf>', this.wslConfPath, current !== null))
  }

  /**
   * Merges `[boot] systemd=true` into `/etc/wsl.conf` with sudo (backup + temp file + rename).
   * Only after the user agreed: sudo may ask for the password on the terminal.
   */
  async enableSystemd(): Promise<SystemdEnableResult> {
    const current = await readTextOrNull(this.wslConfPath)
    const next = enableSystemdInWslConf(current)
    if (next === current) return { status: 'unchanged' }
    const dir = await mkdtemp(join(tmpdir(), 'claude-remote-'))
    try {
      const merged = join(dir, 'wsl.conf')
      await writeFile(merged, next)
      const result = await this.exec('sudo', wslConfSudoArgs(merged, this.wslConfPath, current !== null), {
        timeoutMs: 300_000,
      })
      if (result.exitCode !== 0)
        return { status: 'failed', error: result.stderr.trim() || `exit ${result.exitCode}` }
      return { status: 'written' }
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  }

  /** `%UserProfile%` as a Linux path (`/mnt/c/Users/me`), or null when interop is unavailable. */
  async windowsHome(): Promise<string | null> {
    const echo = await this.exec('cmd.exe', ['/c', 'echo', '%UserProfile%'], { cwd: '/' })
    const windowsPath = echo.exitCode === 0 ? parseCmdEcho(echo.stdout) : null
    if (!windowsPath) return null
    const converted = await this.exec('wslpath', ['-u', windowsPath])
    const path = converted.stdout.trim()
    return converted.exitCode === 0 && path ? path : null
  }

  async wslconfigPath(): Promise<string | null> {
    const home = await this.windowsHome()
    return home ? posix.join(home, '.wslconfig') : null
  }

  /** `nat` (default), `mirrored`…; null when `.wslconfig` cannot be located. */
  async networkingMode(): Promise<string | null> {
    const path = await this.wslconfigPath()
    return path ? wslNetworkingMode(await readTextOrNull(path)) : null
  }

  tailscale(mode: string | null): WslTailscale | null {
    return findWslTailscale((this.o.interfaces ?? networkInterfaces)(), mode ?? 'nat')
  }

  /**
   * Merges `[wsl2] networkingMode=mirrored` into `.wslconfig`: read → merge → backup → atomic write.
   * Null when `.wslconfig` cannot be located; `changed: false` when it was already set.
   */
  async enableMirroredNetworking(): Promise<{ path: string; changed: boolean } | null> {
    const path = await this.wslconfigPath()
    if (!path) return null
    const current = await readTextOrNull(path)
    const next = enableMirroredNetworking(current)
    if (next === current) return { path, changed: false }
    if (current !== null) await copyFile(path, `${path}${BACKUP_SUFFIX}`)
    await writeFileAtomic(path, next)
    return { path, changed: true }
  }
}

import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import type { Executor } from '../../infra/exec.ts'
import { writeFileAtomic } from '../../infra/fs.ts'
import {
  dedupePath,
  type Linger,
  type ServiceInstallOptions,
  type ServiceManager,
  type ServiceStatus,
} from './service-manager.ts'

export const SYSTEMD_UNIT = 'claude-remote.service'

export function unitPath(home: string): string {
  return join(home, '.config', 'systemd', 'user', SYSTEMD_UNIT)
}

/** Quoted value for unit files: escapes `\\`, `"` and specifiers (`%`). */
function quote(value: string): string {
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('%', '%%')}"`
}

/** Like `quote`, plus `$$` so `ExecStart=` does not expand variables. */
function quoteArg(value: string): string {
  return quote(value).replaceAll('$', '$$$$')
}

export type UnitOptions = {
  nodePath: string
  cliPath: string
  logsDir: string
  /** PATH captured from the installing shell so tmux, git, rg and claude resolve under systemd. */
  path: string
  home: string
}

/** systemd user unit: always restarted, logs appended under `logsDir`, started with the user manager. */
export function renderSystemdUnit(o: UnitOptions): string {
  const log = (name: string) => join(o.logsDir, name).replaceAll('%', '%%')
  return `[Unit]
Description=Remote Harness daemon
StartLimitIntervalSec=0

[Service]
Type=simple
ExecStart=${quoteArg(o.nodePath)} ${quoteArg(o.cliPath)} start --wait-tailscale
Environment=${quote(`PATH=${dedupePath(o.path)}`)}
Environment=${quote(`HOME=${o.home}`)}
WorkingDirectory=${o.home.replaceAll('%', '%%')}
Restart=always
RestartSec=10
StandardOutput=append:${log('daemon.log')}
StandardError=append:${log('daemon.err.log')}

[Install]
WantedBy=default.target
`
}

/** `KEY=value` lines of `systemctl show` into a record. */
export function parseShow(stdout: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of stdout.split('\n')) {
    const eq = line.indexOf('=')
    if (eq > 0) out[line.slice(0, eq)] = line.slice(eq + 1).trim()
  }
  return out
}

/** Linux: a systemd user unit managed with `systemctl --user`; lingering through `loginctl`. */
export class SystemdUserService implements ServiceManager {
  readonly kind = 'systemd'
  readonly name = SYSTEMD_UNIT
  readonly linger: Linger

  constructor(
    private readonly exec: Executor,
    private readonly o: { home: string; user: string },
  ) {
    this.linger = {
      enabled: async () => {
        const result = await exec('loginctl', ['show-user', o.user, '--property=Linger', '--value'])
        return result.exitCode === 0 && result.stdout.trim() === 'yes'
      },
      enable: async () => (await exec('loginctl', ['enable-linger', o.user])).exitCode === 0,
    }
  }

  private systemctl(...args: string[]) {
    return this.exec('systemctl', ['--user', ...args])
  }

  /** The user manager answers (fails in containers, WSL without systemd, or without a user session bus). */
  async available(): Promise<boolean> {
    return (await this.systemctl('is-active', 'default.target')).exitCode === 0
  }

  async install(options: ServiceInstallOptions): Promise<string> {
    const path = unitPath(this.o.home)
    await mkdir(options.logsDir, { recursive: true })
    await writeFileAtomic(path, renderSystemdUnit({ ...options, home: this.o.home }))
    for (const args of [['daemon-reload'], ['enable', '--now', SYSTEMD_UNIT], ['restart', SYSTEMD_UNIT]]) {
      const result = await this.systemctl(...args)
      if (result.exitCode !== 0)
        throw new Error(`systemctl --user ${args[0]} failed: ${result.stderr.trim()}`)
    }
    return path
  }

  async uninstall(): Promise<void> {
    await this.systemctl('stop', SYSTEMD_UNIT)
    await this.systemctl('disable', SYSTEMD_UNIT)
    await rm(unitPath(this.o.home), { force: true })
    await this.systemctl('daemon-reload')
  }

  async status(): Promise<ServiceStatus> {
    const result = await this.systemctl(
      'show',
      SYSTEMD_UNIT,
      '--property=LoadState,ActiveState,SubState,MainPID',
    )
    const props = parseShow(result.stdout)
    if (result.exitCode !== 0 || props.LoadState !== 'loaded') return { loaded: false, detail: 'not loaded' }
    const state = props.SubState || props.ActiveState || 'unknown'
    const pid = props.MainPID && props.MainPID !== '0' ? props.MainPID : undefined
    return { loaded: true, detail: pid ? `${state} (pid ${pid})` : state }
  }
}

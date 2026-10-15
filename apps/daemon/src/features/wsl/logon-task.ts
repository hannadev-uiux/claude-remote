import type { Executor } from '../../infra/exec.ts'

/** Name of the Windows Scheduled Task that boots the WSL distribution at logon. */
export const LOGON_TASK_NAME = 'Claude Remote'

/** What the task runs: starting the distribution is enough, systemd then starts the user unit. */
export function logonTaskAction(distro: string | null): string {
  // Distribution names are plain words; anything else falls back to the default distribution.
  const target = distro && /^[\w.-]+$/.test(distro) ? `-d ${distro} ` : ''
  return `wsl.exe ${target}--exec /bin/true`
}

export function logonTaskCreateArgs(distro: string | null): string[] {
  return ['/Create', '/F', '/SC', 'ONLOGON', '/TN', LOGON_TASK_NAME, '/TR', logonTaskAction(distro)]
}

/** The create command as typed in PowerShell/cmd, for when it has to be run by hand (e.g. elevated). */
export function logonTaskCreateCommand(distro: string | null): string {
  return `schtasks.exe /Create /F /SC ONLOGON /TN "${LOGON_TASK_NAME}" /TR "${logonTaskAction(distro)}"`
}

export type LogonTaskResult = { ok: true } | { ok: false; error: string }

/** The "Claude Remote" logon task, managed with `schtasks.exe` through WSL interop. */
export class LogonTask {
  readonly name = LOGON_TASK_NAME

  constructor(
    private readonly exec: Executor,
    private readonly distro: string | null,
  ) {}

  get command(): string {
    return logonTaskCreateCommand(this.distro)
  }

  async exists(): Promise<boolean> {
    return (await this.exec('schtasks.exe', ['/Query', '/TN', LOGON_TASK_NAME])).exitCode === 0
  }

  async create(): Promise<LogonTaskResult> {
    const result = await this.exec('schtasks.exe', logonTaskCreateArgs(this.distro))
    if (result.exitCode === 0) return { ok: true }
    return { ok: false, error: (result.stderr || result.stdout).trim() || `exit ${result.exitCode}` }
  }

  /** Deletes the task; false when there was none (or it could not be deleted). */
  async remove(): Promise<boolean> {
    if (!(await this.exists())) return false
    return (await this.exec('schtasks.exe', ['/Delete', '/F', '/TN', LOGON_TASK_NAME])).exitCode === 0
  }
}

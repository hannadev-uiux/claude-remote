import type { Executor } from '../../infra/exec.ts'

/** Name of the Windows Scheduled Task that boots the WSL distribution at logon. */
export const LOGON_TASK_NAME = 'Remote Harness'
/** The name used before the rename: still recognized, replaced on create and removed on uninstall. */
export const LEGACY_LOGON_TASK_NAME = 'Claude Remote'
const TASK_NAMES = [LOGON_TASK_NAME, LEGACY_LOGON_TASK_NAME]

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

/** The "Remote Harness" logon task, managed with `schtasks.exe` through WSL interop. */
export class LogonTask {
  readonly name = LOGON_TASK_NAME

  constructor(
    private readonly exec: Executor,
    private readonly distro: string | null,
  ) {}

  get command(): string {
    return logonTaskCreateCommand(this.distro)
  }

  private async has(name: string): Promise<boolean> {
    return (await this.exec('schtasks.exe', ['/Query', '/TN', name])).exitCode === 0
  }

  private async delete(name: string): Promise<boolean> {
    return (await this.exec('schtasks.exe', ['/Delete', '/F', '/TN', name])).exitCode === 0
  }

  /** The task under its name, or under the name it had before the rename. */
  async exists(): Promise<boolean> {
    for (const name of TASK_NAMES) if (await this.has(name)) return true
    return false
  }

  /** Creates (or replaces) the task, then drops the one from before the rename. */
  async create(): Promise<LogonTaskResult> {
    const result = await this.exec('schtasks.exe', logonTaskCreateArgs(this.distro))
    if (result.exitCode !== 0) {
      return { ok: false, error: (result.stderr || result.stdout).trim() || `exit ${result.exitCode}` }
    }
    // Two tasks would only boot the distribution twice; a failure here is harmless.
    if (await this.has(LEGACY_LOGON_TASK_NAME)) await this.delete(LEGACY_LOGON_TASK_NAME)
    return { ok: true }
  }

  /** Deletes the task under either name; false when there was none (or it could not be deleted). */
  async remove(): Promise<boolean> {
    let removed = false
    for (const name of TASK_NAMES) {
      if ((await this.has(name)) && (await this.delete(name))) removed = true
    }
    return removed
  }
}

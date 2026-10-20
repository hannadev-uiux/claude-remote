import type { Executor } from '../../infra/exec.ts'
import { LAUNCHD_LABEL } from './launchd.ts'
import { SYSTEMD_UNIT } from './systemd.ts'

/**
 * The command that stops the installed service until the next login without uninstalling it: the
 * LaunchAgent is booted out (its `RunAtLoad` starts it again at login), the systemd unit stopped (it
 * stays enabled). Null where there is no service manager.
 */
export function stopServiceCommand(
  platform: NodeJS.Platform,
  uid: number,
): { command: string; args: string[] } | null {
  if (platform === 'darwin') return { command: 'launchctl', args: ['bootout', `gui/${uid}/${LAUNCHD_LABEL}`] }
  if (platform === 'linux') return { command: 'systemctl', args: ['--user', 'stop', SYSTEMD_UNIT] }
  return null
}

export async function stopService(exec: Executor, platform = process.platform): Promise<void> {
  const stop = stopServiceCommand(platform, process.getuid?.() ?? 501)
  if (!stop) return
  const result = await exec(stop.command, stop.args)
  if (result.exitCode !== 0) throw new Error(`${stop.command} failed: ${result.stderr.trim()}`)
}

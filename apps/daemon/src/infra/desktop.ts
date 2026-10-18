import { spawn } from 'node:child_process'
import { openSync } from 'node:fs'
import type { Executor } from './exec.ts'
import type { Platform } from './platform.ts'

/** Native notifications and the few desktop actions of the tray. No-ops where unsupported. */
export interface Desktop {
  notify(title: string, body: string): Promise<void>
  /** Opens a folder or file with the default app. */
  open(path: string): Promise<void>
  /** Runs a shell command in a new terminal window. */
  runInTerminal(command: string): Promise<void>
}

function appleScriptString(value: string): string {
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`
}

export function createDesktop(exec: Executor, platform: Platform, o: { wsl: boolean }): Desktop {
  const ignore = async (file: string, args: string[]) => {
    await exec(file, args).catch(() => undefined)
  }
  if (platform === 'darwin') {
    return {
      notify: (title, body) =>
        ignore('osascript', [
          '-e',
          `display notification ${appleScriptString(body)} with title ${appleScriptString(title)}`,
        ]),
      open: (path) => ignore('open', [path]),
      runInTerminal: (command) =>
        ignore('osascript', [
          '-e',
          `tell application "Terminal" to do script ${appleScriptString(command)}`,
          '-e',
          'tell application "Terminal" to activate',
        ]),
    }
  }
  if (o.wsl) {
    // No Linux desktop inside WSL: the daemon stays headless and only logs.
    return { notify: async () => {}, open: async () => {}, runInTerminal: async () => {} }
  }
  return {
    notify: (title, body) => ignore('notify-send', ['-a', 'Remote Harness', title, body]),
    open: (path) => ignore('xdg-open', [path]),
    runInTerminal: (command) =>
      ignore('x-terminal-emulator', ['-e', 'sh', '-c', `${command}; exec "$SHELL"`]),
  }
}

/**
 * Starts `remote-harness update` in a process that outlives this daemon, since the update restarts the
 * service. Under systemd it runs as a transient unit (a restart kills every process of the
 * service's cgroup); elsewhere it gets its own process group.
 */
export function runDetachedUpdate(o: {
  nodePath: string
  cliPath: string
  ref: string
  logFile: string
  env?: NodeJS.ProcessEnv
  systemdRun: boolean
}): void {
  const env = o.env ?? process.env
  const command = [o.nodePath, o.cliPath, 'update', '--ref', o.ref]
  const [file, args] = o.systemdRun
    ? ([
        'systemd-run',
        ['--user', '--collect', '--quiet', '--unit', `remote-harness-update-${Date.now()}`, ...command],
      ] as const)
    : ([command[0]!, command.slice(1)] as const)
  const log = openSync(o.logFile, 'a')
  const child = spawn(file, args, { detached: true, stdio: ['ignore', log, log], env })
  child.unref()
}

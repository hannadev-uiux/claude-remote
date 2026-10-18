import { type ChildProcess, spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { chmod, mkdir, readFile, rename } from 'node:fs/promises'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import type { Executor } from './exec.ts'
import type { Platform } from './platform.ts'

/** A running tray helper: JSON lines on stdin (from us) and stdout (from it). */
export type TrayProcess = {
  send(message: object): void
  onMessage(listener: (message: unknown) => void): void
  /** `early`: it exited before `earlyMs` (missing toolkit, no display…). */
  onExit(listener: (code: number | null, early: boolean) => void): void
  stop(): void
}

export function spawnJsonLines(
  command: string,
  args: readonly string[],
  o: { earlyMs?: number; onStderr?: (line: string) => void } = {},
): TrayProcess {
  const child: ChildProcess = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] })
  const started = Date.now()
  const messages: Array<(message: unknown) => void> = []
  const exits: Array<(code: number | null, early: boolean) => void> = []
  let exited = false
  const finish = (code: number | null) => {
    if (exited) return
    exited = true
    const early = Date.now() - started < (o.earlyMs ?? 5000)
    for (const listener of exits) listener(code, early)
  }
  if (child.stdout) {
    createInterface({ input: child.stdout }).on('line', (line) => {
      try {
        const message: unknown = JSON.parse(line)
        for (const listener of messages) listener(message)
      } catch {
        o.onStderr?.(line)
      }
    })
  }
  if (child.stderr) createInterface({ input: child.stderr }).on('line', (line) => o.onStderr?.(line))
  child.on('error', () => finish(null))
  child.on('exit', (code) => finish(code))
  child.stdin?.on('error', () => undefined)
  return {
    send: (message) => {
      if (!exited) child.stdin?.write(`${JSON.stringify(message)}\n`)
    },
    onMessage: (listener) => messages.push(listener),
    onExit: (listener) => exits.push(listener),
    stop: () => {
      child.stdin?.end()
      child.kill()
    },
  }
}

/** `apps/daemon/tray`, from the bundle (`dist/cli.js`) or from the sources (`src/infra`). */
export function trayAssetsDir(): string | null {
  for (const relative of ['../tray/', '../../tray/']) {
    const dir = fileURLToPath(new URL(relative, import.meta.url))
    if (existsSync(join(dir, 'macos', 'Tray.swift'))) return dir
  }
  return null
}

export type TrayCommand = { command: string; args: string[] } | { unavailable: string }

/**
 * How to start the tray helper here, compiling the macOS one on first use (cached by source hash).
 * WSL and Linux sessions without a display get `unavailable` with the reason.
 */
export async function trayCommand(o: {
  platform: Platform
  wsl: boolean
  env: NodeJS.ProcessEnv
  exec: Executor
  assetsDir: string | null
  buildDir: string
}): Promise<TrayCommand> {
  if (!o.assetsDir) return { unavailable: 'tray sources not found' }
  if (o.platform === 'darwin') {
    const source = join(o.assetsDir, 'macos', 'Tray.swift')
    const hash = createHash('sha256')
      .update(await readFile(source))
      .digest('hex')
      .slice(0, 12)
    const binary = join(o.buildDir, `RemoteHarnessTray-${hash}`)
    if (!existsSync(binary)) {
      await mkdir(o.buildDir, { recursive: true })
      const partial = `${binary}.partial`
      const built = await o.exec('swiftc', ['-O', source, '-o', partial], { timeoutMs: 300_000 })
      if (built.exitCode !== 0) return { unavailable: `swiftc failed: ${built.stderr.trim().slice(0, 300)}` }
      await chmod(partial, 0o755)
      await rename(partial, binary)
    }
    return { command: binary, args: [] }
  }
  if (o.wsl) return { unavailable: 'no tray in WSL' }
  if (!o.env.DISPLAY && !o.env.WAYLAND_DISPLAY) return { unavailable: 'no graphical session' }
  return { command: 'python3', args: [join(o.assetsDir, 'linux', 'tray.py')] }
}

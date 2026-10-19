import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { chmod, mkdir, readFile, rename } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Executor } from './exec.ts'

/** `apps/daemon/macos/launcher.c`, from the bundle (`dist/cli.js`) or from the sources (`src/infra`). */
export function launcherSourcePath(): string | null {
  for (const relative of ['../macos/launcher.c', '../../macos/launcher.c']) {
    const file = fileURLToPath(new URL(relative, import.meta.url))
    if (existsSync(file)) return file
  }
  return null
}

export type NativeBuild = { binary: string } | { unavailable: string }

/**
 * Compiles a C source with the Command Line Tools, cached in `buildDir` by source hash.
 * `cc` without the CLT opens the macOS installer dialog, so `xcode-select -p` is checked first.
 */
export async function buildC(o: {
  exec: Executor
  source: string
  buildDir: string
  name: string
}): Promise<NativeBuild> {
  const hash = createHash('sha256')
    .update(await readFile(o.source))
    .digest('hex')
    .slice(0, 12)
  const binary = join(o.buildDir, `${o.name}-${hash}`)
  if (existsSync(binary)) return { binary }
  if ((await o.exec('xcode-select', ['-p'])).exitCode !== 0) {
    return { unavailable: 'Command Line Tools not installed' }
  }
  await mkdir(o.buildDir, { recursive: true })
  const partial = `${binary}.partial`
  const built = await o.exec('cc', ['-O2', '-o', partial, o.source], { timeoutMs: 120_000 })
  if (built.exitCode !== 0) return { unavailable: `cc failed: ${built.stderr.trim().slice(0, 300)}` }
  await chmod(partial, 0o755)
  await rename(partial, binary)
  return { binary }
}

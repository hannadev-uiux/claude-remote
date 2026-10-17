import { readFileSync } from 'node:fs'

/** Operating systems the daemon runs on. Adapters (secrets, service, shell) are picked per platform. */
export const SUPPORTED_PLATFORMS = ['darwin', 'linux'] as const
export type Platform = (typeof SUPPORTED_PLATFORMS)[number]

/** Human names of the supported systems, for error messages. */
export const PLATFORM_NAMES: Record<Platform, string> = { darwin: 'macOS', linux: 'Linux' }

export class UnsupportedPlatformError extends Error {
  override name = 'UnsupportedPlatformError'
  constructor(readonly platform: string) {
    super(
      `Unsupported system: ${platform}. Remote Harness runs on ${SUPPORTED_PLATFORMS.map((p) => PLATFORM_NAMES[p]).join(' and ')}.`,
    )
  }
}

export function isSupportedPlatform(value: string): value is Platform {
  return (SUPPORTED_PLATFORMS as readonly string[]).includes(value)
}

/** The current platform; throws `UnsupportedPlatformError` anywhere else (fail early, before any work). */
export function resolvePlatform(value: string = process.platform): Platform {
  if (!isSupportedPlatform(value)) throw new UnsupportedPlatformError(value)
  return value
}

/**
 * Linux running inside WSL2 on Windows: the platform stays `linux`, this is the extra flag.
 * `distro` comes from `WSL_DISTRO_NAME` (may be unset, e.g. under a systemd service).
 */
export type WslInfo = { distro: string | null }

/** True for a WSL kernel release/version (`5.15.x-microsoft-standard-WSL2`, `…Microsoft…`). */
export function isWslKernel(text: string): boolean {
  return /microsoft|wsl/i.test(text)
}

/**
 * Pure WSL detection from `/proc/sys/kernel/osrelease`, `/proc/version` and the environment.
 * Null on other platforms and on regular Linux kernels.
 */
export function detectWsl(input: {
  platform: Platform
  osrelease?: string | null
  version?: string | null
  env?: NodeJS.ProcessEnv
}): WslInfo | null {
  if (input.platform !== 'linux') return null
  const kernel = [input.osrelease, input.version].some((text) => text != null && isWslKernel(text))
  if (!kernel) return null
  const distro = input.env?.WSL_DISTRO_NAME?.trim()
  return { distro: distro || null }
}

function readProc(path: string): string | null {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return null
  }
}

/** WSL detection for this process (reads `/proc`, so only on Linux). */
export function currentWsl(platform: Platform, env: NodeJS.ProcessEnv = process.env): WslInfo | null {
  if (platform !== 'linux') return null
  return detectWsl({
    platform,
    osrelease: readProc('/proc/sys/kernel/osrelease'),
    version: readProc('/proc/version'),
    env,
  })
}

/** True when PID 1 is systemd (`/proc/1/comm`); WSL only boots systemd with `[boot] systemd=true`. */
export function systemdIsPid1(read: (path: string) => string | null = readProc): boolean {
  return read('/proc/1/comm')?.trim() === 'systemd'
}

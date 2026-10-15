/** Operating systems the daemon runs on. Adapters (secrets, service, shell) are picked per platform. */
export const SUPPORTED_PLATFORMS = ['darwin', 'linux'] as const
export type Platform = (typeof SUPPORTED_PLATFORMS)[number]

/** Human names of the supported systems, for error messages. */
export const PLATFORM_NAMES: Record<Platform, string> = { darwin: 'macOS', linux: 'Linux' }

export class UnsupportedPlatformError extends Error {
  override name = 'UnsupportedPlatformError'
  constructor(readonly platform: string) {
    super(
      `Unsupported system: ${platform}. Claude Remote runs on ${SUPPORTED_PLATFORMS.map((p) => PLATFORM_NAMES[p]).join(' and ')}.`,
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

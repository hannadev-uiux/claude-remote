import type { PermissionStatus } from '@remote-harness/protocol'
import type { TokenStoreKind } from '../../core/secrets.ts'
import type { Platform } from '../../infra/platform.ts'

/**
 * `null` means "could not be checked" (not the folder's fault, e.g. filesystem errors other than a
 * permission denial) or "doesn't exist" — the caller omits the entry rather than reporting a status.
 */
export function classifyFolderAccess(error: NodeJS.ErrnoException | null): PermissionStatus | null {
  if (!error) return 'allowed'
  if (error.code === 'EACCES' || error.code === 'EPERM') return 'denied'
  return null
}

/**
 * Derived from the well-known folders (Desktop, Documents, Downloads): TCC's Full Disk Access has no
 * direct query, so this is a heuristic, not an authoritative read. `null` outside macOS (no such row).
 */
export function classifyFullDiskAccess(
  platform: Platform,
  wellKnown: readonly (PermissionStatus | null)[],
): PermissionStatus | null {
  if (platform !== 'darwin') return null
  const statuses = wellKnown.filter((status): status is PermissionStatus => status !== null)
  if (statuses.some((status) => status === 'denied')) return 'denied'
  if (statuses.length > 0 && statuses.every((status) => status === 'allowed')) return 'allowed'
  return 'not_available'
}

/**
 * macOS only: whether this process can send Apple events to another app (checked by running one
 * against a well-known app and reading its exit code — see `infra/accessibility.ts`).
 */
export function classifyAccessibility(platform: Platform, exitCode: number): PermissionStatus | null {
  if (platform !== 'darwin') return null
  return exitCode === 0 ? 'allowed' : 'denied'
}

/** `worked` is a live read/write probe of the token store currently selected for this platform. */
export function classifyKeychain(kind: TokenStoreKind, worked: boolean): PermissionStatus {
  if (kind === 'file') return 'not_available'
  return worked ? 'allowed' : 'denied'
}

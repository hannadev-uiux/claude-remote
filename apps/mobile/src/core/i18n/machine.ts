/**
 * Name of the paired computer, used by the catalogs through `{{machine}}` / `{{Machine}}`: the
 * alias chosen in the app, else the host name the daemon reports, else the generic "your machine"
 * (resolved by `createI18n` when nothing is registered). The app registers it when the connection
 * or the alias changes; `null` means unknown.
 */
let current: string | null = null

export function setMachineName(name: string | null): void {
  current = name?.trim() || null
}

export function machineName(): string | null {
  return current
}

/** Alias first, then the host name from the daemon, both trimmed; `null` when neither is known. */
export function resolveMachineName(
  alias: string | null | undefined,
  host: string | null | undefined,
): string | null {
  return alias?.trim() || host?.trim() || null
}

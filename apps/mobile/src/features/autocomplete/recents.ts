import type { CommandItem } from '@remote-harness/protocol'

export type CommandRecent = { name: string; at: number; count: number }

/** Recent commands per profile id. */
export type CommandRecents = Record<string, CommandRecent[]>

export const RECENTS_PER_PROFILE = 20

/** Moves `name` to the front (newest), bumping its count; keeps at most `RECENTS_PER_PROFILE`. */
export function recordUse(list: readonly CommandRecent[], name: string, now: number): CommandRecent[] {
  const previous = list.find((r) => r.name === name)
  const entry = { name, at: now, count: (previous?.count ?? 0) + 1 }
  return [entry, ...list.filter((r) => r.name !== name)].slice(0, RECENTS_PER_PROFILE)
}

/** Names by last use, newest first. */
export function recentNames(list: readonly CommandRecent[] | undefined): string[] {
  return [...(list ?? [])].sort((a, b) => b.at - a.at).map((r) => r.name)
}

/** The listed command a prompt runs (`/name …` at the start), if any. */
export function sentCommand(text: string, commands: readonly CommandItem[]): string | null {
  const match = /^\/([\w:.-]+)/.exec(text.trim())
  const name = match?.[1]
  return name && commands.some((c) => c.name === name) ? name : null
}

/** Reads the stored recents, dropping anything malformed. */
export function parseRecents(raw: string | null): CommandRecents {
  if (!raw) return {}
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    const result: CommandRecents = {}
    for (const [profileId, list] of Object.entries(value as Record<string, unknown>)) {
      if (!Array.isArray(list)) continue
      const entries = list.filter(
        (r): r is CommandRecent =>
          !!r &&
          typeof r === 'object' &&
          typeof (r as CommandRecent).name === 'string' &&
          typeof (r as CommandRecent).at === 'number' &&
          typeof (r as CommandRecent).count === 'number',
      )
      if (entries.length) result[profileId] = entries.slice(0, RECENTS_PER_PROFILE)
    }
    return result
  } catch {
    return {}
  }
}

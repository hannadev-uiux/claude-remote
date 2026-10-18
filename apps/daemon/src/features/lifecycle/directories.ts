import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { DIRECTORY_LIST_LIMIT, type DirectoryItem } from '@remote-harness/protocol'
import { DaemonError } from '../../core/errors.ts'
import { hasGitMarker, readSubdirectories } from '../../infra/fs.ts'
import { validateCwd } from './service.ts'

export type DirectoryFilter = { prefix?: string; hidden?: boolean; limit?: number }

export type DirectoryListing = {
  path: string
  parent: string | null
  home: string
  items: DirectoryItem[]
  truncated: boolean
}

/**
 * Names matching `prefix` (case-insensitive start), without dot-names unless `hidden`, sorted
 * case-insensitively and capped at `limit`.
 */
export function filterDirectories(
  names: readonly string[],
  { prefix = '', hidden = false, limit = DIRECTORY_LIST_LIMIT }: DirectoryFilter = {},
): { names: string[]; truncated: boolean } {
  const lowerPrefix = prefix.toLowerCase()
  const matches = names
    .filter((name) => (hidden || !name.startsWith('.')) && name.toLowerCase().startsWith(lowerPrefix))
    .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }) || (a < b ? -1 : a > b ? 1 : 0))
  return { names: matches.slice(0, limit), truncated: matches.length > limit }
}

/** Subdirectories of a directory inside the home folder, for the new-session autocomplete and picker. */
export async function listDirectories(
  rawPath: string,
  filter: DirectoryFilter = {},
  home = homedir(),
): Promise<DirectoryListing> {
  const path = await validateCwd(rawPath, home)
  let names: string[]
  try {
    names = await readSubdirectories(path)
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code ?? 'unknown'
    throw new DaemonError('invalid_cwd', `cannot read directory ${rawPath} (${code})`)
  }
  const picked = filterDirectories(names, filter)
  const items = await Promise.all(
    picked.names.map(async (name) => {
      const itemPath = join(path, name)
      return { name, path: itemPath, git: await hasGitMarker(itemPath) }
    }),
  )
  return { path, parent: path === home ? null : dirname(path), home, items, truncated: picked.truncated }
}

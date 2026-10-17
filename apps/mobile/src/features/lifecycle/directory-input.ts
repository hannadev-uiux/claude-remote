import type { DirectoryItem } from '@remote-harness/protocol'

/** The folder to list (`~`, `~/…` or absolute) and the start of the name typed after it. */
export type DirectoryQuery = { dir: string; prefix: string }

/** `~/…` or absolute; anything else is taken as relative to the home folder. Repeated `/` collapse. */
function normalize(text: string): string {
  const value = text.trim().replace(/\/{2,}/g, '/')
  if (value === '~' || value.startsWith('~/') || value.startsWith('/')) return value
  return `~/${value}`
}

/** Splits the typed directory for autocomplete: `~/Doc` → `~` + `Doc`. Empty text has no query. */
export function splitDirectoryInput(text: string): DirectoryQuery | null {
  if (!text.trim()) return null
  const value = normalize(text)
  if (value === '~') return { dir: '~', prefix: '' }
  const slash = value.lastIndexOf('/')
  return { dir: value.slice(0, slash) || '/', prefix: value.slice(slash + 1) }
}

/** Field text after picking `name` inside `dir`; the trailing `/` makes the next level suggest. */
export function completeDirectory(dir: string, name: string): string {
  return dir === '/' ? `/${name}/` : `${dir}/${name}/`
}

/** Where the folder picker opens for the typed text: that directory, or the home folder. */
export function directoryToBrowse(text: string): string {
  if (!text.trim()) return '~'
  const value = normalize(text)
  return value.length > 1 ? value.replace(/\/+$/, '') : value
}

/** `path` shown relative to `home` as `~/…`. */
export function tildify(path: string, home: string): string {
  const base = home.replace(/\/+$/, '')
  if (!base) return path
  if (path === base) return '~'
  return path.startsWith(`${base}/`) ? `~${path.slice(base.length)}` : path
}

/**
 * Suggestions for the current text from a listing that may be older than it: only a listing of
 * the same folder whose prefix the current one extends still applies, narrowed to the current prefix.
 */
export function matchingSuggestions(
  listing: { query: DirectoryQuery; items: readonly DirectoryItem[] } | undefined,
  current: DirectoryQuery | null,
  max: number,
): DirectoryItem[] {
  if (!listing || !current || listing.query.dir !== current.dir) return []
  const prefix = current.prefix.toLowerCase()
  if (!prefix.startsWith(listing.query.prefix.toLowerCase())) return []
  return listing.items.filter((item) => item.name.toLowerCase().startsWith(prefix)).slice(0, max)
}

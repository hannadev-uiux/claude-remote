import type { CommandItem, CommandSource } from '@remote-harness/protocol'

/** How a command matched the query: 0 name prefix, 1 name substring, 2 fuzzy name, 3 description. */
export type CommandMatch = { tier: 0 | 1 | 2 | 3; indices: number[]; gaps: number }

export type CommandRow = { item: CommandItem; indices: number[] }

export type CommandSectionKey = 'recent' | 'results' | CommandSource

export type CommandSection = { key: CommandSectionKey; data: CommandRow[] }

const SECTION_ORDER: CommandSource[] = ['builtin', 'project', 'profile', 'plugin']
export const RECENT_LIMIT = 5

const range = (start: number, length: number) => Array.from({ length }, (_, i) => start + i)

/** Characters of `query` found in order in `name`, preferring the earliest match of each one. */
function subsequence(name: string, query: string): { indices: number[]; gaps: number } | null {
  const indices: number[] = []
  let from = 0
  for (const ch of query) {
    const at = name.indexOf(ch, from)
    if (at < 0) return null
    indices.push(at)
    from = at + 1
  }
  const first = indices[0] ?? 0
  const last = indices.at(-1) ?? 0
  return { indices, gaps: last - first + 1 - indices.length }
}

/** Case-insensitive match of one command against the query; null when it does not match. */
export function matchCommand(item: CommandItem, query: string): CommandMatch | null {
  const q = query.toLowerCase()
  if (!q) return { tier: 0, indices: [], gaps: 0 }
  const name = item.name.toLowerCase()
  if (name.startsWith(q)) return { tier: 0, indices: range(0, q.length), gaps: 0 }
  const at = name.indexOf(q)
  if (at >= 0) return { tier: 1, indices: range(at, q.length), gaps: 0 }
  const fuzzy = subsequence(name, q)
  if (fuzzy) return { tier: 2, ...fuzzy }
  if (item.description.toLowerCase().includes(q)) return { tier: 3, indices: [], gaps: 0 }
  return null
}

const byName = (a: CommandItem, b: CommandItem) => a.name.localeCompare(b.name)

/**
 * Rows for the `/` suggestions. No query: every command, in sections (recent first, then by source),
 * each by name. With a query: one ranked list (match tier, recent use, compactness, length, name).
 */
export function rankCommands(
  commands: readonly CommandItem[],
  query: string,
  recents: readonly string[] = [],
): CommandSection[] {
  const recentRank = new Map(recents.map((name, i) => [name, i]))
  if (!query) {
    const available = new Map(commands.map((c) => [c.name, c]))
    const recent = recents
      .filter((name) => available.has(name))
      .slice(0, RECENT_LIMIT)
      .map((name) => ({ item: available.get(name)!, indices: [] }))
    const shown = new Set(recent.map((r) => r.item.name))
    const sections: CommandSection[] = recent.length ? [{ key: 'recent', data: recent }] : []
    for (const source of SECTION_ORDER) {
      const data = commands
        .filter((c) => c.source === source && !shown.has(c.name))
        .sort(byName)
        .map((item) => ({ item, indices: [] }))
      if (data.length) sections.push({ key: source, data })
    }
    return sections
  }
  const matched = commands.flatMap((item) => {
    const match = matchCommand(item, query)
    return match ? [{ item, match, recent: recentRank.get(item.name) ?? Number.POSITIVE_INFINITY }] : []
  })
  matched.sort(
    (a, b) =>
      a.match.tier - b.match.tier ||
      a.recent - b.recent ||
      a.match.gaps - b.match.gaps ||
      a.item.name.length - b.item.name.length ||
      byName(a.item, b.item),
  )
  if (!matched.length) return []
  return [{ key: 'results', data: matched.map(({ item, match }) => ({ item, indices: match.indices })) }]
}

/** Splits a name into plain and highlighted runs for rendering. */
export function highlightRuns(
  text: string,
  indices: readonly number[],
): Array<{ text: string; hit: boolean }> {
  const hits = new Set(indices)
  const runs: Array<{ text: string; hit: boolean }> = []
  for (let i = 0; i < text.length; i++) {
    const hit = hits.has(i)
    const last = runs.at(-1)
    if (last && last.hit === hit) last.text += text[i]
    else runs.push({ text: text[i]!, hit })
  }
  return runs
}

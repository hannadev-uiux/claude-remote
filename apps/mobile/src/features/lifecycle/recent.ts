import type { ProjectItem } from '@remote-harness/protocol'
import { shortPath } from '@/core/utils/time'

/** Recent rows shown inline on the New session screen; the rest are in the "See all" sheet. */
export const INLINE_RECENT = 3

/** A Recent row: a directory, or a repository with the worktrees folded into it. */
export type RecentRow = ProjectItem & { worktrees: number }

const WORKTREE = /^(.+?)\/\.claude\/worktrees\/[^/]+\/?$/

/** The repository of a directory under `<repo>/.claude/worktrees/<name>`, else null. */
export function worktreeRoot(cwd: string): string | null {
  return WORKTREE.exec(cwd)?.[1] ?? null
}

/**
 * Folds every worktree into its repository's row, placed where the most recent of them was (the
 * daemon sends the newest first). Branch and weekly count are the repository's own, when it is a
 * recent directory too.
 */
export function groupRecent(items: readonly ProjectItem[]): RecentRow[] {
  const rows = new Map<string, RecentRow>()
  for (const item of items) {
    const root = worktreeRoot(item.cwd)
    const key = root ?? item.cwd
    const row = rows.get(key)
    if (!row) {
      rows.set(
        key,
        root
          ? { cwd: root, lastUsedAt: item.lastUsedAt, branch: null, sessions: 0, worktrees: 1 }
          : { ...item, worktrees: 0 },
      )
    } else if (root) {
      row.worktrees += 1
    } else {
      row.branch = item.branch
      row.sessions = item.sessions
    }
  }
  return [...rows.values()]
}

/**
 * The rows shown inline, and whether "See all" is needed: some row did not fit, or a worktree is
 * only reachable through its repository's row.
 */
export function inlineRecent(items: readonly ProjectItem[]): { rows: RecentRow[]; more: boolean } {
  const grouped = groupRecent(items)
  return {
    rows: grouped.slice(0, INLINE_RECENT),
    more: grouped.length > INLINE_RECENT || grouped.some((row) => row.worktrees > 0),
  }
}

/** Recent directories whose path (as shown) or branch contains the query, ignoring case. */
export function filterRecent(items: readonly ProjectItem[], query: string): ProjectItem[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return [...items]
  return items.filter(
    (item) =>
      shortPath(item.cwd).toLowerCase().includes(needle) || item.branch?.toLowerCase().includes(needle),
  )
}

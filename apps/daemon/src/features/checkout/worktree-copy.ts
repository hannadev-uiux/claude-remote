import { basename, dirname, join } from 'node:path'
import type { WorktreeCopy } from '@remote-harness/protocol'

/** Most `.worktreeinclude` entries shown before a start. */
export const MAX_INCLUDE_ENTRIES = 12

/** The patterns of a `.worktreeinclude` (gitignore syntax): trimmed, without comments and blank lines. */
export function parseWorktreeInclude(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
    .slice(0, MAX_INCLUDE_ENTRIES)
}

/**
 * What Claude Code gives a new worktree of the checkout at `root`: its local settings (shared with or
 * copied from the main checkout) and the git-ignored files matched by `.worktreeinclude`.
 */
export async function inspectWorktreeCopy(
  root: string,
  io: { exists: (path: string) => Promise<boolean>; read: (path: string) => Promise<string | null> },
): Promise<WorktreeCopy> {
  const [localSettings, include] = await Promise.all([
    io.exists(join(root, '.claude', 'settings.local.json')),
    io.read(join(root, '.worktreeinclude')),
  ])
  return { localSettings, include: include === null ? [] : parseWorktreeInclude(include) }
}

/**
 * Directory whose `.claude/settings.local.json` holds a session's project rules: Claude Code resolves
 * a worktree it created (`<root>/.claude/worktrees/<name>`) to the main checkout `<root>`.
 */
export function localSettingsRoot(cwd: string): string {
  const worktrees = dirname(cwd)
  if (basename(worktrees) !== 'worktrees' || basename(dirname(worktrees)) !== '.claude') return cwd
  return dirname(dirname(worktrees))
}

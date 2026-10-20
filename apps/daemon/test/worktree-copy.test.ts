import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import {
  inspectWorktreeCopy,
  localSettingsRoot,
  MAX_INCLUDE_ENTRIES,
  parseWorktreeInclude,
} from '../src/features/checkout/worktree-copy.ts'
import { isFile, readTextFile } from '../src/infra/fs.ts'
import { useTempHome } from './helpers.ts'

const home = useTempHome()

describe('worktree copy', () => {
  test('.worktreeinclude keeps its patterns, without comments and blank lines', () => {
    expect(parseWorktreeInclude('# local files\n.env\n\n  .env.local  \r\nCLAUDE.local.md\n')).toEqual([
      '.env',
      '.env.local',
      'CLAUDE.local.md',
    ])
    const many = Array.from({ length: 20 }, (_, i) => `f${i}`).join('\n')
    expect(parseWorktreeInclude(many)).toHaveLength(MAX_INCLUDE_ENTRIES)
  })

  test('reports the local settings and the include entries of a checkout', async () => {
    const root = join(home.dir(), 'repo')
    await mkdir(join(root, '.claude'), { recursive: true })
    const io = { exists: isFile, read: readTextFile }
    expect(await inspectWorktreeCopy(root, io)).toEqual({ localSettings: false, include: [] })
    await writeFile(join(root, '.claude', 'settings.local.json'), '{}')
    await writeFile(join(root, '.worktreeinclude'), '.env\n# not this\n')
    expect(await inspectWorktreeCopy(root, io)).toEqual({ localSettings: true, include: ['.env'] })
  })

  test('a Claude Code worktree keeps its project rules in the main checkout', () => {
    expect(localSettingsRoot('/w/api/.claude/worktrees/login')).toBe('/w/api')
    expect(localSettingsRoot('/w/api')).toBe('/w/api')
    // Only the worktree root itself: deeper folders and look-alikes keep their own path.
    expect(localSettingsRoot('/w/api/.claude/worktrees/login/apps')).toBe(
      '/w/api/.claude/worktrees/login/apps',
    )
    expect(localSettingsRoot('/w/api/worktrees/login')).toBe('/w/api/worktrees/login')
  })
})

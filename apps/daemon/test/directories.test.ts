import { chmod, mkdir, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { filterDirectories, listDirectories } from '../src/features/lifecycle/directories.ts'
import { validateCwd } from '../src/features/lifecycle/service.ts'
import { useTempHome } from './helpers.ts'

const home = useTempHome()

describe('filterDirectories', () => {
  test('matches the prefix case-insensitively and sorts by name', () => {
    expect(filterDirectories(['Documents', 'Desktop', 'docker'], { prefix: 'doc' })).toEqual({
      names: ['docker', 'Documents'],
      truncated: false,
    })
  })

  test('leaves dot-names out unless hidden', () => {
    expect(filterDirectories(['.config', 'work']).names).toEqual(['work'])
    expect(filterDirectories(['work', '.config'], { hidden: true }).names).toEqual(['.config', 'work'])
    expect(filterDirectories(['.config', '.cache', 'work'], { prefix: '.co', hidden: true }).names).toEqual([
      '.config',
    ])
  })

  test('caps at the limit and reports truncation', () => {
    expect(filterDirectories(['c', 'a', 'b'], { limit: 2 })).toEqual({ names: ['a', 'b'], truncated: true })
    expect(filterDirectories(['a', 'b'], { limit: 2 }).truncated).toBe(false)
  })

  test('orders names that differ only in case deterministically', () => {
    expect(filterDirectories(['b', 'A', 'a']).names).toEqual(['A', 'a', 'b'])
  })
})

describe('listDirectories', () => {
  async function tree() {
    const dir = home.dir()
    await mkdir(join(dir, 'work', 'api', '.git'), { recursive: true })
    await mkdir(join(dir, 'work', 'web'), { recursive: true })
    await writeFile(join(dir, 'work', 'web', '.git'), 'gitdir: /elsewhere\n')
    await mkdir(join(dir, 'work', 'docs'))
    await mkdir(join(dir, '.config'))
    await writeFile(join(dir, 'work', 'notes.txt'), 'not a folder')
    await symlink(join(dir, 'work', 'api'), join(dir, 'work', 'api-link'))
    await symlink(join(dir, 'work', 'notes.txt'), join(dir, 'work', 'notes-link'))
    return dir
  }

  test('lists subdirectories with the git marker', async () => {
    const dir = await tree()
    const listing = await listDirectories('~/work', {}, dir)
    expect(listing).toEqual({
      path: join(dir, 'work'),
      parent: dir,
      home: dir,
      truncated: false,
      items: [
        { name: 'api', path: join(dir, 'work', 'api'), git: true },
        { name: 'api-link', path: join(dir, 'work', 'api-link'), git: true },
        { name: 'docs', path: join(dir, 'work', 'docs'), git: false },
        { name: 'web', path: join(dir, 'work', 'web'), git: true },
      ],
    })
  })

  test('has no parent at the home folder and filters hidden folders', async () => {
    const dir = await tree()
    const listing = await listDirectories('~', {}, dir)
    expect(listing.parent).toBeNull()
    expect(listing.items.map((i) => i.name)).toEqual(['work'])
    const withHidden = await listDirectories(dir, { hidden: true }, dir)
    expect(withHidden.items.map((i) => i.name)).toEqual(['.config', 'work'])
  })

  test('applies prefix and limit', async () => {
    const dir = await tree()
    const listing = await listDirectories(join(dir, 'work'), { prefix: 'API', limit: 1 }, dir)
    expect(listing.items.map((i) => i.name)).toEqual(['api'])
    expect(listing.truncated).toBe(true)
  })

  test('rejects paths outside home, missing or unreadable directories', async () => {
    const dir = await tree()
    await expect(listDirectories('/etc', {}, dir)).rejects.toMatchObject({ code: 'invalid_cwd' })
    await expect(listDirectories('~/missing', {}, dir)).rejects.toMatchObject({ code: 'invalid_cwd' })
    await expect(listDirectories('~/work/notes.txt', {}, dir)).rejects.toMatchObject({ code: 'invalid_cwd' })
    if (process.getuid?.() !== 0) {
      const locked = join(dir, 'locked')
      await mkdir(locked)
      await chmod(locked, 0o000)
      try {
        await expect(listDirectories('~/locked', {}, dir)).rejects.toMatchObject({ code: 'invalid_cwd' })
      } finally {
        await chmod(locked, 0o755)
      }
    }
  })
})

describe('validateCwd home expansion', () => {
  test('expands ~ against the given home', async () => {
    const dir = home.dir()
    await mkdir(join(dir, 'proj'))
    expect(await validateCwd('~', dir)).toBe(dir)
    expect(await validateCwd('~/proj/', dir)).toBe(join(dir, 'proj'))
  })
})

import { execFileSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { commandsSignature, loadCommands, parseFrontmatter } from '../src/features/autocomplete/commands.ts'
import { FileIndex, withDirectories } from '../src/features/autocomplete/file-index.ts'
import { execaExecutor } from '../src/infra/exec.ts'
import { useTempHome } from './helpers.ts'

const home = useTempHome()

async function write(path: string, content = '') {
  await mkdir(join(path, '..'), { recursive: true })
  await writeFile(path, content)
}

describe('file index', () => {
  test('derives directories', () => {
    expect(withDirectories(['src/a/b.ts', 'README.md'])).toEqual([
      { path: 'src/', kind: 'dir' },
      { path: 'src/a/', kind: 'dir' },
      { path: 'src/a/b.ts', kind: 'file' },
      { path: 'README.md', kind: 'file' },
    ])
  })

  test('searches a git repo fuzzily and respects .gitignore', async () => {
    const repo = join(home.dir(), 'repo')
    await write(join(repo, 'src/main/app.ts'))
    await write(join(repo, 'src/components/Button.tsx'))
    await write(join(repo, 'node_modules/lib/index.js'))
    await write(join(repo, '.gitignore'), 'node_modules\n')
    execFileSync('git', ['init', '-q'], { cwd: repo })
    const index = new FileIndex(execaExecutor)
    const app = await index.search(repo, 'mainap')
    expect(app[0]).toEqual({ path: 'src/main/app.ts', kind: 'file' })
    const dirs = await index.search(repo, 'src/comp')
    expect(dirs).toContainEqual({ path: 'src/components/', kind: 'dir' })
    const all = await index.search(repo, 'index')
    expect(all.some((i) => i.path.includes('node_modules'))).toBe(false)
  })

  test('falls back to ripgrep outside git', async () => {
    const dir = join(home.dir(), 'plain')
    await write(join(dir, 'notes/todo.md'))
    const results = await new FileIndex(execaExecutor).search(dir, 'todo')
    expect(results).toContainEqual({ path: 'notes/todo.md', kind: 'file' })
  })
})

describe('commands', () => {
  test('parses frontmatter', () => {
    expect(parseFrontmatter('---\nname: deploy\ndescription: Faz deploy\n---\nbody')).toEqual({
      name: 'deploy',
      description: 'Faz deploy',
    })
    expect(parseFrontmatter('no frontmatter')).toEqual({})
  })

  test('merges project, profile, plugin and builtin sources', async () => {
    const cfg = join(home.dir(), 'cfg')
    const cwd = join(home.dir(), 'proj')
    await write(
      join(cwd, '.claude/skills/deploy/SKILL.md'),
      '---\nname: deploy\ndescription: Deploy do projeto\n---\n',
    )
    await write(join(cfg, 'skills/group/review-pr/SKILL.md'), '---\ndescription: Revisa PR\n---\n')
    await write(join(cfg, 'commands/fix.md'), '---\ndescription: Corrige bug\n---\n')
    await write(join(cfg, 'commands/front/build.md'), 'Builda o front\n')
    const pluginPath = join(cfg, 'plugins/cache/figma')
    await write(join(pluginPath, 'commands/implement.md'), '---\ndescription: Implementa design\n---\n')
    await write(
      join(cfg, 'plugins/installed_plugins.json'),
      JSON.stringify({ version: 2, plugins: { 'figma@official': [{ installPath: pluginPath }] } }),
    )
    const items = await loadCommands(cfg, cwd)
    const byName = Object.fromEntries(items.map((i) => [i.name, i]))
    expect(byName.deploy).toMatchObject({ source: 'project', description: 'Deploy do projeto' })
    expect(byName['review-pr']).toMatchObject({ source: 'profile', description: 'Revisa PR' })
    expect(byName.fix).toMatchObject({ source: 'profile' })
    expect(byName['front:build']).toMatchObject({ source: 'profile', description: 'Builda o front' })
    expect(byName['figma:implement']).toMatchObject({ source: 'plugin' })
    expect(byName.model).toMatchObject({ source: 'builtin', interactive: true })
  })

  test('signature changes when a skill is added', async () => {
    const cfg = join(home.dir(), 'cfg2')
    await mkdir(join(cfg, 'skills'), { recursive: true })
    const before = await commandsSignature(cfg, home.dir())
    await new Promise((r) => setTimeout(r, 20))
    await write(join(cfg, 'skills/new/SKILL.md'), '---\nname: new\n---\n')
    expect(await commandsSignature(cfg, home.dir())).not.toBe(before)
  })
})

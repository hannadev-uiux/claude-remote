import { readdir, readFile, stat } from 'node:fs/promises'
import { basename, join, relative } from 'node:path'
import type { CommandItem, CommandSource } from '@claude-remote/protocol'
import { parse as parseYaml } from 'yaml'
import { BUILTIN_COMMANDS } from './builtin-commands.ts'

type Frontmatter = { name?: unknown; description?: unknown }

export function parseFrontmatter(text: string): Frontmatter {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
  if (!match?.[1]) return {}
  try {
    const data = parseYaml(match[1]) as unknown
    return data && typeof data === 'object' ? (data as Frontmatter) : {}
  } catch {
    return {}
  }
}

function firstLine(text: string): string {
  const body = text.replace(/^---[\s\S]*?---\s*/, '')
  return (
    body
      .split('\n')
      .find((l) => l.trim() && !l.startsWith('#'))
      ?.trim()
      .slice(0, 120) ?? ''
  )
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

/** Finds SKILL.md files up to `depth` levels below `dir` (skills may be grouped in folders). */
async function findSkillFiles(dir: string, depth = 3): Promise<string[]> {
  if (depth < 0) return []
  let entries: import('node:fs').Dirent[]
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }
  const found: string[] = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const sub = join(dir, entry.name)
    if (await exists(join(sub, 'SKILL.md'))) found.push(join(sub, 'SKILL.md'))
    else found.push(...(await findSkillFiles(sub, depth - 1)))
  }
  return found
}

async function findCommandFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { recursive: true, withFileTypes: true })
    return entries.filter((e) => e.isFile() && e.name.endsWith('.md')).map((e) => join(e.parentPath, e.name))
  } catch {
    return []
  }
}

async function readItems(root: string, source: CommandSource, prefix = ''): Promise<CommandItem[]> {
  const items: CommandItem[] = []
  for (const file of await findSkillFiles(join(root, 'skills'))) {
    const text = await readFile(file, 'utf8').catch(() => '')
    const fm = parseFrontmatter(text)
    const name = typeof fm.name === 'string' && fm.name ? fm.name : basename(join(file, '..'))
    const description = typeof fm.description === 'string' ? fm.description : firstLine(text)
    items.push({
      name: `${prefix}${name}`,
      description: description.slice(0, 200),
      source,
      interactive: false,
    })
  }
  const commandsDir = join(root, 'commands')
  for (const file of await findCommandFiles(commandsDir)) {
    const text = await readFile(file, 'utf8').catch(() => '')
    const fm = parseFrontmatter(text)
    // Nested commands are namespaced with ":" (commands/frontend/build.md → frontend:build).
    const name = relative(commandsDir, file).replace(/\.md$/, '').split('/').join(':')
    const description = typeof fm.description === 'string' ? fm.description : firstLine(text)
    items.push({
      name: `${prefix}${name}`,
      description: description.slice(0, 200),
      source,
      interactive: false,
    })
  }
  return items
}

async function pluginRoots(configDir: string): Promise<Array<{ name: string; path: string }>> {
  try {
    const data = JSON.parse(await readFile(join(configDir, 'plugins', 'installed_plugins.json'), 'utf8')) as {
      plugins?: Record<string, Array<{ installPath?: string }>>
    }
    return Object.entries(data.plugins ?? {}).flatMap(([key, installs]) => {
      const path = installs?.at(-1)?.installPath
      return path ? [{ name: key.split('@')[0] ?? key, path }] : []
    })
  } catch {
    return []
  }
}

/** Builtin + profile + project + plugin commands, de-duplicated by name (first source wins). */
export async function loadCommands(configDir: string, cwd: string): Promise<CommandItem[]> {
  const lists: CommandItem[][] = [
    await readItems(join(cwd, '.claude'), 'project'),
    await readItems(configDir, 'profile'),
  ]
  for (const plugin of await pluginRoots(configDir))
    lists.push(await readItems(plugin.path, 'plugin', `${plugin.name}:`))
  lists.push(BUILTIN_COMMANDS)
  const seen = new Set<string>()
  const result: CommandItem[] = []
  for (const item of lists.flat()) {
    if (seen.has(item.name)) continue
    seen.add(item.name)
    result.push(item)
  }
  return result
}

/** Cheap change detector: mtimes of the directories commands are read from. */
export async function commandsSignature(configDir: string, cwd: string): Promise<string> {
  const paths = [
    join(configDir, 'skills'),
    join(configDir, 'commands'),
    join(configDir, 'plugins', 'installed_plugins.json'),
    join(cwd, '.claude', 'skills'),
    join(cwd, '.claude', 'commands'),
  ]
  const mtimes = await Promise.all(
    paths.map((p) =>
      stat(p).then(
        (s) => s.mtimeMs,
        () => 0,
      ),
    ),
  )
  return mtimes.join(':')
}

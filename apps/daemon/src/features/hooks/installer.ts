import { chmod, copyFile, mkdir, readFile, realpath, rm, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import type { Profile } from '@remote-harness/protocol'
import { readJsonFile, writeFileAtomic, writeJsonAtomic } from '../../infra/fs.ts'
import { removePathBlock, renderLauncher, upsertPathBlock } from './launcher.ts'
import { type HookInstallOptions, mergeOurHooks, removeOurHooks } from './settings-hooks.ts'

export const BACKUP_SUFFIX = '.bak-claude-remote'

async function readText(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return ''
    throw error
  }
}

type Settings = Record<string, unknown>

async function updateSettings(path: string, update: (settings: Settings) => Settings): Promise<boolean> {
  const current = ((await readJsonFile(path)) ?? {}) as Settings
  const next = update(current)
  if (JSON.stringify(next) === JSON.stringify(current)) return false
  try {
    await copyFile(path, `${path}${BACKUP_SUFFIX}`)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  await writeJsonAtomic(path, next)
  return true
}

export function settingsPath(profile: Profile): string {
  return join(profile.configDir, 'settings.json')
}

export async function installHooks(profile: Profile, options: HookInstallOptions): Promise<boolean> {
  return updateSettings(settingsPath(profile), (s) => mergeOurHooks(s, options))
}

export async function uninstallHooks(profile: Profile): Promise<boolean> {
  return updateSettings(settingsPath(profile), (s) => removeOurHooks(s))
}

export async function installLaunchers(
  profiles: readonly Profile[],
  options: { binDir: string; tmuxSession: string; tmuxBin: string },
): Promise<string[]> {
  await mkdir(options.binDir, { recursive: true })
  const written: string[] = []
  for (const profile of profiles) {
    const path = join(options.binDir, profile.id)
    await writeFileAtomic(path, renderLauncher(profile, options))
    await chmod(path, 0o755)
    written.push(path)
  }
  return written
}

export async function uninstallLaunchers(profiles: readonly Profile[], binDir: string): Promise<void> {
  for (const profile of profiles) await rm(join(binDir, profile.id), { force: true })
}

const RC_FILES: Record<string, string> = { zsh: '.zshrc', bash: '.bashrc' }

/**
 * Startup files that get the PATH block: the rc of `$SHELL` (zsh or bash) first, even if it does not
 * exist yet, then the other zsh/bash rc files that exist. With another shell and no rc file, `fallback`.
 */
export function shellRcFiles(o: {
  home: string
  shell: string | undefined
  exists: (path: string) => boolean
  fallback: '.zshrc' | '.bashrc'
}): string[] {
  const own = RC_FILES[basename(o.shell ?? '')]
  const files = [
    ...(own ? [own] : []),
    ...Object.values(RC_FILES).filter((rc) => rc !== own && o.exists(join(o.home, rc))),
  ]
  return (files.length > 0 ? files : [o.fallback]).map((rc) => join(o.home, rc))
}

/** zsh and bash rc files of `home` that exist (where a PATH block may have been written). */
export function existingRcFiles(home: string, exists: (path: string) => boolean): string[] {
  return Object.values(RC_FILES)
    .map((rc) => join(home, rc))
    .filter(exists)
}

/** read → merge → backup → atomic write; follows symlinks (dotfile managers) and keeps the mode. */
async function updateTextFile(path: string, update: (content: string) => string): Promise<boolean> {
  let target = path
  let mode: number | undefined
  try {
    target = await realpath(path)
    mode = (await stat(target)).mode & 0o777
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  const current = await readText(target)
  const next = update(current)
  if (next === current) return false
  if (mode !== undefined) await copyFile(target, `${path}${BACKUP_SUFFIX}`)
  await writeFileAtomic(target, next, mode)
  return true
}

/** Adds the launcher dir to the PATH in each file (idempotent); returns the files that changed. */
export async function installShellPath(binDir: string, files: readonly string[]): Promise<string[]> {
  const changed: string[] = []
  for (const file of files) {
    if (await updateTextFile(file, (content) => upsertPathBlock(content, binDir))) changed.push(file)
  }
  return changed
}

/** Removes the PATH block from each file; returns the files that changed. */
export async function uninstallShellPath(files: readonly string[]): Promise<string[]> {
  const changed: string[] = []
  for (const file of files) {
    if (await updateTextFile(file, removePathBlock)) changed.push(file)
  }
  return changed
}

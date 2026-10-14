import { chmod, copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { Profile } from '@claude-remote/protocol'
import { readJsonFile, writeFileAtomic, writeJsonAtomic } from '../../infra/fs.ts'
import { removeZshrcBlock, renderLauncher, upsertZshrcBlock } from './launcher.ts'
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

export async function installZshrc(binDir: string, zshrc = join(homedir(), '.zshrc')): Promise<boolean> {
  const current = await readText(zshrc)
  const next = upsertZshrcBlock(current, binDir)
  if (next === current) return false
  await writeFile(zshrc, next)
  return true
}

export async function uninstallZshrc(zshrc = join(homedir(), '.zshrc')): Promise<boolean> {
  const current = await readText(zshrc)
  const next = removeZshrcBlock(current)
  if (next === current) return false
  await writeFile(zshrc, next)
  return true
}

import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { Profile } from '@remote-harness/protocol'
import type { Config } from '../../core/config.ts'
import type { Messages } from '../../core/i18n/index.ts'
import { expandHome, paths } from '../../core/paths.ts'
import { ensureHookSecret } from '../../core/secrets.ts'
import type { Executor } from '../../infra/exec.ts'
import { isDirectory } from '../../infra/fs.ts'
import type { Platform } from '../../infra/platform.ts'
import { agentFor, hasAgentAdapter, profileAgentId } from '../agents/index.ts'
import {
  installHooks,
  installLaunchers,
  installShellPath,
  installStatusLine,
  installStatusLineScript,
  settingsPath,
  shellRcFiles,
  uninstallHooks,
  uninstallLaunchers,
  uninstallStatusLine,
} from '../hooks/installer.ts'
import type { ServiceManager } from '../service/service-manager.ts'

/** One line of installer output: `done` = changed now, `skip` = already in place. */
export type InstallLine = { status: 'done' | 'skip'; text: string }

export type InstallOptions = {
  exec: Executor
  /** dist/cli.js, used by the `claude-remote` shortcut; null when running from source without a build. */
  cliPath: string | null
  nodePath: string
  platform: Platform
  /** Startup files that get the PATH block (see `shellRcFiles`). */
  rcFiles: readonly string[]
}

/** The rc files for this user: `$SHELL`'s first; ~/.zshrc on macOS / ~/.bashrc on Linux as fallback. */
export function userRcFiles(platform: Platform, home = homedir(), shell = process.env.SHELL): string[] {
  return shellRcFiles({
    home,
    shell,
    exists: existsSync,
    fallback: platform === 'darwin' ? '.zshrc' : '.bashrc',
  })
}

/** `~/…` form of paths under home, joined for display. */
export function displayPaths(files: readonly string[], home = homedir()): string {
  return files.map((f) => (f.startsWith(`${home}/`) ? `~/${f.slice(home.length + 1)}` : f)).join(', ')
}

/** CLI shortcut names; `claude-remote` is the alias kept from before the rename. */
export const CLI_NAMES = ['remote-harness', 'claude-remote'] as const

/** Launchers, `remote-harness` shortcut (and its `claude-remote` alias), PATH in the shell rc files and hooks in every (resolved) profile. */
export async function installAll(
  config: Config,
  profiles: readonly Profile[],
  o: InstallOptions,
  m: Messages['install'],
): Promise<InstallLine[]> {
  const lines: InstallLine[] = []
  const which = await o.exec('which', ['tmux'])
  const tmuxBin = which.exitCode === 0 ? which.stdout.trim() : 'tmux'
  const launchers = await installLaunchers(profiles, {
    binDir: paths.bin(),
    tmuxSession: config.tmuxSession,
    tmuxBin,
    missingKey: m.missingProviderKey,
  })
  for (const path of launchers) lines.push({ status: 'done', text: `launcher ${path}` })
  if (o.cliPath) {
    const script = `#!/bin/sh\nexec "${o.nodePath}" "${o.cliPath}" "$@"\n`
    for (const name of CLI_NAMES) await writeFile(join(paths.bin(), name), script, { mode: 0o755 })
    lines.push({ status: 'done', text: m.shortcut(join(paths.bin(), CLI_NAMES[0])) })
  }
  const changed = await installShellPath(paths.bin(), o.rcFiles)
  lines.push({
    status: changed.length > 0 ? 'done' : 'skip',
    text: m.shellPath(displayPaths(changed.length > 0 ? changed : o.rcFiles)),
  })
  const secret = await ensureHookSecret()
  const statusLineScript = await installStatusLineScript(paths.bin(), { port: config.hookPort, secret })
  for (const profile of profiles) {
    const changed = await installHooks(profile, {
      port: config.hookPort,
      secret,
      permissionTimeoutSec: config.hookPermissionTimeoutSec,
    })
    lines.push({ status: changed ? 'done' : 'skip', text: m.hooksIn(settingsPath(profile)) })
    if (!agentFor(profile).statusLine) continue
    const wrapped = await installStatusLine(profile, statusLineScript)
    lines.push({ status: wrapped ? 'done' : 'skip', text: m.statusLineIn(settingsPath(profile)) })
  }
  if (profiles.some((p) => agentFor(p).hooks.style === 'codex-hooks'))
    lines.push({ status: 'skip', text: m.codexTrust })
  return lines
}

/** Removes launchers and hooks of profiles that left the config; other files are untouched. */
export async function removeProfiles(
  remove: { launchers: readonly Profile[]; hooks: readonly Profile[] },
  m: Messages['install'],
): Promise<InstallLine[]> {
  await uninstallLaunchers(remove.launchers, paths.bin())
  const lines: InstallLine[] = remove.launchers.map((p) => ({
    status: 'done',
    text: m.launcherRemoved(p.id),
  }))
  for (const profile of remove.hooks) {
    const resolved = { ...profile, configDir: expandHome(profile.configDir) }
    // A profile of an agent without an adapter never got hooks.
    if (!hasAgentAdapter(profileAgentId(resolved)) || !(await isDirectory(resolved.configDir))) continue
    const removed = await uninstallHooks(resolved)
    lines.push({ status: removed ? 'done' : 'skip', text: m.hooksRemovedFrom(settingsPath(resolved)) })
    if (!agentFor(resolved).statusLine) continue
    const restored = await uninstallStatusLine(resolved)
    lines.push({ status: restored ? 'done' : 'skip', text: m.statusLineRestored(settingsPath(resolved)) })
  }
  return lines
}

/** (Re)installs the background service for this build with the current PATH. */
export async function installServiceFromCli(
  o: InstallOptions & { cliPath: string; service: ServiceManager },
): Promise<string> {
  const iconPng = fileURLToPath(new URL('../../mobile/assets/icon.png', pathToFileURL(o.cliPath)))
  return o.service.install({
    nodePath: o.nodePath,
    cliPath: o.cliPath,
    logsDir: paths.logs(),
    path: process.env.PATH ?? '/usr/bin:/bin',
    iconPng: existsSync(iconPng) ? iconPng : undefined,
  })
}

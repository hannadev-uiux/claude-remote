import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { Profile } from '@claude-remote/protocol'
import type { Config } from '../../core/config.ts'
import { expandHome, paths } from '../../core/paths.ts'
import { ensureHookSecret } from '../../core/secrets.ts'
import type { Executor } from '../../infra/exec.ts'
import { isDirectory } from '../../infra/fs.ts'
import {
  installHooks,
  installLaunchers,
  installZshrc,
  settingsPath,
  uninstallHooks,
  uninstallLaunchers,
} from '../hooks/installer.ts'
import { installAppBundle, installService } from '../service/launchd.ts'

/** One line of installer output: `done` = changed now, `skip` = already in place. */
export type InstallLine = { status: 'done' | 'skip'; text: string }

export type InstallOptions = {
  exec: Executor
  /** dist/cli.js, used by the `claude-remote` shortcut; null when running from source without a build. */
  cliPath: string | null
  nodePath: string
}

/** Launchers, `claude-remote` shortcut, PATH in ~/.zshrc and hooks in every (resolved) profile. */
export async function installAll(
  config: Config,
  profiles: readonly Profile[],
  o: InstallOptions,
): Promise<InstallLine[]> {
  const lines: InstallLine[] = []
  const which = await o.exec('which', ['tmux'])
  const tmuxBin = which.exitCode === 0 ? which.stdout.trim() : 'tmux'
  const launchers = await installLaunchers(profiles, {
    binDir: paths.bin(),
    tmuxSession: config.tmuxSession,
    tmuxBin,
  })
  for (const path of launchers) lines.push({ status: 'done', text: `launcher ${path}` })
  if (o.cliPath) {
    const shim = join(paths.bin(), 'claude-remote')
    await writeFile(shim, `#!/bin/sh\nexec "${o.nodePath}" "${o.cliPath}" "$@"\n`, { mode: 0o755 })
    lines.push({ status: 'done', text: `atalho ${shim}` })
  }
  lines.push({ status: (await installZshrc(paths.bin())) ? 'done' : 'skip', text: 'PATH no ~/.zshrc' })
  const secret = await ensureHookSecret()
  for (const profile of profiles) {
    const changed = await installHooks(profile, {
      port: config.hookPort,
      secret,
      permissionTimeoutSec: config.hookPermissionTimeoutSec,
    })
    lines.push({ status: changed ? 'done' : 'skip', text: `hooks em ${settingsPath(profile)}` })
  }
  return lines
}

/** Removes launchers and hooks of profiles that left the config; other files are untouched. */
export async function removeProfiles(remove: {
  launchers: readonly Profile[]
  hooks: readonly Profile[]
}): Promise<InstallLine[]> {
  await uninstallLaunchers(remove.launchers, paths.bin())
  const lines: InstallLine[] = remove.launchers.map((p) => ({
    status: 'done',
    text: `launcher ${p.id} removido`,
  }))
  for (const profile of remove.hooks) {
    const resolved = { ...profile, configDir: expandHome(profile.configDir) }
    if (!(await isDirectory(resolved.configDir))) continue
    const removed = await uninstallHooks(resolved)
    lines.push({ status: removed ? 'done' : 'skip', text: `hooks removidos de ${settingsPath(resolved)}` })
  }
  return lines
}

/** Builds the "Claude Remote" app bundle and (re)loads the LaunchAgent with the current PATH. */
export async function installServiceFromCli(o: InstallOptions & { cliPath: string }): Promise<string> {
  const iconPng = fileURLToPath(new URL('../../mobile/assets/icon.png', pathToFileURL(o.cliPath)))
  const executable = await installAppBundle(o.exec, {
    appDir: paths.app(),
    nodePath: o.nodePath,
    cliPath: o.cliPath,
    iconPng: existsSync(iconPng) ? iconPng : undefined,
  })
  return installService(o.exec, {
    executable,
    logsDir: paths.logs(),
    path: process.env.PATH ?? '/usr/bin:/bin',
    home: homedir(),
  })
}

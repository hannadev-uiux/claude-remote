import { mkdir, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { Executor } from '../../infra/exec.ts'

export const LAUNCHD_LABEL = 'tech.doctorx.claude-remote'

export function plistPath(home = homedir()): string {
  return join(home, 'Library', 'LaunchAgents', `${LAUNCHD_LABEL}.plist`)
}

function xml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export type PlistOptions = {
  nodePath: string
  cliPath: string
  logsDir: string
  /** PATH captured from the installing shell so tmux, git, rg and claude resolve under launchd. */
  path: string
  home: string
}

export function renderPlist(o: PlistOptions): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LAUNCHD_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${xml(o.nodePath)}</string>
    <string>${xml(o.cliPath)}</string>
    <string>start</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>${xml(o.path)}</string>
    <key>HOME</key>
    <string>${xml(o.home)}</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ThrottleInterval</key>
  <integer>10</integer>
  <key>StandardOutPath</key>
  <string>${xml(join(o.logsDir, 'daemon.log'))}</string>
  <key>StandardErrorPath</key>
  <string>${xml(join(o.logsDir, 'daemon.err.log'))}</string>
</dict>
</plist>
`
}

function domain(): string {
  return `gui/${process.getuid?.() ?? 501}`
}

export async function installService(
  exec: Executor,
  options: PlistOptions,
  home = homedir(),
): Promise<string> {
  const path = plistPath(home)
  await mkdir(join(home, 'Library', 'LaunchAgents'), { recursive: true })
  await mkdir(options.logsDir, { recursive: true })
  await writeFile(path, renderPlist(options))
  await exec('launchctl', ['bootout', `${domain()}/${LAUNCHD_LABEL}`])
  const result = await exec('launchctl', ['bootstrap', domain(), path])
  if (result.exitCode !== 0) throw new Error(`launchctl bootstrap falhou: ${result.stderr.trim()}`)
  return path
}

export async function uninstallService(exec: Executor, home = homedir()): Promise<void> {
  await exec('launchctl', ['bootout', `${domain()}/${LAUNCHD_LABEL}`])
  await rm(plistPath(home), { force: true })
}

export async function serviceStatus(exec: Executor): Promise<{ loaded: boolean; detail: string }> {
  const result = await exec('launchctl', ['print', `${domain()}/${LAUNCHD_LABEL}`])
  if (result.exitCode !== 0) return { loaded: false, detail: 'não carregado' }
  const state = /state = (\w+)/.exec(result.stdout)?.[1] ?? 'desconhecido'
  const pid = /pid = (\d+)/.exec(result.stdout)?.[1]
  return { loaded: true, detail: pid ? `${state} (pid ${pid})` : state }
}

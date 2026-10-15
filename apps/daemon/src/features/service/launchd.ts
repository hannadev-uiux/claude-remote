import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import type { Executor } from '../../infra/exec.ts'

export const LAUNCHD_LABEL = 'tech.doctorx.claude-remote'
/** Name shown by macOS in "Login Items" and in the background activity notification. */
export const APP_NAME = 'Claude Remote'
const APP_EXECUTABLE = 'claude-remote'

export function appExecutablePath(appDir: string): string {
  return join(appDir, 'Contents', 'MacOS', APP_EXECUTABLE)
}

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
  /** Program launchd runs: the executable inside the Claude Remote.app bundle. */
  executable: string
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
    <string>${xml(o.executable)}</string>
  </array>
  <key>AssociatedBundleIdentifiers</key>
  <array>
    <string>${LAUNCHD_LABEL}</string>
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

/** Removes duplicated PATH entries (login shells often repeat them), keeping the first occurrence. */
export function dedupePath(path: string): string {
  return [...new Set(path.split(':').filter(Boolean))].join(':')
}

export function renderAppInfoPlist(hasIcon: boolean): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key>
  <string>${APP_NAME}</string>
  <key>CFBundleDisplayName</key>
  <string>${APP_NAME}</string>
  <key>CFBundleIdentifier</key>
  <string>${LAUNCHD_LABEL}</string>
  <key>CFBundleExecutable</key>
  <string>${APP_EXECUTABLE}</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>LSBackgroundOnly</key>
  <true/>${hasIcon ? '\n  <key>CFBundleIconFile</key>\n  <string>AppIcon</string>' : ''}
</dict>
</plist>
`
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`
}

export function renderAppLauncher(nodePath: string, cliPath: string): string {
  return `#!/bin/sh\nexec ${shellQuote(nodePath)} ${shellQuote(cliPath)} start --wait-tailscale\n`
}

export type AppBundleOptions = {
  appDir: string
  nodePath: string
  cliPath: string
  /** 1024px PNG converted to AppIcon.icns; skipped when absent. */
  iconPng?: string
}

/**
 * Builds a minimal ad-hoc signed app bundle that execs the daemon. macOS names background items
 * after the signer of the launched program, so pointing launchd at node would show
 * "Node.js Foundation"; the bundle makes it show "Claude Remote" with the app icon.
 */
export async function installAppBundle(exec: Executor, o: AppBundleOptions): Promise<string> {
  await rm(o.appDir, { recursive: true, force: true })
  const contents = join(o.appDir, 'Contents')
  await mkdir(join(contents, 'MacOS'), { recursive: true })
  await mkdir(join(contents, 'Resources'), { recursive: true })
  const executable = appExecutablePath(o.appDir)
  await writeFile(executable, renderAppLauncher(o.nodePath, o.cliPath))
  await chmod(executable, 0o755)
  const hasIcon = o.iconPng
    ? await buildIcns(exec, o.iconPng, join(contents, 'Resources', 'AppIcon.icns'))
    : false
  await writeFile(join(contents, 'Info.plist'), renderAppInfoPlist(hasIcon))
  const signed = await exec('codesign', ['--force', '--sign', '-', o.appDir])
  if (signed.exitCode !== 0) throw new Error(`codesign falhou: ${signed.stderr.trim()}`)
  return executable
}

async function buildIcns(exec: Executor, png: string, out: string): Promise<boolean> {
  const iconset = join(await mkdtemp(join(tmpdir(), 'claude-remote-icon-')), 'AppIcon.iconset')
  try {
    await mkdir(iconset)
    for (const size of [16, 32, 128, 256, 512]) {
      for (const [scale, suffix] of [
        [1, ''],
        [2, '@2x'],
      ] as const) {
        const px = String(size * scale)
        const file = join(iconset, `icon_${size}x${size}${suffix}.png`)
        const resized = await exec('sips', ['-z', px, px, png, '--out', file])
        if (resized.exitCode !== 0) return false
      }
    }
    return (await exec('iconutil', ['-c', 'icns', iconset, '-o', out])).exitCode === 0
  } finally {
    await rm(join(iconset, '..'), { recursive: true, force: true })
  }
}

function domain(): string {
  return `gui/${process.getuid?.() ?? 501}`
}

/**
 * `bootout` returns before the old job is gone; bootstrapping meanwhile fails with
 * "5: Input/output error". So wait for the job to disappear and retry bootstrap a few times.
 */
export async function installService(
  exec: Executor,
  options: PlistOptions,
  home = homedir(),
  sleep: (ms: number) => Promise<unknown> = delay,
): Promise<string> {
  const path = plistPath(home)
  const target = `${domain()}/${LAUNCHD_LABEL}`
  await mkdir(join(home, 'Library', 'LaunchAgents'), { recursive: true })
  await mkdir(options.logsDir, { recursive: true })
  await writeFile(path, renderPlist({ ...options, path: dedupePath(options.path) }))
  await exec('launchctl', ['bootout', target])
  for (let i = 0; i < 50 && (await exec('launchctl', ['print', target])).exitCode === 0; i++) await sleep(100)
  let result = await exec('launchctl', ['bootstrap', domain(), path])
  for (let attempt = 1; result.exitCode !== 0 && attempt < 5; attempt++) {
    await sleep(500 * attempt)
    result = await exec('launchctl', ['bootstrap', domain(), path])
  }
  if (result.exitCode !== 0) throw new Error(`launchctl bootstrap falhou: ${result.stderr.trim()}`)
  return path
}

export async function uninstallService(exec: Executor, home = homedir(), appDir?: string): Promise<void> {
  await exec('launchctl', ['bootout', `${domain()}/${LAUNCHD_LABEL}`])
  await rm(plistPath(home), { force: true })
  if (appDir) await rm(appDir, { recursive: true, force: true })
}

export async function serviceStatus(exec: Executor): Promise<{ loaded: boolean; detail: string }> {
  const result = await exec('launchctl', ['print', `${domain()}/${LAUNCHD_LABEL}`])
  if (result.exitCode !== 0) return { loaded: false, detail: 'não carregado' }
  const state = /state = (\w+)/.exec(result.stdout)?.[1] ?? 'desconhecido'
  const pid = /pid = (\d+)/.exec(result.stdout)?.[1]
  return { loaded: true, detail: pid ? `${state} (pid ${pid})` : state }
}

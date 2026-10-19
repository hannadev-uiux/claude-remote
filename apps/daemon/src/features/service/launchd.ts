import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { chmod, mkdir, mkdtemp, open, readFile, rm, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import type { Locale } from '@remote-harness/protocol'
import { CATALOGS } from '../../core/i18n/index.ts'
import type { Executor } from '../../infra/exec.ts'
import { buildC, launcherSourcePath } from '../../infra/native-build.ts'
import {
  dedupePath,
  type ServiceInstallOptions,
  type ServiceManager,
  type ServiceStatus,
} from './service-manager.ts'

export { dedupePath }

/** launchd label and bundle id; kept from before the rename so the LaunchAgent is replaced in place. */
export const LAUNCHD_LABEL = 'tech.doctorx.claude-remote'
/** Name shown by macOS in "Login Items", the background activity notice and privacy prompts. */
export const APP_NAME = 'Remote Harness'
const APP_EXECUTABLE = 'remote-harness'
/** Fallback executable without the Command Line Tools: runs the arguments launchd passes. */
export const APP_SCRIPT = '#!/bin/sh\nexec "$@"\n'

/** Folder privacy prompts that may show the usage description. */
export const USAGE_DESCRIPTION_KEYS = [
  'NSDocumentsFolderUsageDescription',
  'NSDesktopFolderUsageDescription',
  'NSDownloadsFolderUsageDescription',
  'NSRemovableVolumesUsageDescription',
  'NSNetworkVolumesUsageDescription',
] as const

/** `.lproj` folder of each locale inside the bundle. */
export const LPROJ: Record<Locale, string> = { 'en-US': 'en', 'pt-BR': 'pt-BR', 'es-ES': 'es' }

/** Changes whenever the bundle layout changes, so older bundles are rebuilt once. */
const BUNDLE_FORMAT = 'remote-harness-bundle-1'

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
  /** What launchd runs: the bundle executable, then node, cli.js and its arguments. */
  programArguments: readonly string[]
  logsDir: string
  /** PATH captured from the installing shell so tmux, git, rg and claude resolve under launchd. */
  path: string
  home: string
}

/** `ProgramArguments` of the LaunchAgent: the bundle launcher runs node with the daemon. */
export function daemonProgramArguments(executable: string, nodePath: string, cliPath: string): string[] {
  return [executable, nodePath, cliPath, 'start', '--wait-tailscale']
}

export function renderPlist(o: PlistOptions): string {
  const args = o.programArguments.map((arg) => `    <string>${xml(arg)}</string>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LAUNCHD_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
${args}
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

/** `Info.plist` of the bundle; the usage descriptions are the en-US texts (other languages in `.lproj`). */
export function renderAppInfoPlist(o: { hasIcon: boolean; usage: string }): string {
  const usage = USAGE_DESCRIPTION_KEYS.map(
    (key) => `\n  <key>${key}</key>\n  <string>${xml(o.usage)}</string>`,
  ).join('')
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
  <key>CFBundleDevelopmentRegion</key>
  <string>en</string>
  <key>LSBackgroundOnly</key>
  <true/>${o.hasIcon ? '\n  <key>CFBundleIconFile</key>\n  <string>AppIcon</string>' : ''}${usage}
</dict>
</plist>
`
}

/** `InfoPlist.strings` of one language: the usage description for every folder prompt. */
export function renderInfoPlistStrings(usage: string): string {
  const value = usage.replaceAll('\\', '\\\\').replaceAll('"', '\\"')
  return USAGE_DESCRIPTION_KEYS.map((key) => `"${key}" = "${value}";\n`).join('')
}

/** Usage description of each locale, from the daemon catalogs. */
export function usageDescriptions(): Record<Locale, string> {
  return {
    'en-US': CATALOGS['en-US'].bundle.folderAccess,
    'pt-BR': CATALOGS['pt-BR'].bundle.folderAccess,
    'es-ES': CATALOGS['es-ES'].bundle.folderAccess,
  }
}

export type AppBundleOptions = {
  appDir: string
  /** Compiled launcher to copy as the executable; null falls back to `APP_SCRIPT`. */
  launcher: string | null
  usage: Record<Locale, string>
  /** 1024px PNG converted to AppIcon.icns; skipped when absent. */
  iconPng?: string
}

export type AppBundle = { executable: string; launcher: 'native' | 'script'; rebuilt: boolean }

function stampPath(appDir: string): string {
  return join(appDir, 'Contents', 'Resources', 'bundle-stamp')
}

/**
 * Builds a minimal ad-hoc signed app bundle whose executable runs the daemon. macOS names
 * background items after the signer of the launched program and attributes folder access to the
 * responsible process, so the bundle makes both show "Remote Harness" with the app icon.
 *
 * The ad-hoc signature (and the privacy grants keyed by it) only stays the same while the contents
 * do, so an unchanged bundle (same stamp of the inputs) is left as it is.
 */
export async function installAppBundle(exec: Executor, o: AppBundleOptions): Promise<AppBundle> {
  const executable = appExecutablePath(o.appDir)
  const code = o.launcher ? await readFile(o.launcher) : Buffer.from(APP_SCRIPT)
  const launcher = o.launcher ? 'native' : 'script'
  const stamp = createHash('sha256')
    .update(BUNDLE_FORMAT)
    .update(code)
    .update(o.iconPng ? await readFile(o.iconPng) : '')
    .update(JSON.stringify(o.usage))
    .digest('hex')
  const current = await readFile(stampPath(o.appDir), 'utf8').catch(() => null)
  if (current === stamp && existsSync(executable)) return { executable, launcher, rebuilt: false }

  await rm(o.appDir, { recursive: true, force: true })
  const contents = join(o.appDir, 'Contents')
  await mkdir(join(contents, 'MacOS'), { recursive: true })
  await mkdir(join(contents, 'Resources'), { recursive: true })
  await writeFile(executable, code)
  await chmod(executable, 0o755)
  const hasIcon = o.iconPng
    ? await buildIcns(exec, o.iconPng, join(contents, 'Resources', 'AppIcon.icns'))
    : false
  await writeFile(join(contents, 'Info.plist'), renderAppInfoPlist({ hasIcon, usage: o.usage['en-US'] }))
  for (const [locale, text] of Object.entries(o.usage) as [Locale, string][]) {
    const lproj = join(contents, 'Resources', `${LPROJ[locale]}.lproj`)
    await mkdir(lproj, { recursive: true })
    await writeFile(join(lproj, 'InfoPlist.strings'), renderInfoPlistStrings(text))
  }
  await writeFile(stampPath(o.appDir), stamp)
  const signed = await exec('codesign', ['--force', '--sign', '-', o.appDir])
  if (signed.exitCode !== 0) throw new Error(`codesign failed: ${signed.stderr.trim()}`)
  return { executable, launcher, rebuilt: true }
}

/** What the bundle runs: the compiled launcher, the script fallback, or nothing installed. */
export async function bundleLauncherKind(appDir: string): Promise<'native' | 'script' | 'missing'> {
  const file = await open(appExecutablePath(appDir), 'r').catch(() => null)
  if (!file) return 'missing'
  try {
    const head = Buffer.alloc(2)
    await file.read(head, 0, 2, 0)
    return head.toString('latin1') === '#!' ? 'script' : 'native'
  } finally {
    await file.close()
  }
}

async function buildIcns(exec: Executor, png: string, out: string): Promise<boolean> {
  const iconset = join(await mkdtemp(join(tmpdir(), 'remote-harness-icon-')), 'AppIcon.iconset')
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
  if (result.exitCode !== 0) throw new Error(`launchctl bootstrap failed: ${result.stderr.trim()}`)
  return path
}

export async function uninstallService(
  exec: Executor,
  home = homedir(),
  appDirs: readonly string[] = [],
): Promise<void> {
  await exec('launchctl', ['bootout', `${domain()}/${LAUNCHD_LABEL}`])
  await rm(plistPath(home), { force: true })
  for (const dir of appDirs) await rm(dir, { recursive: true, force: true })
}

export async function serviceStatus(exec: Executor): Promise<ServiceStatus> {
  const result = await exec('launchctl', ['print', `${domain()}/${LAUNCHD_LABEL}`])
  if (result.exitCode !== 0) return { loaded: false, detail: 'not loaded' }
  const state = /state = (\w+)/.exec(result.stdout)?.[1] ?? 'unknown'
  const pid = /pid = (\d+)/.exec(result.stdout)?.[1]
  return { loaded: true, detail: pid ? `${state} (pid ${pid})` : state }
}

export type LaunchdServiceOptions = {
  home: string
  appDir: string
  /** Bundle of older versions (`Claude Remote.app`), removed on install and uninstall. */
  legacyAppDir?: string
  /** Where the compiled launcher is cached. */
  buildDir: string
  /** `launcher.c`; null (no sources, or tests) uses the script fallback. Defaults to the shipped one. */
  launcherSource?: string | null
  sleep?: (ms: number) => Promise<unknown>
}

/** macOS: a LaunchAgent that runs the "Remote Harness" app bundle (KeepAlive, starts at login). */
export class LaunchdService implements ServiceManager {
  readonly kind = 'launchd'
  readonly name = LAUNCHD_LABEL

  constructor(
    private readonly exec: Executor,
    private readonly o: LaunchdServiceOptions,
  ) {}

  async available(): Promise<boolean> {
    return true
  }

  async install(options: ServiceInstallOptions): Promise<string> {
    if (this.o.legacyAppDir) await rm(this.o.legacyAppDir, { recursive: true, force: true })
    const source = this.o.launcherSource === undefined ? launcherSourcePath() : this.o.launcherSource
    const build = source
      ? await buildC({ exec: this.exec, source, buildDir: this.o.buildDir, name: 'launcher' })
      : null
    const bundle = await installAppBundle(this.exec, {
      appDir: this.o.appDir,
      launcher: build && 'binary' in build ? build.binary : null,
      usage: usageDescriptions(),
      iconPng: options.iconPng,
    })
    return installService(
      this.exec,
      {
        programArguments: daemonProgramArguments(bundle.executable, options.nodePath, options.cliPath),
        logsDir: options.logsDir,
        path: options.path,
        home: this.o.home,
      },
      this.o.home,
      this.o.sleep,
    )
  }

  uninstall(): Promise<void> {
    const dirs = [this.o.appDir, ...(this.o.legacyAppDir ? [this.o.legacyAppDir] : [])]
    return uninstallService(this.exec, this.o.home, dirs)
  }

  status(): Promise<ServiceStatus> {
    return serviceStatus(this.exec)
  }
}

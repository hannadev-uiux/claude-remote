#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { homedir, userInfo } from 'node:os'
import { join } from 'node:path'
import { text } from 'node:stream/consumers'
import { fileURLToPath } from 'node:url'
import { password } from '@inquirer/prompts'
import {
  LOCALES,
  type Locale,
  LocaleSchema,
  PROVIDER_NAMES,
  type PushMode,
  PushTestResultSchema,
} from '@remote-harness/protocol'
import { Command, InvalidArgumentError, Option } from 'commander'
import qrcode from 'qrcode-terminal'
import { z } from 'zod'
import { configuredLocaleSync, loadConfig, resolveProfiles, updateConfigFile } from './core/config.ts'
import { envVar } from './core/env.ts'
import { type Messages, messagesFor } from './core/i18n/index.ts'
import { createLogger } from './core/logger.ts'
import { paths } from './core/paths.ts'
import {
  ensureHookSecret,
  ensureToken,
  generateToken,
  providerKeyStore,
  type SelectedTokenStore,
  selectTokenStore,
  type TokenStore,
  type TokenStoreKind,
} from './core/secrets.ts'
import { DAEMON_VERSION } from './core/version.ts'
import {
  existingRcFiles,
  settingsPath,
  uninstallHooks,
  uninstallLaunchers,
  uninstallShellPath,
  uninstallStatusLine,
} from './features/hooks/installer.ts'
import { isDefaultConfigDir } from './features/hooks/launcher.ts'
import { RulesLog } from './features/permissions/rules-log.ts'
import { DeviceRegistry, describeDevices } from './features/push/devices.ts'
import { resolvePushMode } from './features/push/mode.ts'
import { LaunchdService } from './features/service/launchd.ts'
import type { ServiceManager } from './features/service/service-manager.ts'
import { SystemdUserService } from './features/service/systemd.ts'
import { colorEnabled, createPaint } from './features/setup/banner.ts'
import {
  displayPaths,
  type InstallOptions,
  installAll,
  installServiceFromCli,
  userRcFiles,
} from './features/setup/install.ts'
import { tildify } from './features/setup/profiles.ts'
import { runSetupWizard, SetupAborted } from './features/setup/wizard.ts'
import { STATUS_LINE_SCRIPT } from './features/status-line/wrapper.ts'
import { installerSourceDir, SourceUpdater, updateSource } from './features/update/update.ts'
import { isDowngrade, isUpdateChannel, UPDATE_CHANNELS, updateLabel } from './features/updates/channel.ts'
import { readUpdateState, UpdateChecker, type UpdateState } from './features/updates/checker.ts'
import { WslHost } from './features/wsl/host.ts'
import { execaExecutor, runInteractive } from './infra/exec.ts'
import { findTailscaleAddress } from './infra/network.ts'
import {
  currentWsl,
  PLATFORM_NAMES,
  type Platform,
  resolvePlatform,
  UnsupportedPlatformError,
} from './infra/platform.ts'
import { resolveWsHost, startDaemon } from './main.ts'
import { SECRET_HEADER } from './transport/hooks-server.ts'

const PushTestReplySchema = z.object({ result: PushTestResultSchema, sent: z.number() })

/** Language of every text below: config `language`, else the system one (read at startup). */
let m: Messages = messagesFor(configuredLocaleSync())

/** Fails before any work on systems without adapters (secrets, service, shell). */
function currentPlatform(): Platform {
  try {
    return resolvePlatform()
  } catch (error) {
    if (!(error instanceof UnsupportedPlatformError)) throw error
    console.error(`✗ ${m.cli.unsupportedPlatform(error.platform, Object.values(PLATFORM_NAMES).join(', '))}`)
    if (error.platform === 'win32') console.error(`  ${m.wsl.windowsHint}`)
    process.exit(1)
  }
}
const platform = currentPlatform()
/** Linux inside WSL2: extra steps for systemd, networking and the Windows logon task. */
const wsl = currentWsl(platform)
const wslHost = wsl ? new WslHost(execaExecutor, { wsl }) : undefined

/** launchd on macOS, systemd user unit on Linux. */
function serviceManager(): ServiceManager {
  return platform === 'darwin'
    ? new LaunchdService(execaExecutor, { home: homedir(), appDir: paths.app() })
    : new SystemdUserService(execaExecutor, { home: homedir(), user: userInfo().username })
}

let selectedStore: Promise<SelectedTokenStore> | undefined

/** Keychain (macOS), Secret Service or 0600 file (Linux); `REMOTE_HARNESS_TOKEN_STORE` forces one. */
function selectStore(): Promise<SelectedTokenStore> {
  selectedStore ??= selectTokenStore({
    platform,
    exec: execaExecutor,
    forced: envVar('TOKEN_STORE'),
  })
  return selectedStore
}

async function tokenStore(): Promise<TokenStore> {
  return (await selectStore()).store
}

function tokenStoreLabel(kind: TokenStoreKind, file = paths.tokenFile()): string {
  const names = m.cli.doctor.tokenStores
  if (kind === 'keychain') return names.keychain
  if (kind === 'secret-tool') return names.secretTool
  return names.file(file)
}

/** Absolute path of the bundled CLI (dist/cli.js), whether running from source or from dist. */
function printPairing(host: string, port: number, token: string): void {
  const url = pairingUrl(host, port, token)
  qrcode.generate(url, { small: true })
  console.log(`\n${url}\n`)
  console.log(m.cli.pair.scan)
}

function installOptions(): InstallOptions {
  return {
    exec: execaExecutor,
    cliPath: builtCliPath(),
    nodePath: process.execPath,
    platform,
    rcFiles: userRcFiles(platform),
  }
}

function builtCliPath(): string | null {
  const path = fileURLToPath(
    new URL(import.meta.url.endsWith('.ts') ? '../dist/cli.js' : './cli.js', import.meta.url),
  )
  return existsSync(path) ? path : null
}

export function pairingUrl(host: string, port: number, token: string): string {
  const params = new URLSearchParams({ host, port: String(port), token })
  return `claude-remote://pair?${params.toString()}`
}

async function notifyDaemon(path: string): Promise<boolean> {
  return (await adminRequest(path)) !== null
}

/** POSTs an admin route of the running daemon; its JSON reply, or null when it is not running. */
async function adminRequest(path: string): Promise<unknown | null> {
  const logger = createLogger({ level: 'silent' })
  const config = await loadConfig(logger)
  const secret = await ensureHookSecret()
  try {
    const response = await fetch(`http://127.0.0.1:${config.hookPort}${path}`, {
      method: 'POST',
      headers: { [SECRET_HEADER]: secret },
    })
    return response.ok ? ((await response.json()) as unknown) : null
  } catch {
    return null
  }
}

/** Push mode for this computer as the daemon resolves it at start. */
async function localPushMode(): Promise<PushMode> {
  const config = await loadConfig(createLogger({ level: 'silent' }))
  return resolvePushMode({
    setting: config.push,
    hasServiceAccount: existsSync(paths.firebaseServiceAccount()),
  })
}

function pushModeLabel(mode: PushMode): string {
  const modes = m.cli.push.modes
  return mode === 'firebase' ? modes.firebase(tildify(paths.firebaseServiceAccount())) : modes[mode]
}

const program = new Command()
  .name('remote-harness')
  .description(m.cli.description)
  .version(DAEMON_VERSION, '-V, --version', m.cli.version)
  .helpOption('-h, --help', m.cli.help)
  .helpCommand('help [command]', m.cli.help)

program
  .command('start')
  .description(m.cli.start.description)
  .option('--dev', m.cli.start.dev)
  .option('--host <host>', m.cli.start.host)
  .option('--wait-tailscale', m.cli.start.waitTailscale)
  .action(async (opts: { dev?: boolean; host?: string; waitTailscale?: boolean }) => {
    const logger = createLogger({ pretty: process.stdout.isTTY })
    try {
      const { kind, store } = await selectStore()
      logger.info({ platform, tokenStore: kind }, 'token store selected')
      let stopDaemon: (() => Promise<void>) | undefined
      const shutdown = async () => {
        logger.info('stopping')
        await stopDaemon?.()
        process.exit(0)
      }
      const daemon = await startDaemon({
        logger,
        exec: execaExecutor,
        tokenStore: store,
        providerKey: (profileId) => providerKeyStore(kind, execaExecutor, profileId).get(),
        dev: opts.dev,
        host: opts.host,
        waitForTailscale: opts.waitTailscale,
        // Update checks and the tray belong to the service daemon, not to development runs.
        // Restarting is exiting: launchd (KeepAlive) / systemd (Restart=always) start it again.
        desktop: opts.dev ? undefined : { cliPath: builtCliPath(), restart: () => void shutdown() },
      })
      stopDaemon = () => daemon.stop()
      process.on('SIGINT', shutdown)
      process.on('SIGTERM', shutdown)
    } catch (error) {
      logger.fatal((error as Error).message)
      process.exit(1)
    }
  })

program
  .command('pair')
  .description(m.cli.pair.description)
  .option('--dev', m.cli.pair.dev)
  .option('--host <host>', m.cli.pair.host)
  .action(async (opts: { dev?: boolean; host?: string }) => {
    const logger = createLogger({ level: 'silent' })
    const config = await loadConfig(logger)
    const token = await ensureToken(await tokenStore())
    let host: string
    try {
      host = resolveWsHost(opts)
    } catch {
      // resolveWsHost only fails when there is no Tailscale interface.
      console.error(`✗ ${m.cli.pair.tailscaleNotFound}`)
      console.error(`  ${m.cli.pair.simulatorHint(config.wsPort)}`)
      process.exit(1)
    }
    printPairing(host, config.wsPort, token)
  })

program
  .command('setup')
  .description(m.cli.setup.description)
  .option('-y, --yes', m.cli.setup.yes)
  .option('--no-service', m.cli.setup.noService)
  .option('--lang <code>', m.cli.setup.lang(LOCALES.join(', ')), (value: string) => {
    const parsed = LocaleSchema.safeParse(value)
    if (!parsed.success) throw new InvalidArgumentError(m.cli.setup.invalidLang(value, LOCALES.join(', ')))
    return parsed.data
  })
  .action(async (opts: { yes?: boolean; service: boolean; lang?: Locale }) => {
    const interactive = !opts.yes && Boolean(process.stdin.isTTY)
    try {
      await runSetupWizard({
        ...installOptions(),
        paint: createPaint(colorEnabled()),
        version: DAEMON_VERSION,
        columns: process.stdout.columns ?? 80,
        interactive,
        service: opts.service,
        lang: opts.lang,
        onLocale: (locale) => {
          m = messagesFor(locale)
        },
        serviceManager: serviceManager(),
        wsl: wslHost,
        installService: async (service) => {
          const cliPath = builtCliPath()
          if (!cliPath) throw new SetupAborted(m.cli.buildMissing)
          return installServiceFromCli({ ...installOptions(), cliPath, service })
        },
        tailscaleAddress: () => findTailscaleAddress(),
        pair: async (host) => {
          const config = await loadConfig(createLogger({ level: 'silent' }))
          printPairing(host, config.wsPort, await ensureToken(await tokenStore()))
        },
        runClaude: (configDir) => {
          // Like the launcher: ~/.claude is the default and must not be passed as CLAUDE_CONFIG_DIR.
          const { CLAUDE_CONFIG_DIR: _, ...env } = process.env
          if (!isDefaultConfigDir(configDir)) env.CLAUDE_CONFIG_DIR = configDir
          return runInteractive('claude', [], { cwd: homedir(), env })
        },
      })
    } catch (error) {
      // Ctrl+C inside a prompt
      if (error instanceof Error && error.name === 'ExitPromptError') {
        console.log(`\n${m.cli.setup.interrupted}`)
        process.exit(130)
      }
      if (error instanceof SetupAborted) {
        console.log(`\n${error.message}`)
        process.exit(1)
      }
      throw error
    }
  })

program
  .command('rotate-token')
  .description(m.cli.rotateToken.description)
  .action(async () => {
    await (await tokenStore()).set(generateToken())
    const notified = await notifyDaemon('/admin/reload-token')
    console.log(notified ? m.cli.rotateToken.rotated : m.cli.rotateToken.rotatedOffline)
    console.log(m.cli.rotateToken.pairAgain)
  })

program
  .command('doctor')
  .description(m.cli.doctor.description)
  .action(async () => {
    const d = m.cli.doctor
    const logger = createLogger({ level: 'silent' })
    const check = (ok: boolean, label: string, hint = '') =>
      console.log(`${ok ? '✓' : '✗'} ${label}${!ok && hint ? ` — ${hint}` : ''}`)
    // zsh runs the launchers (not installed by default on most Linux distributions).
    for (const bin of ['tmux', 'git', 'rg', 'zsh', 'claude']) {
      const result = await execaExecutor('which', [bin])
      check(result.exitCode === 0, bin, d.notOnPath)
    }
    const ip = findTailscaleAddress()
    if (wslHost) {
      const w = m.wsl
      check(true, w.detected(wslHost.distro ?? w.unknownDistro))
      const mode = await wslHost.networkingMode()
      console.log(`· ${w.networking(mode ?? w.networkingUnknown)}`)
      const source = wslHost.tailscale(mode)
      const label = source ? `Tailscale ${source.address} (${w.source[source.source]})` : 'Tailscale'
      check(source !== null, label, w.tailscaleHint)
      const systemd = wslHost.systemdRunning()
      check(systemd, w.systemd, (await wslHost.systemdConfigured()) ? w.systemdPendingHint : w.systemdHint)
      check(await wslHost.logonTask.exists(), w.logonTask, w.logonTaskHint)
    } else {
      check(ip !== null, `Tailscale ${ip ?? ''}`.trim(), d.tailscaleMissing)
    }
    try {
      const config = await loadConfig(logger)
      check(true, `config ${paths.config()}`)
      for (const profile of config.profiles) {
        const result = await execaExecutor('test', [
          '-d',
          profile.configDir.replace(/^~/, process.env.HOME ?? '~'),
        ])
        check(result.exitCode === 0, d.profile(profile.id, profile.configDir), d.dirMissing)
      }
      const { kind: storeKind } = await selectStore()
      for (const profile of config.profiles) {
        if (!profile.provider) continue
        const stored = await providerKeyStore(storeKind, execaExecutor, profile.id)
          .get()
          .catch(() => null)
        const name = PROVIDER_NAMES[profile.provider.kind]
        check(stored !== null, d.providerKey(profile.id, name), d.runProviderKey(profile.id))
      }
      try {
        const response = await fetch(`http://127.0.0.1:${config.hookPort}/health`, {
          headers: { [SECRET_HEADER]: await ensureHookSecret() },
        })
        check(response.ok, d.daemonRunning)
      } catch {
        check(false, d.daemonRunning, d.runStart)
      }
    } catch (error) {
      check(false, 'config', (error as Error).message)
    }
    const { kind, store } = await selectStore()
    const token = await store.get().catch((error: Error) => {
      check(false, d.token(tokenStoreLabel(kind)), error.message)
      return undefined
    })
    if (token !== undefined) check(token !== null, d.token(tokenStoreLabel(kind)), d.runPair)
    const manager = serviceManager()
    const status = (await manager.available()) ? await manager.status() : null
    check(
      status?.loaded ?? false,
      d.service(manager.name, status?.loaded ? status.detail : m.cli.service.notLoaded),
      d.serviceHint,
    )
    if (status?.loaded && manager.linger) check(await manager.linger.enabled(), d.linger, d.lingerHint)
    const devices = new DeviceRegistry(paths.devices())
    await devices.load()
    const platforms = describeDevices(devices.devices())
    const pushMode = await localPushMode().catch(() => null)
    if (pushMode) console.log(`· ${d.pushMode(pushModeLabel(pushMode))}`)
    // Informational: push is optional (it needs the app's permission, and a relay grant or Firebase).
    console.log(`· ${platforms ? d.devices(platforms) : `${d.noDevices} (${d.noDevicesHint})`}`)
    if (pushMode === 'relay' && platforms && !devices.devices().some((device) => device.relay)) {
      console.log(`  ${d.noRelayGrant}`)
    }
  })

program
  .command('install')
  .description(m.cli.install.description)
  .action(async () => {
    const logger = createLogger({ level: 'silent' })
    const config = await loadConfig(logger)
    const profiles = await resolveProfiles(config, createLogger({ level: 'warn' }))
    const lines = await installAll(config, profiles, installOptions(), m.install)
    for (const line of lines) console.log(`${line.status === 'done' ? '✓' : '·'} ${line.text}`)
    console.log(`\n${m.cli.install.openTerminal(displayPaths(userRcFiles(platform).slice(0, 1)))}`)
  })

program
  .command('uninstall')
  .description(m.cli.uninstall.description)
  .action(async () => {
    const logger = createLogger({ level: 'silent' })
    const config = await loadConfig(logger)
    const profiles = await resolveProfiles(config, logger)
    await uninstallLaunchers(config.profiles, paths.bin())
    const rcFiles = existingRcFiles(homedir(), existsSync)
    const removed = await uninstallShellPath(rcFiles)
    console.log(
      `${removed.length > 0 ? '✓' : '·'} ${m.cli.uninstall.shellRemoved(displayPaths(removed.length > 0 ? removed : rcFiles))}`,
    )
    for (const profile of profiles) {
      console.log(
        `${(await uninstallHooks(profile)) ? '✓' : '·'} ${m.cli.uninstall.hooksRemoved(settingsPath(profile))}`,
      )
      console.log(
        `${(await uninstallStatusLine(profile)) ? '✓' : '·'} ${m.install.statusLineRestored(settingsPath(profile))}`,
      )
    }
    await rm(join(paths.bin(), STATUS_LINE_SCRIPT), { force: true })
  })

const service = program.command('service').description(m.cli.service.description)
service
  .command('install')
  .description(m.cli.service.install)
  .action(async () => {
    const cliPath = builtCliPath()
    if (!cliPath) {
      console.error(m.cli.buildMissing)
      process.exit(1)
    }
    const manager = serviceManager()
    if (wslHost && !wslHost.systemdRunning()) {
      console.error(`✗ ${m.wsl.serviceNoSystemd}`)
      process.exit(1)
    }
    if (!(await manager.available())) {
      console.error(`✗ ${m.cli.service.unavailable}`)
      process.exit(1)
    }
    const path = await installServiceFromCli({ ...installOptions(), cliPath, service: manager })
    console.log(`✓ ${m.cli.service.loaded(path)}`)
    if (manager.kind === 'launchd') console.log(`  ${m.cli.service.app(paths.app())}`)
    if (manager.linger && !(await manager.linger.enabled())) console.log(`  ${m.cli.service.lingerHint}`)
    if (wslHost && !(await wslHost.logonTask.exists())) {
      console.log(`  ${m.wsl.logonTaskMissing}: ${wslHost.logonTask.command}`)
    }
    if (!findTailscaleAddress()) console.log(`  ${m.cli.service.tailscaleWaiting}`)
    console.log(`  ${m.cli.service.logs(paths.logs())}`)
  })
service
  .command('uninstall')
  .description(m.cli.service.uninstall)
  .action(async () => {
    await serviceManager().uninstall()
    console.log(`✓ ${m.cli.service.removed}`)
    if (wslHost && (await wslHost.logonTask.remove())) console.log(`✓ ${m.wsl.logonTaskRemoved}`)
  })
service
  .command('status')
  .description(m.cli.service.status)
  .action(async () => {
    const manager = serviceManager()
    const status = await manager.status()
    const detail = status.loaded ? status.detail : m.cli.service.notLoaded
    console.log(`${status.loaded ? '✓' : '✗'} ${manager.name}: ${detail}`)
    if (status.loaded && manager.linger) {
      const lingering = await manager.linger.enabled()
      console.log(`${lingering ? '✓' : '·'} ${m.cli.service.linger(lingering)}`)
    }
    if (wslHost) {
      const task = await wslHost.logonTask.exists()
      console.log(`${task ? '✓' : '·'} ${task ? m.wsl.logonTask : m.wsl.logonTaskMissing}`)
    }
  })

program
  .command('update')
  .description(m.cli.update.description)
  .option('--ref <ref>', m.cli.update.ref)
  .option('--force', m.cli.update.force)
  // Second half, run by `install.sh --update` with the freshly built CLI.
  .addOption(new Option('--finish').hideHelp())
  .addOption(new Option('--from <version>').hideHelp())
  .action(async (opts: { ref?: string; force?: boolean; finish?: boolean; from?: string }) => {
    if (opts.finish) {
      await finishUpdate(opts.from)
      return
    }
    const u = m.cli.update
    // --ref, then REMOTE_HARNESS_REF, then the update channel of the config.
    const ref =
      opts.ref || envVar('REF') || (await loadConfig(createLogger({ level: 'silent' }))).update.channel
    const options = { ...opts, ref }
    const source = updateSource(builtCliPath(), installerSourceDir())
    if (!source.ok) {
      console.error(
        `✗ ${source.reason === 'not-built' ? m.cli.buildMissing : u.notInstaller(tildify(source.root))}`,
      )
      process.exit(1)
    }
    console.log(`▸ ${u.checking(options.ref)}`)
    const updater = new SourceUpdater(execaExecutor, source.root)
    const result = await updater.fetch(options.ref)
    if (result.status === 'dirty' || result.status === 'failed') {
      console.error(
        `✗ ${result.status === 'dirty' ? u.dirty(tildify(source.root)) : u.fetchFailed(result.error)}`,
      )
      process.exit(1)
    }
    if (result.status === 'current' && !options.force) {
      console.log(`✓ ${u.upToDate(DAEMON_VERSION, result.commit.slice(0, 7))}`)
      return
    }
    if (result.status === 'available') {
      console.log(`  ${u.available(result.version ?? '?', result.commit.slice(0, 7))}`)
      if (isDowngrade(DAEMON_VERSION, result.version))
        console.log(`⚠ ${u.older(DAEMON_VERSION, result.version ?? '?')}`)
      if (!(await updater.checkout())) {
        console.error(`✗ ${u.checkoutFailed}`)
        process.exit(1)
      }
    }
    // The new install.sh checks the tools, builds and calls `update --finish` with the new CLI.
    const code = await runInteractive(
      'bash',
      [`${source.root}/install.sh`, '--update', '--ref', options.ref],
      {
        env: {
          ...process.env,
          REMOTE_HARNESS_SRC: source.root,
          REMOTE_HARNESS_LANG: configuredLocaleSync(),
          REMOTE_HARNESS_UPDATE_FROM: DAEMON_VERSION,
        },
      },
    )
    if (code !== 0) {
      console.error(`✗ ${u.failed}`)
      process.exit(code)
    }
  })

/** Refreshes what the new version installs (idempotent) and restarts the service when it is loaded. */
async function finishUpdate(from: string | undefined): Promise<void> {
  const u = m.cli.update
  const logger = createLogger({ level: 'silent' })
  const config = await loadConfig(logger)
  const profiles = await resolveProfiles(config, logger)
  const lines = await installAll(config, profiles, installOptions(), m.install)
  for (const line of lines) if (line.status === 'done') console.log(`✓ ${line.text}`)
  const manager = serviceManager()
  const cliPath = builtCliPath()
  if (cliPath && (await manager.status()).loaded) {
    await installServiceFromCli({ ...installOptions(), cliPath, service: manager })
    console.log(`✓ ${u.serviceRestarted}`)
  } else {
    console.log(`· ${u.serviceNotInstalled}`)
  }
  console.log(
    `\n✓ ${from && from !== DAEMON_VERSION ? u.updated(from, DAEMON_VERSION) : u.rebuilt(DAEMON_VERSION)}`,
  )
}

const updates = program.command('updates').description(m.cli.updates.description)
updates
  .command('status')
  .description(m.cli.updates.status)
  .action(async () => {
    const u = m.cli.updates
    const config = await loadConfig(createLogger({ level: 'silent' }))
    console.log(u.current(DAEMON_VERSION, config.update.channel))
    console.log(`· ${u.autoState(config.update.auto)}`)
    printUpdateState(await readUpdateState(paths.updates()))
  })
updates
  .command('check')
  .description(m.cli.updates.check)
  .action(async () => {
    const reply = await adminRequest('/admin/updates-check')
    const state = reply && typeof reply === 'object' ? (reply as { state?: unknown }).state : undefined
    if (state) {
      printUpdateState(await readUpdateState(paths.updates()))
      return
    }
    // No service daemon (or a development one): check here, without notifying.
    const source = updateSource(builtCliPath(), installerSourceDir())
    if (!source.ok) {
      console.error(
        `✗ ${source.reason === 'not-built' ? m.cli.buildMissing : m.cli.update.notInstaller(tildify(source.root))}`,
      )
      process.exit(1)
    }
    const config = await loadConfig(createLogger({ level: 'silent' }))
    const checker = new UpdateChecker({
      fetch: (ref) => new SourceUpdater(execaExecutor, source.root).fetch(ref),
      statePath: paths.updates(),
      currentVersion: DAEMON_VERSION,
      logger: createLogger({ level: 'silent' }),
      onAvailable: () => {},
    })
    await checker.load()
    printUpdateState(await checker.check(config.update.channel, true))
  })
updates
  .command('channel [name]')
  .description(m.cli.updates.channel)
  .action(async (name: string | undefined) => {
    const u = m.cli.updates
    const config = await loadConfig(createLogger({ level: 'silent' }))
    if (!name) {
      console.log(u.channelSet(config.update.channel))
      return
    }
    if (!isUpdateChannel(name)) {
      console.error(`✗ ${u.invalidChannel(name, UPDATE_CHANNELS.join(', '))}`)
      process.exit(1)
    }
    await updateConfigFile({ update: { ...config.update, channel: name } })
    const reply = await adminRequest('/admin/updates-reload')
    console.log(`✓ ${u.channelSet(name)}`)
    console.log(`  ${reply ? u.applied : u.notRunning}`)
    if (name !== config.update.channel) console.log(`  ${u.runUpdate}`)
  })
updates
  .command('auto <state>')
  .description(m.cli.updates.auto)
  .action(async (state: string) => {
    const u = m.cli.updates
    if (state !== 'on' && state !== 'off') {
      console.error(`✗ ${u.invalidValue(state, 'on, off')}`)
      process.exit(1)
    }
    const config = await loadConfig(createLogger({ level: 'silent' }))
    await updateConfigFile({ update: { ...config.update, auto: state === 'on' } })
    const reply = await adminRequest('/admin/updates-reload')
    console.log(`✓ ${u.autoState(state === 'on')}`)
    console.log(`  ${reply ? u.applied : u.notRunning}`)
  })

function printUpdateState(state: UpdateState | null): void {
  const u = m.cli.updates
  if (!state?.checkedAt) {
    console.log(`· ${u.neverChecked}`)
    return
  }
  console.log(`· ${u.lastCheck(new Date(state.checkedAt).toLocaleString(configuredLocaleSync()))}`)
  const available = state.available
  if (!available) console.log(`✓ ${u.upToDate}`)
  else if (available.downgrade) console.log(`· ${u.older(updateLabel(available, DAEMON_VERSION))}`)
  else console.log(`↑ ${u.available(updateLabel(available, DAEMON_VERSION))}`)
}

const push = program.command('push').description(m.cli.push.description)
push
  .command('status')
  .description(m.cli.push.status)
  .action(async () => {
    const devices = new DeviceRegistry(paths.devices())
    await devices.load()
    const mode = await localPushMode()
    console.log(`${mode === 'off' ? '·' : '✓'} ${m.cli.push.changed(pushModeLabel(mode))}`)
    console.log(`· ${m.cli.push.phones(devices.devices().length)}`)
  })
for (const setting of ['on', 'off'] as const) {
  push
    .command(setting)
    .description(m.cli.push[setting])
    .action(async () => {
      await updateConfigFile({ push: setting === 'on' ? 'auto' : 'off' })
      const reply = await adminRequest('/admin/push-mode')
      console.log(`✓ ${m.cli.push.changed(pushModeLabel(await localPushMode()))}`)
      console.log(`  ${reply ? m.cli.push.applied : m.cli.push.notRunning}`)
    })
}
push
  .command('test')
  .description(m.cli.push.test)
  .action(async () => {
    const reply = PushTestReplySchema.safeParse(await adminRequest('/admin/push-test'))
    if (!reply.success) {
      console.error(`✗ ${m.cli.doctor.daemonRunning} — ${m.cli.doctor.runStart}`)
      process.exit(1)
    }
    const { result, sent } = reply.data
    if (result === 'sent') {
      console.log(`✓ ${m.cli.push.testSent(sent)}`)
      return
    }
    console.error(`✗ ${m.cli.push.testResult[result]}`)
    process.exit(1)
  })

const provider = program.command('provider').description(m.cli.provider.description)
provider
  .command('key <profile>')
  .description(m.cli.provider.key)
  .option('--stdin', m.cli.provider.stdin)
  .action(async (profileId: string, opts: { stdin?: boolean }) => {
    const p = m.cli.provider
    const config = await loadConfig(createLogger({ level: 'silent' }))
    const profile = config.profiles.find((candidate) => candidate.id === profileId)
    if (!profile) {
      console.error(p.unknownProfile(profileId))
      process.exit(1)
    }
    if (!profile.provider) {
      console.error(p.noProvider(profileId))
      process.exit(1)
    }
    const name = PROVIDER_NAMES[profile.provider.kind]
    // The key is read from a hidden prompt (or stdin) and goes straight to the store: never an argument.
    const key = (
      opts.stdin ? await text(process.stdin) : await password({ message: p.prompt(name), mask: '•' })
    ).trim()
    if (!key) {
      console.error(p.empty)
      process.exit(1)
    }
    const { kind } = await selectStore()
    await providerKeyStore(kind, execaExecutor, profileId).set(key)
    console.log(p.saved(profileId, tokenStoreLabel(kind, paths.providerKey(profileId))))
  })

const rules = program.command('rules').description(m.cli.rules.description)
rules
  .command('list')
  .description(m.cli.rules.list)
  .action(async () => {
    const entries = await new RulesLog(paths.rulesLog()).list()
    if (entries.length === 0) console.log(m.cli.rules.empty)
    for (const e of entries)
      console.log(`${e.id}  ${e.createdAt}  ${e.scope.padEnd(7)}  ${e.rule}  →  ${e.file}`)
  })
rules
  .command('undo <id>')
  .description(m.cli.rules.undo)
  .action(async (id: string) => {
    const result = await new RulesLog(paths.rulesLog()).undo(id)
    if (!result) {
      console.error(m.cli.rules.notFound(id))
      process.exit(1)
    }
    console.log(
      result.removed ? m.cli.rules.removed(result.entry.rule, result.entry.file) : m.cli.rules.alreadyGone,
    )
  })

await program.parseAsync()

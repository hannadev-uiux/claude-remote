#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { LOCALES, type Locale, LocaleSchema } from '@claude-remote/protocol'
import { Command, InvalidArgumentError } from 'commander'
import qrcode from 'qrcode-terminal'
import { configuredLocaleSync, loadConfig, resolveProfiles } from './core/config.ts'
import { type Messages, messagesFor } from './core/i18n/index.ts'
import { createLogger } from './core/logger.ts'
import { paths } from './core/paths.ts'
import {
  ensureHookSecret,
  ensureToken,
  FileTokenStore,
  generateToken,
  KeychainTokenStore,
  type TokenStore,
} from './core/secrets.ts'
import { DAEMON_VERSION } from './core/version.ts'
import {
  settingsPath,
  uninstallHooks,
  uninstallLaunchers,
  uninstallZshrc,
} from './features/hooks/installer.ts'
import { isDefaultConfigDir } from './features/hooks/launcher.ts'
import { RulesLog } from './features/permissions/rules-log.ts'
import { LAUNCHD_LABEL, serviceStatus, uninstallService } from './features/service/launchd.ts'
import { colorEnabled, createPaint } from './features/setup/banner.ts'
import { type InstallOptions, installAll, installServiceFromCli } from './features/setup/install.ts'
import { runSetupWizard, SetupAborted } from './features/setup/wizard.ts'
import { execaExecutor, runInteractive } from './infra/exec.ts'
import { findTailscaleAddress } from './infra/network.ts'
import { PLATFORM_NAMES, type Platform, resolvePlatform, UnsupportedPlatformError } from './infra/platform.ts'
import { resolveWsHost, startDaemon } from './main.ts'
import { SECRET_HEADER } from './transport/hooks-server.ts'

/** Language of every text below: config `language`, else the system one (read at startup). */
let m: Messages = messagesFor(configuredLocaleSync())

/** Fails before any work on systems without adapters (secrets, service, shell). */
function currentPlatform(): Platform {
  try {
    return resolvePlatform()
  } catch (error) {
    if (!(error instanceof UnsupportedPlatformError)) throw error
    console.error(`✗ ${m.cli.unsupportedPlatform(error.platform, Object.values(PLATFORM_NAMES).join(', '))}`)
    process.exit(1)
  }
}
currentPlatform()

function tokenStore(): TokenStore {
  return process.env.CLAUDE_REMOTE_TOKEN_STORE === 'file'
    ? new FileTokenStore()
    : new KeychainTokenStore(execaExecutor)
}

/** Absolute path of the bundled CLI (dist/cli.js), whether running from source or from dist. */
function printPairing(host: string, port: number, token: string): void {
  const url = pairingUrl(host, port, token)
  qrcode.generate(url, { small: true })
  console.log(`\n${url}\n`)
  console.log(m.cli.pair.scan)
}

function installOptions(): InstallOptions {
  return { exec: execaExecutor, cliPath: builtCliPath(), nodePath: process.execPath }
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
  const logger = createLogger({ level: 'silent' })
  const config = await loadConfig(logger)
  const secret = await ensureHookSecret()
  try {
    const response = await fetch(`http://127.0.0.1:${config.hookPort}${path}`, {
      method: 'POST',
      headers: { [SECRET_HEADER]: secret },
    })
    return response.ok
  } catch {
    return false
  }
}

const program = new Command()
  .name('claude-remote')
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
      const daemon = await startDaemon({
        logger,
        exec: execaExecutor,
        tokenStore: tokenStore(),
        dev: opts.dev,
        host: opts.host,
        waitForTailscale: opts.waitTailscale,
      })
      const shutdown = async () => {
        logger.info('stopping')
        await daemon.stop()
        process.exit(0)
      }
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
    const token = await ensureToken(tokenStore())
    let host: string
    try {
      host = resolveWsHost(opts)
    } catch {
      // resolveWsHost only fails when there is no Tailscale interface.
      console.error(`✗ ${m.cli.pair.tailscaleNotFound}`)
      console.error(`  ${m.cli.pair.simulatorHint}`)
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
        installService: async () => {
          const cliPath = builtCliPath()
          if (!cliPath) throw new SetupAborted(m.cli.buildMissing)
          return installServiceFromCli({ ...installOptions(), cliPath })
        },
        tailscaleAddress: () => findTailscaleAddress(),
        pair: async (host) => {
          const config = await loadConfig(createLogger({ level: 'silent' }))
          printPairing(host, config.wsPort, await ensureToken(tokenStore()))
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
    await tokenStore().set(generateToken())
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
    for (const bin of ['tmux', 'git', 'rg', 'claude']) {
      const result = await execaExecutor('which', [bin])
      check(result.exitCode === 0, bin, d.notOnPath)
    }
    const ip = findTailscaleAddress()
    check(ip !== null, `Tailscale ${ip ?? ''}`.trim(), d.tailscaleMissing)
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
    check((await tokenStore().get()) !== null, d.token, d.runPair)
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
    console.log(`\n${m.cli.install.openTerminal}`)
  })

program
  .command('uninstall')
  .description(m.cli.uninstall.description)
  .action(async () => {
    const logger = createLogger({ level: 'silent' })
    const config = await loadConfig(logger)
    const profiles = await resolveProfiles(config, logger)
    await uninstallLaunchers(config.profiles, paths.bin())
    console.log(`${(await uninstallZshrc()) ? '✓' : '·'} ${m.cli.uninstall.zshrcRemoved}`)
    for (const profile of profiles) {
      console.log(
        `${(await uninstallHooks(profile)) ? '✓' : '·'} ${m.cli.uninstall.hooksRemoved(settingsPath(profile))}`,
      )
    }
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
    const path = await installServiceFromCli({ ...installOptions(), cliPath })
    console.log(`✓ ${m.cli.service.loaded(path)}`)
    console.log(`  ${m.cli.service.app(paths.app())}`)
    if (!findTailscaleAddress()) console.log(`  ${m.cli.service.tailscaleWaiting}`)
    console.log(`  ${m.cli.service.logs(paths.logs())}`)
  })
service
  .command('uninstall')
  .description(m.cli.service.uninstall)
  .action(async () => {
    await uninstallService(execaExecutor, homedir(), paths.app())
    console.log(`✓ ${m.cli.service.removed}`)
  })
service
  .command('status')
  .description(m.cli.service.status)
  .action(async () => {
    const status = await serviceStatus(execaExecutor)
    const detail = status.loaded ? status.detail : m.cli.service.notLoaded
    console.log(`${status.loaded ? '✓' : '✗'} ${LAUNCHD_LABEL}: ${detail}`)
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

#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { Command } from 'commander'
import qrcode from 'qrcode-terminal'
import { loadConfig, resolveProfiles } from './core/config.ts'
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
  installHooks,
  installLaunchers,
  installZshrc,
  settingsPath,
  uninstallHooks,
  uninstallLaunchers,
  uninstallZshrc,
} from './features/hooks/installer.ts'
import { RulesLog } from './features/permissions/rules-log.ts'
import {
  installAppBundle,
  installService,
  LAUNCHD_LABEL,
  serviceStatus,
  uninstallService,
} from './features/service/launchd.ts'
import { execaExecutor } from './infra/exec.ts'
import { findTailscaleAddress } from './infra/network.ts'
import { resolveWsHost, startDaemon } from './main.ts'
import { SECRET_HEADER } from './transport/hooks-server.ts'

function tokenStore(): TokenStore {
  return process.env.CLAUDE_REMOTE_TOKEN_STORE === 'file'
    ? new FileTokenStore()
    : new KeychainTokenStore(execaExecutor)
}

/** Absolute path of the bundled CLI (dist/cli.js), whether running from source or from dist. */
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
  .description('Daemon do Claude Remote: controla sessões do Claude Code no tmux pelo celular')
  .version(DAEMON_VERSION)

program
  .command('start')
  .description('inicia o daemon')
  .option('--dev', 'escuta em 127.0.0.1 em vez do Tailscale')
  .option('--host <host>', 'endereço de escuta do WebSocket')
  .option('--wait-tailscale', 'aguarda a interface do Tailscale em vez de falhar (usado pelo launchd)')
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
  .description('mostra o QR code de pareamento (endereço + token)')
  .option('--dev', 'usa 127.0.0.1')
  .option('--host <host>', 'endereço a anunciar no QR')
  .action(async (opts: { dev?: boolean; host?: string }) => {
    const logger = createLogger({ level: 'silent' })
    const config = await loadConfig(logger)
    const token = await ensureToken(tokenStore())
    let host: string
    try {
      host = resolveWsHost(opts)
    } catch (error) {
      console.error(`✗ ${(error as Error).message}`)
      console.error(
        '  Para testar no simulador deste Mac: `claude-remote start --dev` e `claude-remote pair --dev`.',
      )
      process.exit(1)
    }
    const url = pairingUrl(host, config.wsPort, token)
    qrcode.generate(url, { small: true })
    console.log(`\n${url}\n`)
    console.log('Escaneie com o app Claude Remote. Não compartilhe este código.')
  })

program
  .command('rotate-token')
  .description('gera um novo token e derruba as conexões existentes')
  .action(async () => {
    await tokenStore().set(generateToken())
    const notified = await notifyDaemon('/admin/reload-token')
    console.log(notified ? 'Token trocado; conexões encerradas.' : 'Token trocado (daemon não está rodando).')
    console.log('Rode `claude-remote pair` para parear de novo.')
  })

program
  .command('doctor')
  .description('verifica dependências e configuração')
  .action(async () => {
    const logger = createLogger({ level: 'silent' })
    const check = (ok: boolean, label: string, hint = '') =>
      console.log(`${ok ? '✓' : '✗'} ${label}${!ok && hint ? ` — ${hint}` : ''}`)
    for (const bin of ['tmux', 'git', 'rg', 'claude']) {
      const result = await execaExecutor('which', [bin])
      check(result.exitCode === 0, bin, 'não encontrado no PATH')
    }
    const ip = findTailscaleAddress()
    check(ip !== null, `Tailscale ${ip ?? ''}`.trim(), 'interface 100.x não encontrada')
    try {
      const config = await loadConfig(logger)
      check(true, `config ${paths.config()}`)
      for (const profile of config.profiles) {
        const result = await execaExecutor('test', [
          '-d',
          profile.configDir.replace(/^~/, process.env.HOME ?? '~'),
        ])
        check(result.exitCode === 0, `perfil ${profile.id} (${profile.configDir})`, 'diretório não existe')
      }
      try {
        const response = await fetch(`http://127.0.0.1:${config.hookPort}/health`, {
          headers: { [SECRET_HEADER]: await ensureHookSecret() },
        })
        check(response.ok, 'daemon rodando')
      } catch {
        check(false, 'daemon rodando', 'rode `claude-remote start`')
      }
    } catch (error) {
      check(false, 'config', (error as Error).message)
    }
    check((await tokenStore().get()) !== null, 'token no Keychain', 'rode `claude-remote pair`')
  })

program
  .command('install')
  .description('instala launchers (claudin, drclaude...), PATH no ~/.zshrc e hooks nos perfis')
  .action(async () => {
    const logger = createLogger({ level: 'silent' })
    const config = await loadConfig(logger)
    const profiles = await resolveProfiles(config, createLogger({ level: 'warn' }))
    const secret = await ensureHookSecret()
    const which = await execaExecutor('which', ['tmux'])
    const tmuxBin = which.exitCode === 0 ? which.stdout.trim() : 'tmux'
    const launchers = await installLaunchers(profiles, {
      binDir: paths.bin(),
      tmuxSession: config.tmuxSession,
      tmuxBin,
    })
    for (const path of launchers) console.log(`✓ launcher ${path}`)
    const built = builtCliPath()
    if (built) {
      const shim = join(paths.bin(), 'claude-remote')
      await writeFile(shim, `#!/bin/sh\nexec "${process.execPath}" "${built}" "$@"\n`, { mode: 0o755 })
      console.log(`✓ atalho ${shim}`)
    }
    console.log(`${(await installZshrc(paths.bin())) ? '✓' : '·'} PATH no ~/.zshrc`)
    for (const profile of profiles) {
      const changed = await installHooks(profile, {
        port: config.hookPort,
        secret,
        permissionTimeoutSec: config.hookPermissionTimeoutSec,
      })
      console.log(`${changed ? '✓' : '·'} hooks em ${settingsPath(profile)}`)
    }
    console.log('\nAbra um novo terminal (ou `source ~/.zshrc`) e use os launchers no lugar do `claude`.')
  })

program
  .command('uninstall')
  .description('remove launchers, bloco do ~/.zshrc e hooks instalados')
  .action(async () => {
    const logger = createLogger({ level: 'silent' })
    const config = await loadConfig(logger)
    const profiles = await resolveProfiles(config, logger)
    await uninstallLaunchers(config.profiles, paths.bin())
    console.log(`${(await uninstallZshrc()) ? '✓' : '·'} bloco removido do ~/.zshrc`)
    for (const profile of profiles) {
      console.log(
        `${(await uninstallHooks(profile)) ? '✓' : '·'} hooks removidos de ${settingsPath(profile)}`,
      )
    }
  })

const service = program.command('service').description('daemon como serviço do macOS (launchd)')
service
  .command('install')
  .description('instala e carrega o LaunchAgent (inicia com o login e reinicia se cair)')
  .action(async () => {
    const cliPath = builtCliPath()
    if (!cliPath) {
      console.error('Build não encontrado. Rode `pnpm --filter @claude-remote/daemon build`.')
      process.exit(1)
    }
    const iconPng = fileURLToPath(new URL('../../mobile/assets/icon.png', pathToFileURL(cliPath)))
    const executable = await installAppBundle(execaExecutor, {
      appDir: paths.app(),
      nodePath: process.execPath,
      cliPath,
      iconPng: existsSync(iconPng) ? iconPng : undefined,
    })
    const path = await installService(execaExecutor, {
      executable,
      logsDir: paths.logs(),
      path: process.env.PATH ?? '/usr/bin:/bin',
      home: homedir(),
    })
    console.log(`✓ LaunchAgent carregado: ${path}`)
    console.log(`  app: ${paths.app()}`)
    if (!findTailscaleAddress())
      console.log('  ⚠ Tailscale não encontrado: o daemon fica aguardando a interface 100.x')
    console.log(`  logs em ${paths.logs()}`)
  })
service
  .command('uninstall')
  .description('descarrega e remove o LaunchAgent')
  .action(async () => {
    await uninstallService(execaExecutor, homedir(), paths.app())
    console.log('✓ LaunchAgent removido')
  })
service
  .command('status')
  .description('mostra se o serviço está carregado')
  .action(async () => {
    const status = await serviceStatus(execaExecutor)
    console.log(`${status.loaded ? '✓' : '✗'} ${LAUNCHD_LABEL}: ${status.detail}`)
  })

const rules = program.command('rules').description('regras de "permitir sempre" criadas pelo app')
rules
  .command('list')
  .description('lista as regras criadas pelo app')
  .action(async () => {
    const entries = await new RulesLog(paths.rulesLog()).list()
    if (entries.length === 0) console.log('Nenhuma regra criada pelo app.')
    for (const e of entries)
      console.log(`${e.id}  ${e.createdAt}  ${e.scope.padEnd(7)}  ${e.rule}  →  ${e.file}`)
  })
rules
  .command('undo <id>')
  .description('remove a regra do arquivo em que foi gravada')
  .action(async (id: string) => {
    const result = await new RulesLog(paths.rulesLog()).undo(id)
    if (!result) {
      console.error(`Regra ${id} não encontrada.`)
      process.exit(1)
    }
    console.log(
      result.removed
        ? `Regra ${result.entry.rule} removida de ${result.entry.file}.`
        : 'A regra já não estava no arquivo.',
    )
  })

await program.parseAsync()

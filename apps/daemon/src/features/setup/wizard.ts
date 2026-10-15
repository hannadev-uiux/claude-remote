import { copyFile, mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import type { Profile } from '@claude-remote/protocol'
import { checkbox, confirm, input, select } from '@inquirer/prompts'
import { ConfigSchema } from '../../core/config.ts'
import { expandHome, paths } from '../../core/paths.ts'
import type { Executor } from '../../infra/exec.ts'
import { isDirectory, readJsonFile, writeJsonAtomic } from '../../infra/fs.ts'
import { BACKUP_SUFFIX } from '../hooks/installer.ts'
import { box, type Paint, renderBanner } from './banner.ts'
import { type InstallLine, type InstallOptions, installAll, removeProfiles } from './install.ts'
import {
  detectConfigDirs,
  mergeConfig,
  profilesToRemove,
  readLogin,
  suggestNewConfigDir,
  suggestProfile,
  tildify,
  validateAlias,
  validateNewConfigDir,
} from './profiles.ts'

export type WizardOptions = InstallOptions & {
  paint: Paint
  version: string
  columns: number
  /** false = no questions (`--yes` or no terminal): detected profiles, service on, no pairing. */
  interactive: boolean
  service: boolean
  installService: () => Promise<string>
  tailscaleAddress: () => string | null
  /** Prints the pairing QR code for this host. */
  pair: (host: string) => Promise<void>
  /** Opens Claude Code on this terminal with CLAUDE_CONFIG_DIR=configDir (for the login). */
  runClaude: (configDir: string) => Promise<number>
  home?: string
}

export class SetupAborted extends Error {
  override name = 'SetupAborted'
}

const KEYS_PT: Record<string, string> = {
  navigate: 'navegar',
  select: 'escolher',
  submit: 'confirmar',
  all: 'todos',
  invert: 'inverter',
}

function themeFor(paint: Paint) {
  const accent = (t: string) => paint('accent', t)
  return {
    prefix: { idle: accent('?'), done: paint('success', '✔') },
    style: {
      highlight: accent,
      answer: accent,
      message: (t: string) => paint('bold', t),
      help: (t: string) => paint('muted', t),
      description: (t: string) => paint('muted', t),
      keysHelpTip: (keys: [string, string][]) =>
        paint('dim', keys.map(([key, action]) => `${key} ${KEYS_PT[action] ?? action}`).join(' · ')),
    },
    icon: { cursor: '❯', checked: accent('◉'), unchecked: paint('muted', '◯') },
  }
}

function step(paint: Paint, n: number, total: number, title: string): void {
  console.log(`\n${paint('accent', `── ${n}/${total}`)} ${paint('bold', title)}`)
}

function printLines(paint: Paint, lines: readonly InstallLine[], home = homedir()): void {
  for (const line of lines) {
    const text = line.text.replaceAll(`${home}/`, '~/')
    const mark = line.status === 'done' ? paint('success', '✓') : paint('muted', '·')
    console.log(`  ${mark} ${paint(line.status === 'done' ? 'text' : 'muted', text)}`)
  }
}

async function commandOnPath(exec: Executor, name: string): Promise<string | null> {
  const result = await exec('which', ['-a', name])
  if (result.exitCode !== 0) return null
  return result.stdout.split('\n').find((p) => p && !p.startsWith(paths.bin())) ?? null
}

async function readRawConfig(): Promise<unknown> {
  try {
    return await readJsonFile(paths.config())
  } catch {
    return undefined
  }
}

function currentProfiles(raw: unknown): Profile[] {
  const parsed = ConfigSchema.safeParse(raw)
  return parsed.success ? parsed.data.profiles : []
}

/** Asks which config dirs to manage and the alias/name of each; returns the new profile list. */
async function askProfiles(
  o: WizardOptions,
  existing: readonly Profile[],
  dirs: string[],
): Promise<Profile[]> {
  const theme = themeFor(o.paint)
  console.log(
    o.paint(
      'muted',
      '  Cada conta do Claude Code fica num diretório de configuração (CLAUDE_CONFIG_DIR).\n' +
        '  Para cada uma você escolhe um comando (alias) que a abre no tmux, pronta para o celular.',
    ),
  )
  const configured = new Set(existing.map((p) => tildify(expandHome(p.configDir), o.home)))
  let selected: string[] = []
  if (dirs.length > 0) {
    selected = await checkbox({
      message: 'Quais contas você quer controlar pelo iPhone?',
      choices: dirs.map((dir, i) => {
        const s = suggestProfile(dir, existing, i)
        return {
          name: `${dir.padEnd(22)} ${o.paint('muted', `${s.name} · ${s.id}`)}`,
          value: dir,
          short: dir,
          checked: configured.size === 0 || configured.has(dir),
        }
      }),
      theme,
    })
  } else {
    console.log(o.paint('muted', '  Não encontrei nenhuma conta do Claude Code neste Mac; vamos criar uma.'))
  }

  for (;;) {
    const next = await select({
      message: selected.length > 0 ? 'Mais alguma conta?' : 'Como adicionar a conta?',
      choices: [
        ...(selected.length > 0 ? [{ name: 'Não, continuar', value: 'done' }] : []),
        {
          name: 'Criar uma conta nova',
          value: 'create',
          description:
            'Cria a pasta e abre o Claude Code nela para você fazer login (ex.: conta do trabalho)',
        },
        {
          name: 'Adicionar uma pasta que já existe',
          value: 'existing',
          description: 'Uma pasta usada antes com CLAUDE_CONFIG_DIR=<pasta> claude',
        },
      ],
      theme,
    })
    if (next === 'done') break
    const dir =
      next === 'create'
        ? await createAccount(o, [...dirs, ...selected])
        : await input({
            message: 'Caminho da pasta (ex.: ~/.claude-trabalho):',
            theme,
            validate: async (value) => {
              const path = expandHome(value.trim())
              if (!(await isDirectory(path)))
                return 'Pasta não encontrada. Para uma conta que ainda não existe, escolha "Criar uma conta nova".'
              return true
            },
          })
    if (!dir) continue
    const tilde = tildify(expandHome(dir.trim()), o.home)
    if (!selected.includes(tilde)) selected = [...selected, tilde]
  }

  const profiles: Profile[] = []
  for (const [i, dir] of selected.entries()) {
    const suggestion = suggestProfile(dir, existing, i)
    console.log(`\n  ${o.paint('accent', '▸')} ${o.paint('bold', dir)}`)
    const taken = profiles.map((p) => p.id)
    let id = ''
    for (;;) {
      id = (
        await input({
          message: 'Comando (alias) para abrir esta conta:',
          default: taken.includes(suggestion.id) ? undefined : suggestion.id,
          theme,
          validate: (value) => validateAlias(value.trim(), taken),
        })
      ).trim()
      const clash = await commandOnPath(o.exec, id)
      if (!clash) break
      const keep = await confirm({
        message: `\`${id}\` já existe em ${clash}. O launcher terá prioridade no PATH. Usar mesmo assim?`,
        default: false,
        theme: { ...theme, keywords: { yes: 'sim', no: 'não' } },
      })
      if (keep) break
    }
    const name = (
      await input({
        message: 'Nome exibido no app:',
        default: suggestion.name,
        theme,
        validate: (value) => (value.trim() ? true : 'Dê um nome para reconhecer a conta no app.'),
      })
    ).trim()
    profiles.push({ ...suggestion, id, name })
  }
  return profiles
}

/**
 * Creates the folder of a new account and opens Claude Code there so the user logs in.
 * Returns the folder to add, or null when the user gives up.
 */
async function createAccount(o: WizardOptions, taken: readonly string[]): Promise<string | null> {
  const theme = themeFor(o.paint)
  const dir = (
    await input({
      message: 'Pasta da nova conta:',
      default: suggestNewConfigDir(taken, o.home),
      theme,
      validate: (value) => validateNewConfigDir(value, taken),
    })
  ).trim()
  const tilde = tildify(expandHome(dir), o.home)
  await mkdir(expandHome(dir), { recursive: true })
  const already = await readLogin(dir, o.home)
  if (already) {
    console.log(`  ${o.paint('success', '✓')} ${tilde} já está logada (${already})`)
    return tilde
  }
  console.log(
    o.paint(
      'muted',
      `\n  Vou abrir o Claude Code usando ${tilde}. Lá dentro:\n` +
        '  1. Siga a configuração inicial e entre com a conta que essa pasta vai usar (se não pedir, digite /login)\n' +
        '  2. Depois do login, digite /exit para voltar para cá\n',
    ),
  )
  for (;;) {
    await input({ message: 'Enter para abrir o Claude Code', theme })
    const code = await o.runClaude(expandHome(dir))
    const login = await readLogin(dir, o.home)
    if (login) {
      console.log(`\n  ${o.paint('success', '✓')} Logado em ${tilde} (${login})`)
      return tilde
    }
    console.log(
      o.paint(
        'danger',
        code === 127
          ? '\n  Não consegui abrir o `claude`. Instale o Claude Code: https://claude.com/claude-code'
          : '\n  Não encontrei um login nessa pasta.',
      ),
    )
    const next = await select({
      message: 'E agora?',
      choices: [
        { name: 'Abrir o Claude Code de novo', value: 'retry' },
        { name: 'Adicionar mesmo assim (faço login depois pelo alias)', value: 'add' },
        { name: 'Desistir desta conta', value: 'cancel' },
      ],
      theme,
    })
    if (next === 'add') return tilde
    if (next === 'cancel') return null
  }
}

/** Non-interactive choice: keep the current config, or every detected dir with unique suggestions. */
function defaultProfiles(existing: readonly Profile[], dirs: readonly string[]): Profile[] {
  if (existing.length > 0) return [...existing]
  const profiles: Profile[] = []
  for (const [i, dir] of dirs.entries()) {
    const s = suggestProfile(dir, existing, i)
    let id = s.id
    for (let n = 2; profiles.some((p) => p.id === id); n++) id = `${s.id}-${n}`
    profiles.push({ ...s, id })
  }
  return profiles
}

async function writeConfig(raw: unknown, profiles: readonly Profile[]): Promise<void> {
  const next = mergeConfig(raw, profiles)
  ConfigSchema.parse(next)
  if (raw !== undefined) await copyFile(paths.config(), `${paths.config()}${BACKUP_SUFFIX}`)
  await writeJsonAtomic(paths.config(), next)
}

/** Guided setup: profiles and aliases, launchers/hooks, background service, Tailscale and pairing. */
export async function runSetupWizard(o: WizardOptions): Promise<void> {
  const { paint } = o
  const theme = themeFor(paint)
  const yesNo = { ...theme, keywords: { yes: 'sim', no: 'não' } }
  const total = 4
  console.log(renderBanner(paint, o.version, o.columns))

  step(paint, 1, total, 'Contas do Claude Code')
  const raw = await readRawConfig()
  const existing = currentProfiles(raw)
  const detected = await detectConfigDirs(o.home)
  const dirs = [...new Set([...detected, ...existing.map((p) => tildify(expandHome(p.configDir), o.home))])]
  if (dirs.length === 0 && !o.interactive) {
    throw new SetupAborted(
      'Nenhuma conta do Claude Code encontrada. Rode `claude` uma vez para fazer login e depois `claude-remote setup`.',
    )
  }
  const profiles = o.interactive ? await askProfiles(o, existing, dirs) : defaultProfiles(existing, dirs)

  console.log(
    `\n${box(
      profiles.map(
        (p) =>
          `${paint('accent', p.id.padEnd(16))} ${paint('text', p.name.padEnd(14))} ${paint('muted', p.configDir)}`,
      ),
      paint,
    )}`,
  )
  if (o.interactive && !(await confirm({ message: 'Gravar e instalar?', default: true, theme: yesNo }))) {
    throw new SetupAborted('Nada foi alterado.')
  }

  step(paint, 2, total, 'Instalando launchers, PATH e hooks')
  await writeConfig(raw, profiles)
  printLines(paint, [{ status: 'done', text: `config ${paths.config()}` }], o.home)
  printLines(paint, await removeProfiles(profilesToRemove(existing, profiles)), o.home)
  const resolved = profiles.map((p) => ({ ...p, configDir: expandHome(p.configDir) }))
  printLines(paint, await installAll(ConfigSchema.parse(mergeConfig(raw, profiles)), resolved, o), o.home)

  step(paint, 3, total, 'Serviço em segundo plano')
  const wantsService =
    o.service &&
    (!o.interactive ||
      (await confirm({
        message: 'Iniciar o Claude Remote junto com o Mac (e reiniciar se cair)?',
        default: true,
        theme: yesNo,
      })))
  if (wantsService) {
    printLines(paint, [{ status: 'done', text: `LaunchAgent ${await o.installService()}` }])
  } else {
    console.log(paint('muted', '  Sem serviço: rode `claude-remote start` quando quiser usar.'))
  }

  step(paint, 4, total, 'Tailscale e iPhone')
  let host = o.tailscaleAddress()
  if (!host && o.interactive) {
    console.log(
      paint(
        'muted',
        '  O Mac e o iPhone conversam por uma rede privada do Tailscale (grátis), de qualquer lugar.\n' +
          '  1. No Mac: instale em https://tailscale.com/download/mac (ou `brew install --cask tailscale`) e entre\n' +
          '  2. No iPhone: instale "Tailscale" na App Store e entre com a mesma conta',
      ),
    )
    for (;;) {
      const next = await select({
        message: 'Tailscale conectado no Mac?',
        choices: [
          { name: 'Já conectei, verificar de novo', value: 'retry' },
          { name: 'Fazer isso depois', value: 'skip' },
        ],
        theme,
      })
      host = o.tailscaleAddress()
      if (host || next === 'skip') break
      console.log(paint('danger', '  Ainda não encontrei a interface do Tailscale (100.x).'))
    }
  }
  if (host) {
    console.log(`  ${paint('success', '✓')} Tailscale ${host}`)
    console.log(
      paint(
        'muted',
        '  No iPhone: instale o app Claude Remote e o Tailscale (mesma conta) e toque em "QR code".',
      ),
    )
    if (
      o.interactive &&
      (await confirm({ message: 'Mostrar o QR code de pareamento agora?', default: true, theme: yesNo }))
    ) {
      await o.pair(host)
    }
  }

  const aliases = profiles.map((p) => paint('accent', p.id)).join(', ')
  console.log(
    `\n${box(
      [
        `${paint('success', '✓')} ${paint('bold', 'Claude Remote instalado.')}`,
        '',
        `1. Abra um novo terminal (ou ${paint('bold', 'source ~/.zshrc')})`,
        `2. Use ${aliases} no lugar de ${paint('muted', 'claude')}, com os mesmos argumentos`,
        `3. ${host ? `Pareie com ${paint('bold', 'claude-remote pair')} se ainda não pareou` : `Conecte o Tailscale e rode ${paint('bold', 'claude-remote pair')}`}`,
        '',
        paint('dim', 'claude-remote doctor verifica tudo · claude-remote setup muda as contas'),
      ],
      paint,
    )}\n`,
  )
}

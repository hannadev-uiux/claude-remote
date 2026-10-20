import { copyFile, mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { checkbox, confirm, input, password, select } from '@inquirer/prompts'
import {
  LOCALE_NAMES,
  LOCALES,
  type Locale,
  LocaleSchema,
  PROVIDER_NAMES,
  type Profile,
  type ProviderKind,
} from '@remote-harness/protocol'
import { ConfigSchema } from '../../core/config.ts'
import { type Messages, messagesFor, systemLocale } from '../../core/i18n/index.ts'
import { expandHome, paths } from '../../core/paths.ts'
import type { SecretStore } from '../../core/secrets.ts'
import type { Executor } from '../../infra/exec.ts'
import { isDirectory, readJsonFile, writeJsonAtomic } from '../../infra/fs.ts'
import { BACKUP_SUFFIX } from '../hooks/installer.ts'
import { checkProviderKey } from '../providers/key-check.ts'
import type { ProviderFetch } from '../providers/service.ts'
import type { ServiceManager } from '../service/service-manager.ts'
import type { WslHost } from '../wsl/host.ts'
import { box, type Paint, renderLogo, renderWelcome } from './banner.ts'
import { displayPaths, type InstallLine, type InstallOptions, installAll, removeProfiles } from './install.ts'
import {
  detectConfigDirs,
  mergeConfig,
  profilesToRemove,
  readLogin,
  sameDir,
  suggestNewConfigDir,
  suggestProfile,
  suggestProviderProfile,
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
  serviceManager: ServiceManager
  /** Installs and starts the service for this build; returns the path of the written definition. */
  installService: (service: ServiceManager) => Promise<string>
  tailscaleAddress: () => string | null
  /** Prints the pairing QR code for this host. */
  pair: (host: string) => Promise<void>
  /** Opens Claude Code on this terminal with CLAUDE_CONFIG_DIR=configDir (for the login). */
  runClaude: (configDir: string) => Promise<number>
  /** The secret store of a profile's provider key and where it is (for the output; never the key). */
  providerKeyStore: (profileId: string) => Promise<{ store: SecretStore; label: string }>
  /** Checks provider keys with the gateway; injected so the wizard can be driven offline. */
  fetch: ProviderFetch
  /** Present inside WSL2: systemd in /etc/wsl.conf, mirrored networking and the Windows logon task. */
  wsl?: WslHost
  /** `--lang`: skips the language question. */
  lang?: Locale
  /** Called as soon as the language is known, so the caller speaks it too (e.g. on Ctrl+C). */
  onLocale?: (locale: Locale) => void
  home?: string
}

/** Wizard options plus the catalog of the chosen language. */
type Ctx = WizardOptions & { m: Messages }

export class SetupAborted extends Error {
  override name = 'SetupAborted'
}

function themeFor(paint: Paint, m: Messages) {
  const keyNames: Record<string, string> = m.setup.keys
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
        paint('dim', keys.map(([key, action]) => `${key} ${keyNames[action] ?? action}`).join(' · ')),
    },
    icon: { cursor: '❯', checked: accent('◉'), unchecked: paint('muted', '◯') },
  }
}

function yesNoTheme(paint: Paint, m: Messages) {
  return { ...themeFor(paint, m), keywords: { yes: m.setup.yes, no: m.setup.no } }
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

function savedLocale(raw: unknown): Locale | undefined {
  const language = raw && typeof raw === 'object' ? (raw as { language?: unknown }).language : undefined
  const parsed = LocaleSchema.safeParse(language)
  return parsed.success ? parsed.data : undefined
}

/** `--lang`, else the question (interactive), else the saved language, else the system one. */
async function chooseLocale(o: WizardOptions, raw: unknown): Promise<Locale> {
  if (o.lang) return o.lang
  const fallback = savedLocale(raw) ?? systemLocale()
  if (!o.interactive) return fallback
  return select({
    message: messagesFor(fallback).setup.languageQuestion,
    choices: LOCALES.map((locale) => ({ name: LOCALE_NAMES[locale], value: locale })),
    default: fallback,
    theme: themeFor(o.paint, messagesFor(fallback)),
  })
}

/** The new profile list and the provider keys typed during the wizard (stored only after saving). */
type ProfileAnswers = { profiles: Profile[]; keys: Map<string, string> }

/**
 * Asks which config dirs to manage and the alias/name of each, what to do with the provider
 * profiles already configured, and adds new provider profiles.
 */
async function askProfiles(o: Ctx, existing: readonly Profile[], allDirs: string[]): Promise<ProfileAnswers> {
  const theme = themeFor(o.paint, o.m)
  const t = o.m.setup.accounts
  const mp = o.m.profiles
  console.log(o.paint('muted', t.explain))
  // Provider profiles are managed one by one below, never through the accounts checkbox.
  const providerProfiles = existing.filter((p) => p.provider)
  const dirs = allDirs.filter((dir) => !providerProfiles.some((p) => sameDir(p.configDir, dir)))
  const configured = new Set(
    existing.filter((p) => !p.provider).map((p) => tildify(expandHome(p.configDir), o.home)),
  )
  let selected: string[] = []
  if (dirs.length > 0) {
    selected = await checkbox({
      message: t.which,
      choices: dirs.map((dir, i) => {
        const s = suggestProfile(dir, existing, i, mp)
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
    console.log(o.paint('muted', t.noneFound(o.m.machine[o.platform])))
  }

  const { providers, keys } = await manageProviderProfiles(o, providerProfiles)
  const tp = o.m.setup.provider
  const openRouter = PROVIDER_NAMES.openrouter
  for (;;) {
    const any = selected.length + providers.length > 0
    const next = await select({
      message: any ? t.more : t.howToAdd,
      choices: [
        ...(any ? [{ name: t.noContinue, value: 'done' }] : []),
        {
          name: t.create,
          value: 'create',
          description: t.createDescription,
        },
        {
          name: t.existing,
          value: 'existing',
          description: t.existingDescription,
        },
        { name: tp.add(openRouter), value: 'provider', description: tp.addDescription(openRouter) },
      ],
      theme,
    })
    if (next === 'done') break
    if (next === 'provider') {
      const added = await createProviderProfile(o, 'openrouter', {
        ids: providers.map((p) => p.id),
        dirs: [...dirs, ...selected, ...providers.map((p) => p.configDir)],
        index: selected.length + providers.length,
      })
      providers.push(added.profile)
      if (added.key) keys.set(added.profile.id, added.key)
      continue
    }
    const dir =
      next === 'create'
        ? await createAccount(o, [...dirs, ...selected, ...providers.map((p) => p.configDir)])
        : await input({
            message: t.folderPath,
            theme,
            validate: async (value) => {
              const path = expandHome(value.trim())
              return (await isDirectory(path)) ? true : t.folderNotFound
            },
          })
    if (!dir) continue
    const tilde = tildify(expandHome(dir.trim()), o.home)
    if (!selected.includes(tilde)) selected = [...selected, tilde]
  }

  const profiles: Profile[] = []
  for (const [i, dir] of selected.entries()) {
    const suggestion = suggestProfile(dir, existing, i, mp)
    console.log(`\n  ${o.paint('accent', '▸')} ${o.paint('bold', dir)}`)
    const id = await askAlias(
      o,
      suggestion.id,
      [...profiles, ...providers].map((p) => p.id),
    )
    const name = await askName(o, suggestion.name)
    profiles.push({ ...suggestion, id, name })
  }
  return { profiles: [...profiles, ...providers], keys }
}

/** A valid, unique alias; a command already on PATH with that name needs the user's consent. */
async function askAlias(o: Ctx, suggested: string, taken: readonly string[]): Promise<string> {
  const t = o.m.setup.accounts
  for (;;) {
    const id = (
      await input({
        message: t.alias,
        default: taken.includes(suggested) ? undefined : suggested,
        theme: themeFor(o.paint, o.m),
        validate: (value) => validateAlias(value.trim(), taken, o.m.profiles),
      })
    ).trim()
    const clash = await commandOnPath(o.exec, id)
    if (!clash) return id
    const keep = await confirm({
      message: t.aliasClash(id, clash),
      default: false,
      theme: yesNoTheme(o.paint, o.m),
    })
    if (keep) return id
  }
}

async function askName(o: Ctx, suggested: string): Promise<string> {
  const t = o.m.setup.accounts
  return (
    await input({
      message: t.name,
      default: suggested,
      theme: themeFor(o.paint, o.m),
      validate: (value) => (value.trim() ? true : t.nameRequired),
    })
  ).trim()
}

/** Setup again: keep, re-key or remove each configured provider profile. */
async function manageProviderProfiles(
  o: Ctx,
  configured: readonly Profile[],
): Promise<{ providers: Profile[]; keys: Map<string, string> }> {
  const providers: Profile[] = []
  const keys = new Map<string, string>()
  const tp = o.m.setup.provider
  const kinds = [...new Set(configured.flatMap((p) => (p.provider ? [PROVIDER_NAMES[p.provider.kind]] : [])))]
  if (kinds.length > 0) console.log(o.paint('muted', tp.title(kinds.join(', '))))
  for (const profile of configured) {
    if (!profile.provider) continue
    const { store } = await o.providerKeyStore(profile.id)
    const hasKey = (await store.get().catch(() => null)) !== null
    const name = PROVIDER_NAMES[profile.provider.kind]
    const next = await select({
      message: tp.manage(profile.id, name, hasKey ? tp.keyStored : tp.keyMissing),
      choices: [
        { name: tp.keep, value: 'keep' },
        { name: tp.replaceKey, value: 'key' },
        { name: tp.remove, value: 'remove', description: tp.removeDescription },
      ],
      default: hasKey ? 'keep' : 'key',
      theme: themeFor(o.paint, o.m),
    })
    if (next === 'remove') continue
    providers.push(profile)
    if (next !== 'key') continue
    const key = await askProviderKey(o, profile)
    if (key) keys.set(profile.id, key)
  }
  return { providers, keys }
}

/** Name, alias, folder (created, no login), default model and key of a new provider profile. */
async function createProviderProfile(
  o: Ctx,
  kind: ProviderKind,
  taken: { ids: readonly string[]; dirs: readonly string[]; index: number },
): Promise<{ profile: Profile; key: string | null }> {
  const theme = themeFor(o.paint, o.m)
  const tp = o.m.setup.provider
  const suggestion = suggestProviderProfile(kind, taken.ids, taken.dirs, taken.index)
  console.log(`\n  ${o.paint('accent', '▸')} ${o.paint('bold', PROVIDER_NAMES[kind])}`)
  const name = await askName(o, suggestion.name)
  const id = await askAlias(o, suggestion.id, taken.ids)
  const dir = (
    await input({
      message: tp.folder,
      default: suggestion.configDir,
      theme,
      validate: (value) => validateNewConfigDir(value, taken.dirs, o.m.profiles),
    })
  ).trim()
  await mkdir(expandHome(dir), { recursive: true })
  const model = (await input({ message: tp.model, theme })).trim()
  const profile: Profile = {
    ...suggestion,
    id,
    name,
    configDir: tildify(expandHome(dir), o.home),
    provider: { kind, ...(model ? { model } : {}) },
  }
  return { profile, key: await askProviderKey(o, profile) }
}

/**
 * The key from a hidden prompt, checked with the gateway. `null` = no key for now (empty answer
 * or skipped after a rejection). Nothing is stored here: see `saveProviderKeys`.
 */
async function askProviderKey(o: Ctx, profile: Profile): Promise<string | null> {
  if (!profile.provider) return null
  const { paint } = o
  const tp = o.m.setup.provider
  const theme = themeFor(paint, o.m)
  const name = PROVIDER_NAMES[profile.provider.kind]
  for (;;) {
    const key = (await password({ message: tp.key(name), mask: '•', theme })).trim()
    if (!key) {
      console.log(paint('muted', `  ${tp.later(profile.id)}`))
      return null
    }
    console.log(paint('muted', `  ${tp.checking(name)}`))
    const check = await checkProviderKey(o.fetch, profile.provider, key)
    if (check.status === 'valid') {
      const left = check.credits ? `$${(check.credits.total - check.credits.used).toFixed(2)}` : null
      console.log(`  ${paint('success', '✓')} ${left ? tp.acceptedCredits(left) : tp.accepted}`)
      return key
    }
    if (check.status === 'unknown') {
      console.log(paint('muted', `  ${tp.unchecked(name, check.reason)}`))
      return key
    }
    console.log(paint('danger', `  ${tp.rejected(name)}`))
    const next = await select({
      message: tp.whatNow,
      choices: [
        { name: tp.retry, value: 'retry' },
        { name: tp.keepAnyway, value: 'keep' },
        { name: tp.skip, value: 'skip' },
      ],
      theme,
    })
    if (next === 'keep') return key
    if (next === 'skip') {
      console.log(paint('muted', `  ${tp.later(profile.id)}`))
      return null
    }
  }
}

/** After the config is written: deletes the keys of removed provider profiles, stores the new ones. */
async function saveProviderKeys(
  o: Ctx,
  previous: readonly Profile[],
  next: readonly Profile[],
  keys: ReadonlyMap<string, string>,
): Promise<void> {
  const tp = o.m.setup.provider
  const removed = previous.filter(
    (p) => p.provider && !keys.has(p.id) && !next.some((n) => n.id === p.id && n.provider),
  )
  const lines: InstallLine[] = []
  for (const profile of removed) {
    const { store } = await o.providerKeyStore(profile.id)
    try {
      await store.delete()
      lines.push({ status: 'done', text: tp.keyRemoved(profile.id) })
    } catch (error) {
      console.log(o.paint('danger', `  ${(error as Error).message}`))
    }
  }
  for (const [id, key] of keys) {
    const { store, label } = await o.providerKeyStore(id)
    try {
      await store.set(key)
      lines.push({ status: 'done', text: tp.keySaved(id, label) })
    } catch (error) {
      console.log(o.paint('danger', `  ${tp.keyFailed(id, (error as Error).message)}`))
    }
  }
  printLines(o.paint, lines, o.home)
}

/**
 * Creates the folder of a new account and opens Claude Code there so the user logs in.
 * Returns the folder to add, or null when the user gives up.
 */
async function createAccount(o: Ctx, taken: readonly string[]): Promise<string | null> {
  const theme = themeFor(o.paint, o.m)
  const t = o.m.setup.newAccount
  const mp = o.m.profiles
  const dir = (
    await input({
      message: t.folder,
      default: suggestNewConfigDir(taken, mp, o.home),
      theme,
      validate: (value) => validateNewConfigDir(value, taken, mp),
    })
  ).trim()
  const tilde = tildify(expandHome(dir), o.home)
  await mkdir(expandHome(dir), { recursive: true })
  const already = await readLogin(dir, mp, o.home)
  if (already) {
    console.log(`  ${o.paint('success', '✓')} ${t.alreadyLoggedIn(tilde, already)}`)
    return tilde
  }
  console.log(o.paint('muted', t.instructions(tilde)))
  for (;;) {
    await input({ message: t.pressEnter, theme })
    const code = await o.runClaude(expandHome(dir))
    const login = await readLogin(dir, mp, o.home)
    if (login) {
      console.log(`\n  ${o.paint('success', '✓')} ${t.loggedIn(tilde, login)}`)
      return tilde
    }
    console.log(o.paint('danger', code === 127 ? t.claudeMissing : t.noLogin))
    const next = await select({
      message: t.whatNow,
      choices: [
        { name: t.retry, value: 'retry' },
        { name: t.addAnyway, value: 'add' },
        { name: t.giveUp, value: 'cancel' },
      ],
      theme,
    })
    if (next === 'add') return tilde
    if (next === 'cancel') return null
  }
}

/** Non-interactive choice: keep the current config, or every detected dir with unique suggestions. */
function defaultProfiles(
  existing: readonly Profile[],
  dirs: readonly string[],
  m: Messages['profiles'],
): Profile[] {
  if (existing.length > 0) return [...existing]
  const profiles: Profile[] = []
  for (const [i, dir] of dirs.entries()) {
    const s = suggestProfile(dir, existing, i, m)
    let id = s.id
    for (let n = 2; profiles.some((p) => p.id === id); n++) id = `${s.id}-${n}`
    profiles.push({ ...s, id })
  }
  return profiles
}

async function writeConfig(raw: unknown, profiles: readonly Profile[], language: Locale): Promise<void> {
  const next = mergeConfig(raw, profiles, language)
  ConfigSchema.parse(next)
  if (raw !== undefined) await copyFile(paths.config(), `${paths.config()}${BACKUP_SUFFIX}`)
  await writeJsonAtomic(paths.config(), next)
}

const SERVICE_LABELS = { launchd: 'LaunchAgent', systemd: 'systemd' } as const

/** Step 3: background service and, on systemd, lingering (only with the user's consent). */
async function setupService(o: Ctx): Promise<void> {
  const { paint } = o
  const s = o.m.setup
  const yesNo = yesNoTheme(paint, o.m)
  const service = o.serviceManager
  if (!o.service) {
    console.log(paint('muted', `  ${s.noService}`))
    return
  }
  if (o.wsl && !o.wsl.systemdRunning()) {
    await setupWslSystemd(o, o.wsl)
    return
  }
  if (!(await service.available())) {
    console.log(paint('muted', s.serviceUnavailable))
    return
  }
  const wants =
    !o.interactive ||
    (await confirm({ message: s.serviceQuestion(o.m.machine[o.platform]), default: true, theme: yesNo }))
  if (!wants) {
    console.log(paint('muted', `  ${s.noService}`))
    return
  }
  const path = await o.installService(service)
  printLines(paint, [{ status: 'done', text: `${SERVICE_LABELS[service.kind]} ${path}` }], o.home)
  await setupLinger(o, service)
  if (o.wsl) await setupLogonTask(o, o.wsl)
}

async function setupLinger(o: Ctx, service: ServiceManager): Promise<void> {
  const { paint } = o
  const s = o.m.setup
  const linger = service.linger
  if (!linger || (await linger.enabled())) return
  // Lingering changes how the system treats the user's processes: never without asking.
  const consent =
    o.interactive &&
    (await confirm({ message: s.lingerQuestion, default: true, theme: yesNoTheme(paint, o.m) }))
  if (!consent) {
    console.log(paint('muted', s.lingerSkipped))
    return
  }
  if (await linger.enable()) printLines(paint, [{ status: 'done', text: s.lingerEnabled }])
  else console.log(paint('danger', s.lingerFailed))
}

/** WSL without systemd: offers `[boot] systemd=true` in /etc/wsl.conf (sudo, only with consent). */
async function setupWslSystemd(o: Ctx, wsl: WslHost): Promise<void> {
  const { paint } = o
  const t = o.m.wsl
  if (await wsl.systemdConfigured()) {
    console.log(paint('muted', t.systemdPending))
    console.log(paint('muted', t.restart))
    return
  }
  console.log(paint('muted', t.systemdIntro))
  console.log(paint('accent', t.systemdCommand(await wsl.systemdCommand())))
  // A root file and a WSL restart: never without asking.
  const consent =
    o.interactive &&
    (await confirm({ message: t.systemdQuestion, default: true, theme: yesNoTheme(paint, o.m) }))
  if (!consent) {
    console.log(paint('muted', t.systemdSkipped))
    return
  }
  const result = await wsl.enableSystemd()
  if (result.status === 'failed') {
    console.log(paint('danger', t.systemdFailed(result.error)))
    return
  }
  printLines(paint, [{ status: result.status === 'written' ? 'done' : 'skip', text: t.systemdEnabled }])
  console.log(paint('muted', t.restart))
}

/** WSL: optional Windows Scheduled Task that boots the distribution (and so the service) at logon. */
async function setupLogonTask(o: Ctx, wsl: WslHost): Promise<void> {
  const { paint } = o
  const t = o.m.wsl
  const task = wsl.logonTask
  if (await task.exists()) {
    printLines(paint, [{ status: 'skip', text: t.logonTaskCreated }])
    return
  }
  const consent =
    o.interactive &&
    (await confirm({ message: t.logonTaskQuestion, default: true, theme: yesNoTheme(paint, o.m) }))
  if (!consent) {
    console.log(paint('muted', t.logonTaskSkipped))
    return
  }
  const result = await task.create()
  if (result.ok) printLines(paint, [{ status: 'done', text: t.logonTaskCreated }])
  else console.log(paint('danger', t.logonTaskFailed(result.error, task.command)))
}

/** WSL: writes `networkingMode=mirrored` to .wslconfig; WSL must restart before the address shows up. */
async function enableMirrored(o: Ctx, wsl: WslHost): Promise<void> {
  const t = o.m.wsl
  const result = await wsl.enableMirroredNetworking()
  if (!result) {
    console.log(o.paint('danger', t.mirroredNoConfig))
    return
  }
  const text = result.changed ? t.mirroredEnabled(result.path) : t.mirroredAlready(result.path)
  printLines(o.paint, [{ status: result.changed ? 'done' : 'skip', text }], o.home)
  console.log(o.paint('muted', t.restart))
}

/** Guided setup: profiles and aliases, launchers/hooks, background service, Tailscale and pairing. */
export async function runSetupWizard(options: WizardOptions): Promise<void> {
  const { paint } = options
  const total = 4
  console.log(renderLogo(paint, options.columns))
  const raw = await readRawConfig()
  const locale = await chooseLocale(options, raw)
  options.onLocale?.(locale)
  const m = messagesFor(locale)
  const o: Ctx = { ...options, m }
  const s = m.setup
  const theme = themeFor(paint, m)
  const yesNo = yesNoTheme(paint, m)
  const machine = m.machine[o.platform]
  console.log(`\n${renderWelcome(paint, o.version, s.welcome, machine)}\n`)

  step(paint, 1, total, s.steps.accounts)
  const existing = currentProfiles(raw)
  const detected = await detectConfigDirs(o.home)
  const dirs = [...new Set([...detected, ...existing.map((p) => tildify(expandHome(p.configDir), o.home))])]
  if (dirs.length === 0 && !o.interactive) {
    throw new SetupAborted(s.noAccounts)
  }
  const { profiles, keys } = o.interactive
    ? await askProfiles(o, existing, dirs)
    : { profiles: defaultProfiles(existing, dirs, m.profiles), keys: new Map<string, string>() }

  console.log(
    `\n${box(
      profiles.map((p) => {
        const via = p.provider ? ` ${paint('dim', s.provider.via(PROVIDER_NAMES[p.provider.kind]))}` : ''
        return `${paint('accent', p.id.padEnd(16))} ${paint('text', p.name.padEnd(14))} ${paint('muted', p.configDir)}${via}`
      }),
      paint,
    )}`,
  )
  if (o.interactive && !(await confirm({ message: s.confirmSave, default: true, theme: yesNo }))) {
    throw new SetupAborted(s.nothingChanged)
  }

  step(paint, 2, total, s.steps.installing)
  await writeConfig(raw, profiles, locale)
  printLines(paint, [{ status: 'done', text: `config ${paths.config()}` }], o.home)
  printLines(paint, await removeProfiles(profilesToRemove(existing, profiles), m.install), o.home)
  await saveProviderKeys(o, existing, profiles, keys)
  const resolved = profiles.map((p) => ({ ...p, configDir: expandHome(p.configDir) }))
  const config = ConfigSchema.parse(mergeConfig(raw, profiles, locale))
  printLines(paint, await installAll(config, resolved, o, m.install), o.home)

  step(paint, 3, total, s.steps.service)
  await setupService(o)

  step(paint, 4, total, s.steps.tailscale)
  const wslMode = o.wsl ? await o.wsl.networkingMode() : null
  let host = o.tailscaleAddress()
  if (!host && o.interactive) {
    console.log(
      paint(
        'muted',
        o.wsl ? m.wsl.tailscaleIntro : s.tailscaleIntro(machine, s.tailscaleInstall[o.platform]),
      ),
    )
    // Inside WSL with NAT networking a Tailscale on Windows is invisible: offer mirrored networking.
    const offerMirrored = o.wsl !== undefined && wslMode !== 'mirrored'
    for (;;) {
      const next = await select({
        message: s.tailscaleQuestion(machine),
        choices: [
          { name: s.tailscaleRetry, value: 'retry' },
          ...(offerMirrored ? [{ name: m.wsl.tailscaleMirrored, value: 'mirrored' }] : []),
          { name: s.tailscaleSkip, value: 'skip' },
        ],
        theme,
      })
      if (next === 'mirrored' && o.wsl) {
        await enableMirrored(o, o.wsl)
        break
      }
      host = o.tailscaleAddress()
      if (host || next === 'skip') break
      console.log(paint('danger', s.tailscaleNotYet))
    }
  }
  if (host) {
    const source = o.wsl?.tailscale(wslMode)?.source
    console.log(`  ${paint('success', '✓')} Tailscale ${host}${source ? ` (${m.wsl.source[source]})` : ''}`)
    console.log(paint('muted', s.phoneHint))
    if (o.interactive && (await confirm({ message: s.showQr, default: true, theme: yesNo }))) {
      await o.pair(host)
    }
  }

  const aliases = profiles.map((p) => paint('accent', p.id)).join(', ')
  console.log(
    `\n${box(
      [
        `${paint('success', '✓')} ${paint('bold', s.done.installed)}`,
        '',
        s.done.openTerminal(paint('bold', `source ${displayPaths(o.rcFiles.slice(0, 1), o.home)}`)),
        s.done.useAliases(aliases, paint('muted', 'claude')),
        host
          ? s.done.pairIfNeeded(paint('bold', 'remote-harness pair'))
          : s.done.connectAndPair(paint('bold', 'remote-harness pair')),
        '',
        paint('dim', s.done.footer),
      ],
      paint,
    )}\n`,
  )
}

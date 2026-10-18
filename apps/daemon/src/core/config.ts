import { readFileSync } from 'node:fs'
import { copyFile } from 'node:fs/promises'
import {
  type Locale,
  LocaleSchema,
  type Profile,
  ProfileSchema,
  RuleScopeSchema,
} from '@remote-harness/protocol'
import { z } from 'zod'
import { isDirectory, readJsonFile, writeJsonAtomic } from '../infra/fs.ts'
import { messagesFor, systemLocale } from './i18n/index.ts'
import type { Logger } from './logger.ts'
import { expandHome, paths } from './paths.ts'

export const ConfigSchema = z.object({
  profiles: z.array(ProfileSchema).min(1),
  wsPort: z.number().int().positive().default(7337),
  hookPort: z.number().int().positive().default(7338),
  defaultRuleScope: RuleScopeSchema.default('project'),
  /** How long the daemon waits for the phone before letting the TUI show the dialog. */
  permissionTimeoutSec: z.number().int().positive().default(280),
  /** Timeout written into the PermissionRequest hook; must exceed permissionTimeoutSec. */
  hookPermissionTimeoutSec: z.number().int().positive().default(300),
  inputStrategy: z.enum(['paste', 'type']).default('paste'),
  pasteEnterDelayMs: z.number().int().nonnegative().default(80),
  recentDays: z.number().int().positive().default(7),
  tmuxSession: z.string().min(1).default('claude-remote'),
  /** Language of the CLI, setup and push texts; absent = the system language. */
  language: LocaleSchema.optional(),
  /** `off` sends no push nor live status; `auto` = Firebase service account if present, else the relay. */
  push: z.enum(['auto', 'off']).default('auto'),
  /** Branch `remote-harness update` and the background check follow; `auto` applies updates by itself. */
  update: z
    .object({
      channel: z.enum(['main', 'development']).default('main'),
      auto: z.boolean().default(false),
    })
    .default({ channel: 'main', auto: false }),
  /** Menu bar / tray icon of the service daemon (where a helper is available). */
  tray: z.boolean().default(true),
})
export type Config = z.infer<typeof ConfigSchema>

/** Used only when no config exists; `remote-harness setup` picks the real profiles and aliases. */
export function defaultProfiles(locale: Locale = systemLocale()): Profile[] {
  return [
    {
      id: 'claudin',
      name: messagesFor(locale).profiles.defaultName,
      configDir: '~/.claude',
      color: '#D97757',
    },
  ]
}

/** Language of the CLI, setup and push: the configured one, else the system one. */
export function effectiveLocale(config: Pick<Config, 'language'>, env = process.env): Locale {
  return config.language ?? systemLocale(env)
}

/**
 * Same as `effectiveLocale`, read synchronously and leniently from the config file (CLI startup:
 * command descriptions are built before any async work). A missing or invalid file is ignored.
 */
export function configuredLocaleSync(path = paths.config(), env = process.env): Locale {
  try {
    const raw: unknown = JSON.parse(readFileSync(path, 'utf8'))
    const language = raw && typeof raw === 'object' ? (raw as { language?: unknown }).language : undefined
    const parsed = LocaleSchema.safeParse(language)
    return parsed.success ? parsed.data : systemLocale(env)
  } catch {
    return systemLocale(env)
  }
}

/** Same suffix as the backups of the user's files. */
const CONFIG_BACKUP_SUFFIX = '.bak-claude-remote'

export class ConfigError extends Error {
  override name = 'ConfigError'
}

/** Loads the config, creating it with the default profiles on first run. */
export async function loadConfig(logger: Logger, path = paths.config()): Promise<Config> {
  let raw: unknown
  try {
    raw = await readJsonFile(path)
  } catch (error) {
    throw new ConfigError(`invalid JSON in ${path}: ${(error as Error).message}`)
  }
  if (raw === undefined) {
    raw = { profiles: defaultProfiles() }
    await writeJsonAtomic(path, raw)
    logger.info({ path }, 'created default config')
  }
  const parsed = ConfigSchema.safeParse(raw)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    throw new ConfigError(`invalid config ${path}: ${issue?.path.join('.') || '(root)'}: ${issue?.message}`)
  }
  return parsed.data
}

/**
 * Changes top-level keys of the config file (read → merge → backup → atomic write), keeping
 * everything else as written. Fails on an invalid result instead of writing it.
 */
export async function updateConfigFile(
  patch: Record<string, unknown>,
  path = paths.config(),
): Promise<boolean> {
  const raw = await readJsonFile(path)
  const current = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const next = { ...current, ...patch }
  if (JSON.stringify(next) === JSON.stringify(current)) return false
  const parsed = ConfigSchema.safeParse(next)
  if (!parsed.success) throw new ConfigError(`invalid config ${path}: ${parsed.error.issues[0]?.message}`)
  if (raw !== undefined) await copyFile(path, `${path}${CONFIG_BACKUP_SUFFIX}`)
  await writeJsonAtomic(path, next)
  return true
}

/** Expands `~` and drops profiles whose config dir does not exist. */
export async function resolveProfiles(config: Config, logger: Logger): Promise<Profile[]> {
  const result: Profile[] = []
  for (const profile of config.profiles) {
    const configDir = expandHome(profile.configDir)
    if (await isDirectory(configDir)) {
      result.push({ ...profile, configDir })
    } else {
      logger.warn({ profile: profile.id, configDir }, 'profile config dir not found, ignoring profile')
    }
  }
  return result
}

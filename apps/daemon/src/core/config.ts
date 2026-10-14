import { type Profile, ProfileSchema, RuleScopeSchema } from '@claude-remote/protocol'
import { z } from 'zod'
import { isDirectory, readJsonFile, writeJsonAtomic } from '../infra/fs.ts'
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
})
export type Config = z.infer<typeof ConfigSchema>

export const DEFAULT_PROFILES: Profile[] = [
  { id: 'claudin', name: 'Pessoal', configDir: '~/.claude', color: '#D97757' },
  { id: 'drclaude', name: 'DoctorX', configDir: '~/.claude-doctorx', color: '#61AFEF' },
]

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
    raw = { profiles: DEFAULT_PROFILES }
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

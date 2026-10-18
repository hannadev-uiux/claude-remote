import { z } from 'zod'
import type { Logger } from '../../core/logger.ts'
import { readJsonFile, writeJsonAtomic } from '../../infra/fs.ts'
import type { FetchResult } from '../update/update.ts'
import { isDowngrade, UPDATE_CHANNELS, type UpdateChannel } from './channel.ts'

/** Background checks run at most this often… */
export const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000
/** …and checks asked for by the user (menu, CLI) at most this often. */
export const FORCED_CHECK_INTERVAL_MS = 60 * 1000

const AvailableSchema = z.object({
  version: z.string().nullable(),
  commit: z.string(),
  /** Older than the running version (the channel changed to one behind it). */
  downgrade: z.boolean(),
})
export type AvailableUpdate = z.infer<typeof AvailableSchema>

const UpdateStateSchema = z.object({
  channel: z.enum(UPDATE_CHANNELS),
  checkedAt: z.string().nullable(),
  available: AvailableSchema.nullable(),
  /** Last commit the user was notified about (one notification per commit). */
  notifiedCommit: z.string().nullable(),
})
export type UpdateState = z.infer<typeof UpdateStateSchema>

export type UpdateCheckerDeps = {
  /** `SourceUpdater.fetch` of the installer's checkout. */
  fetch: (ref: string) => Promise<FetchResult>
  statePath: string
  currentVersion: string
  logger: Logger
  /** Called once per new commit found on the channel. */
  onAvailable: (available: AvailableUpdate) => void | Promise<void>
  now?: () => number
}

/** Checks the update channel on the git remote, rate limited, and remembers the result on disk. */
export class UpdateChecker {
  private current: UpdateState = { channel: 'main', checkedAt: null, available: null, notifiedCommit: null }
  private lastForced = 0
  private running: Promise<UpdateState> | null = null

  constructor(private readonly deps: UpdateCheckerDeps) {}

  get state(): UpdateState {
    return this.current
  }

  get checking(): boolean {
    return this.running !== null
  }

  async load(): Promise<void> {
    const parsed = UpdateStateSchema.safeParse(await readJsonFile(this.deps.statePath).catch(() => undefined))
    if (parsed.success) this.current = parsed.data
  }

  /** Whether a check is due for `channel` (`force`: asked by the user). */
  due(channel: UpdateChannel, force = false): boolean {
    const now = this.now()
    if (force) return now - this.lastForced >= FORCED_CHECK_INTERVAL_MS
    if (this.current.channel !== channel || !this.current.checkedAt) return true
    return now - Date.parse(this.current.checkedAt) >= CHECK_INTERVAL_MS
  }

  /** Checks when due; concurrent calls share the same check. */
  async check(channel: UpdateChannel, force = false): Promise<UpdateState> {
    if (this.running) return this.running
    if (!this.due(channel, force)) return this.current
    if (force) this.lastForced = this.now()
    this.running = this.run(channel).finally(() => {
      this.running = null
    })
    return this.running
  }

  private async run(channel: UpdateChannel): Promise<UpdateState> {
    const result = await this.deps.fetch(channel).catch((error: Error) => ({
      status: 'failed' as const,
      error: error.message,
    }))
    if (result.status === 'dirty' || result.status === 'failed') {
      this.deps.logger.warn(
        { channel, status: result.status, error: 'error' in result ? result.error : undefined },
        'update check skipped',
      )
      return this.current
    }
    const available: AvailableUpdate | null =
      result.status === 'available'
        ? {
            version: result.version,
            commit: result.commit,
            downgrade: isDowngrade(this.deps.currentVersion, result.version),
          }
        : null
    const notify = available !== null && available.commit !== this.current.notifiedCommit
    this.current = {
      channel,
      checkedAt: new Date(this.now()).toISOString(),
      available,
      notifiedCommit: notify ? available.commit : this.current.notifiedCommit,
    }
    await writeJsonAtomic(this.deps.statePath, this.current).catch((error: Error) =>
      this.deps.logger.warn({ err: error }, 'could not save the update check'),
    )
    this.deps.logger.info({ channel, available: available?.version ?? null }, 'update check')
    if (notify) await this.deps.onAvailable(available)
    return this.current
  }

  private now(): number {
    return (this.deps.now ?? Date.now)()
  }
}

/** Reads the last check without a daemon (CLI `updates status`). */
export async function readUpdateState(path: string): Promise<UpdateState | null> {
  const parsed = UpdateStateSchema.safeParse(await readJsonFile(path).catch(() => undefined))
  return parsed.success ? parsed.data : null
}

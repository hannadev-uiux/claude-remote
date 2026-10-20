import type {
  DaemonUpdateBlocker,
  DaemonUpdateChannel,
  DaemonUpdateInfo,
  DaemonUpdateRun,
} from '@remote-harness/protocol'
import { DaemonError } from '../../core/errors.ts'
import type { Logger } from '../../core/logger.ts'
import type { Broadcaster } from '../../transport/connection.ts'
import type { MessageRouter } from '../../transport/router.ts'
import type { UpdateState } from './checker.ts'
import { advanceRun, isFinished, readRun, reconcileRun, STALE_RUN_MS, startRun, writeRun } from './run.ts'

/** How often the run record is re-read while an update runs. */
const POLL_MS = 1000

/** Why an update cannot start now (checked before a run is recorded). */
export type LaunchRefusal = 'running' | 'not-installer' | 'nothing'

/** The reply texts of a refused start; the app translates them. */
export const REFUSAL_MESSAGES: Record<LaunchRefusal, string> = {
  running: 'an update is already running',
  'not-installer': 'cannot update: not-installer',
  nothing: 'already up to date',
}

/** Whether the detached updater was spawned; `error` when spawning it failed. */
export type LaunchResult = { ok: true } | { ok: false; error: string }

/** Why an update cannot start, or null when it can. Pure. */
export function launchRefusal(o: {
  updating: boolean
  installer: boolean
  available: boolean
}): LaunchRefusal | null {
  if (o.updating) return 'running'
  if (!o.installer) return 'not-installer'
  if (!o.available) return 'nothing'
  return null
}

export type BeginResult = { ok: true } | { ok: false; refused: LaunchRefusal | null; error: string }

export type RemoteUpdatesDeps = {
  hub: Broadcaster
  router: MessageRouter
  logger: Logger
  runPath: string
  current: string
  blocked: DaemonUpdateBlocker | null
  channel: () => DaemonUpdateChannel
  /** Last check result and whether one is running; null without a checker (blocked). */
  checker: () => { state: UpdateState; checking: boolean } | null
  /** A session runs or waits, or a permission is pending. */
  busy: () => boolean
  /** Checks the channel (forced checks are rate limited by the checker). */
  check: (force: boolean) => Promise<unknown>
  /** Saves the channel to the config and applies it (checks when it changed). */
  saveChannel: (channel: DaemonUpdateChannel) => Promise<void>
  /** Why an update cannot start now, or null. */
  refusal: () => LaunchRefusal | null
  /** Starts the detached update of the configured channel. */
  launch: (onFailure: (code: number | null) => void) => LaunchResult
  /** A followed run finished while this daemon still runs (it did not restart into a new version). */
  onFinished?: (run: DaemonUpdateRun) => void
  pollMs?: number
  now?: () => Date
}

/** Builds the info the app shows from the daemon's state. Pure. */
export function buildUpdateInfo(o: {
  current: string
  channel: DaemonUpdateChannel
  blocked: DaemonUpdateBlocker | null
  checker: { state: UpdateState; checking: boolean } | null
  busy: boolean
  run: DaemonUpdateRun | null
}): DaemonUpdateInfo {
  const state = o.checker?.state
  // A check for another channel says nothing about this one.
  const sameChannel = state?.channel === o.channel
  return {
    current: o.current,
    channel: o.channel,
    checkedAt: sameChannel ? (state?.checkedAt ?? null) : null,
    checking: o.checker?.checking ?? false,
    available: sameChannel ? (state?.available ?? null) : null,
    blocked: o.blocked,
    busy: o.busy,
    run: o.run,
  }
}

/** Whether a run still goes on (unfinished and recent). */
export function runInProgress(run: DaemonUpdateRun | null, now: Date): boolean {
  return run !== null && !isFinished(run.step) && now.getTime() - Date.parse(run.startedAt) < STALE_RUN_MS
}

/** `daemon.update.check` / `daemon.update.start` and the progress broadcast of update runs. */
export class RemoteUpdates {
  private run: DaemonUpdateRun | null = null
  private poll: NodeJS.Timeout | undefined

  constructor(private readonly deps: RemoteUpdatesDeps) {}

  /** Reads the last run, finishing one the restart completed, and follows one still running. */
  async load(): Promise<void> {
    const run = await readRun(this.deps.runPath)
    const reconciled = run ? reconcileRun(run, this.deps.current, this.now()) : null
    if (reconciled) await writeRun(this.deps.runPath, reconciled).catch(() => undefined)
    this.run = reconciled ?? run
    if (runInProgress(this.run, this.now())) this.track()
  }

  register(): void {
    this.deps.router.register('daemon.update.check', async (msg) => {
      if (msg.channel && msg.channel !== this.deps.channel()) {
        if (this.deps.blocked) throw new DaemonError('bad_request', `cannot update: ${this.deps.blocked}`)
        await this.deps.saveChannel(msg.channel)
      }
      if (!this.deps.blocked) await this.deps.check(msg.force ?? false)
      return { type: 'daemon.update.info', info: this.info() }
    })
    this.deps.router.register('daemon.update.start', async (msg) => {
      if (this.deps.blocked) throw new DaemonError('bad_request', `cannot update: ${this.deps.blocked}`)
      if (runInProgress(this.run, this.now())) throw new DaemonError('bad_request', REFUSAL_MESSAGES.running)
      if (msg.channel !== this.deps.channel()) {
        await this.deps.saveChannel(msg.channel)
        await this.deps.check(true)
      }
      const result = await this.begin()
      if (!result.ok) throw new DaemonError(result.refused ? 'bad_request' : 'internal', result.error)
      return { type: 'daemon.update.info', info: this.info() }
    })
  }

  /** Whether the recorded run still goes on (whoever started it). */
  running(): boolean {
    return runInProgress(this.run, this.now())
  }

  info(): DaemonUpdateInfo {
    return buildUpdateInfo({
      current: this.deps.current,
      channel: this.deps.channel(),
      blocked: this.deps.blocked,
      checker: this.deps.checker(),
      busy: this.deps.busy(),
      run: this.run,
    })
  }

  /**
   * Records a new run and starts the detached updater (app, tray or automatic). A refusal (already
   * running, not the installer, nothing available) records nothing; a failed spawn is a failed run.
   */
  async begin(): Promise<BeginResult> {
    const refused = this.deps.refusal()
    if (refused) return { ok: false, refused, error: REFUSAL_MESSAGES[refused] }
    const run = startRun({ channel: this.deps.channel(), from: this.deps.current, now: this.now() })
    await writeRun(this.deps.runPath, run).catch(() => undefined)
    this.run = run
    const started = this.deps.launch((code) => void this.failed(code))
    if (!started.ok) {
      const error = `could not start the updater: ${started.error}`
      await this.failed(null, error)
      return { ok: false, refused: null, error }
    }
    this.track()
    this.broadcast()
    return { ok: true }
  }

  /** Broadcasts the info (check results, channel changes, run steps). */
  broadcast(): void {
    this.deps.hub.broadcast({ type: 'daemon.update.info', info: this.info() })
  }

  stop(): void {
    clearInterval(this.poll)
    this.poll = undefined
  }

  /** The updater exited with an error; the record is completed when the CLI did not do it. */
  private async failed(code: number | null, error?: string): Promise<void> {
    const run = (await readRun(this.deps.runPath)) ?? this.run
    if (run && !isFinished(run.step)) {
      const failed = advanceRun(run, 'failed', this.now(), {
        error: error ?? `updater exited (${code ?? 'error'})`,
      })
      await writeRun(this.deps.runPath, failed).catch(() => undefined)
      this.run = failed
    } else this.run = run
    this.stop()
    this.broadcast()
  }

  private track(): void {
    if (this.poll) return
    this.poll = setInterval(() => void this.refresh(), this.deps.pollMs ?? POLL_MS)
    this.poll.unref?.()
  }

  private async refresh(): Promise<void> {
    const run = await readRun(this.deps.runPath)
    if (!run || JSON.stringify(run) === JSON.stringify(this.run)) return
    this.run = run
    this.broadcast()
    if (isFinished(run.step)) {
      this.stop()
      this.deps.onFinished?.(run)
    }
  }

  private now(): Date {
    return (this.deps.now ?? (() => new Date()))()
  }
}

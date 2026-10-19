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
  /** Starts the detached update of the configured channel; false when it could not start. */
  launch: (onFailure: (code: number | null) => void) => boolean
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
      if (runInProgress(this.run, this.now())) throw new DaemonError('bad_request', 'an update is running')
      if (msg.channel !== this.deps.channel()) {
        await this.deps.saveChannel(msg.channel)
        await this.deps.check(true)
      }
      if (!this.deps.checker()?.state.available) throw new DaemonError('bad_request', 'already up to date')
      if (!(await this.begin())) throw new DaemonError('internal', 'could not start the update')
      return { type: 'daemon.update.info', info: this.info() }
    })
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

  /** Records a new run and starts the detached updater (app or tray). */
  async begin(): Promise<boolean> {
    const run = startRun({ channel: this.deps.channel(), from: this.deps.current, now: this.now() })
    await writeRun(this.deps.runPath, run).catch(() => undefined)
    this.run = run
    const started = this.deps.launch((code) => void this.failed(code))
    if (!started) {
      await this.failed(null)
      return false
    }
    this.track()
    this.broadcast()
    return true
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
  private async failed(code: number | null): Promise<void> {
    const run = (await readRun(this.deps.runPath)) ?? this.run
    if (run && !isFinished(run.step)) {
      const failed = advanceRun(run, 'failed', this.now(), { error: `updater exited (${code ?? 'error'})` })
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
    if (isFinished(run.step)) this.stop()
    this.broadcast()
  }

  private now(): Date {
    return (this.deps.now ?? (() => new Date()))()
  }
}

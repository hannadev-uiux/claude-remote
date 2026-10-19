import type { SessionState } from '@remote-harness/protocol'
import { type KeepAwakeMode, loadConfig } from '../../core/config.ts'
import type { Logger } from '../../core/logger.ts'
import type { SleepHelper, SleepInhibitor } from '../../infra/power.ts'
import type { DaemonContext } from '../../main.ts'
import type { SessionStore } from '../sessions/store.ts'
import { isActive, KEEP_AWAKE_GRACE_MS, keepAwakeDecision } from './policy.ts'

/** What `GET /power` answers (`doctor`, `keep-awake`). */
export type PowerState = {
  mode: KeepAwakeMode
  holding: boolean
  /** False when the OS helper could not start; `reason` says why. */
  available: boolean
  helper: SleepHelper | null
  reason?: string
}

/** A helper that dies while held is started again after this long (avoids a tight loop). */
const RETRY_AFTER_LOST_MS = 30_000

/**
 * Holds or releases the sleep assertion from the mode and the session states. Evaluations are
 * serialized so acquire/release never overlap.
 */
export class KeepAwakeController {
  private mode: KeepAwakeMode
  private lastActiveAt: number | null = null
  private wasActive = false
  private unavailable: string | null = null
  private timer: NodeJS.Timeout | undefined
  private queue: Promise<void> = Promise.resolve()
  private stopped = false

  constructor(
    private readonly deps: {
      inhibitor: SleepInhibitor | null
      mode: KeepAwakeMode
      sessions: () => readonly { state: SessionState }[]
      logger: Logger
      now?: () => number
      graceMs?: number
    },
  ) {
    this.mode = deps.mode
    deps.inhibitor?.onLost(() => {
      deps.logger.warn('keep awake: the sleep helper ended, starting it again soon')
      this.schedule(RETRY_AFTER_LOST_MS)
    })
  }

  /** Re-evaluates after the pending evaluations (session change, timer, mode change). */
  evaluate(): Promise<void> {
    this.queue = this.queue.then(() => this.run()).catch(() => undefined)
    return this.queue
  }

  setMode(mode: KeepAwakeMode): Promise<void> {
    this.mode = mode
    this.unavailable = null
    return this.evaluate()
  }

  state(): PowerState {
    const inhibitor = this.deps.inhibitor
    return {
      mode: this.mode,
      holding: inhibitor?.holding ?? false,
      available: inhibitor !== null && this.unavailable === null,
      helper: inhibitor?.helper ?? null,
      ...(this.unavailable ? { reason: this.unavailable } : {}),
    }
  }

  stop(): void {
    this.stopped = true
    clearTimeout(this.timer)
    this.deps.inhibitor?.release()
  }

  private schedule(ms: number): void {
    clearTimeout(this.timer)
    this.timer = setTimeout(() => void this.evaluate(), ms)
    this.timer.unref?.()
  }

  private async run(): Promise<void> {
    if (this.stopped) return
    const now = (this.deps.now ?? Date.now)()
    const active = isActive(this.deps.sessions())
    // The end of the last activity starts the grace period.
    if (active || this.wasActive) this.lastActiveAt = now
    this.wasActive = active
    const decision = keepAwakeDecision({
      mode: this.mode,
      active,
      lastActiveAt: this.lastActiveAt,
      now,
      graceMs: this.deps.graceMs ?? KEEP_AWAKE_GRACE_MS,
    })
    clearTimeout(this.timer)
    if (decision.recheckInMs !== null) this.schedule(decision.recheckInMs)
    const inhibitor = this.deps.inhibitor
    if (!inhibitor) return
    if (decision.hold && !inhibitor.holding && this.unavailable === null) {
      const result = await inhibitor.acquire()
      if (this.stopped) {
        inhibitor.release()
        return
      }
      if (result.ok)
        this.deps.logger.info({ helper: inhibitor.helper, mode: this.mode }, 'keep awake: holding')
      else {
        this.unavailable = result.reason
        this.deps.logger.warn(
          { helper: inhibitor.helper, reason: result.reason },
          'keep awake: helper unavailable',
        )
      }
    } else if (!decision.hold && inhibitor.holding) {
      inhibitor.release()
      this.deps.logger.info('keep awake: released')
    }
  }
}

/** Keeps the computer awake per `keepAwake`; only the service daemon passes an inhibitor. */
export function registerPowerFeature(
  ctx: DaemonContext,
  store: SessionStore,
  inhibitor: SleepInhibitor | null,
): KeepAwakeController {
  const controller = new KeepAwakeController({
    inhibitor,
    mode: ctx.config.keepAwake,
    sessions: () => store.all(),
    logger: ctx.logger,
  })
  store.onChange((session, previous) => {
    if (session.state !== previous?.state) void controller.evaluate()
  })
  ctx.hooks.get('/power', async () => controller.state())
  ctx.hooks.post('/admin/keep-awake-reload', async () => {
    const config = await loadConfig(ctx.logger)
    await controller.setMode(config.keepAwake)
    return controller.state()
  })
  ctx.onStop(() => controller.stop())
  void controller.evaluate()
  return controller
}

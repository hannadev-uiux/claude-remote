import { type PermissionMode, SelectableModeSchema } from '@claude-remote/protocol'
import { DaemonError } from '../../core/errors.ts'
import type { KeyedMutex } from '../../core/keyed-mutex.ts'
import type { TmuxClient } from '../../infra/tmux.ts'
import { requireControllable } from '../input/service.ts'
import type { SessionStore } from '../sessions/store.ts'
import { detectMode } from './detect.ts'

/** Upper bound for one full Shift+Tab cycle (default, acceptEdits, plan, bypass, auto, + slack). */
export const MAX_MODE_PRESSES = 6

export type ModeOptions = { settleMs?: number; sleep?: (ms: number) => Promise<void> }

/** Switches permission modes with Shift+Tab, re-reading the status line after every press. */
export class ModeService {
  private readonly sleep: (ms: number) => Promise<void>
  private readonly settleMs: number

  constructor(
    private readonly tmux: TmuxClient,
    private readonly store: SessionStore,
    private readonly lock: KeyedMutex,
    private readonly hasPendingPermission: (sessionId: string) => boolean,
    options: ModeOptions = {},
  ) {
    this.settleMs = options.settleMs ?? 150
    this.sleep = options.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)))
  }

  async read(sessionId: string): Promise<PermissionMode> {
    const { paneId } = requireControllable(this.store, sessionId)
    const mode = detectMode(await this.tmux.capturePane(paneId))
    this.store.upsert(sessionId, { permissionMode: mode })
    return mode
  }

  async setMode(sessionId: string, requested: string): Promise<PermissionMode> {
    if (requested === 'bypassPermissions')
      throw new DaemonError('mode_forbidden', 'bypassPermissions is not available remotely')
    const parsed = SelectableModeSchema.safeParse(requested)
    if (!parsed.success) throw new DaemonError('bad_request', `unknown mode ${requested}`)
    const target = parsed.data
    const { paneId } = requireControllable(this.store, sessionId)
    if (this.hasPendingPermission(sessionId))
      throw new DaemonError('session_busy', 'a permission dialog is open')

    return this.lock.run(sessionId, async () => {
      let current = detectMode(await this.tmux.capturePane(paneId))
      for (let presses = 0; current !== target && presses < MAX_MODE_PRESSES; presses++) {
        await this.tmux.sendKeys(paneId, ['BTab'])
        await this.sleep(this.settleMs)
        current = detectMode(await this.tmux.capturePane(paneId))
        // Never rest on bypass: keep cycling past it.
      }
      if (current === 'bypassPermissions') {
        await this.tmux.sendKeys(paneId, ['BTab'])
        await this.sleep(this.settleMs)
        current = detectMode(await this.tmux.capturePane(paneId))
      }
      this.store.upsert(sessionId, { permissionMode: current })
      if (current !== target) {
        throw new DaemonError(
          'mode_unreachable',
          `mode ${target} not reachable; current mode is ${current}`,
          {
            permissionMode: current,
          },
        )
      }
      return current
    })
  }
}

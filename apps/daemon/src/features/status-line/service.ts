import { isDeepStrictEqual } from 'node:util'
import type { AccountLimits, Profile, SessionStatus } from '@remote-harness/protocol'
import type { Logger } from '../../core/logger.ts'
import type { ClientHub } from '../../transport/connection.ts'
import { resolveProfileId } from '../hooks/receiver.ts'
import type { SessionStore } from '../sessions/store.ts'
import { parseStatusLine } from './payload.ts'

/** Statuses kept for sessions not registered yet (a status line can beat `SessionStart`). */
const MAX_PENDING = 50

/** Applies status line reports: session status on the session, account limits per profile. */
export class StatusLineService {
  private readonly limits = new Map<string, AccountLimits>()
  private readonly pending = new Map<string, SessionStatus | null>()

  constructor(
    private readonly store: SessionStore,
    private readonly hub: Pick<ClientHub, 'broadcast'>,
    private readonly profiles: readonly Profile[],
    private readonly logger: Logger,
  ) {
    store.onChange((session, previous) => {
      if (previous || !this.pending.has(session.id)) return
      const status = this.pending.get(session.id) ?? null
      this.pending.delete(session.id)
      // After the current change is fully delivered to the other listeners.
      queueMicrotask(() => this.applyStatus(session.id, status))
    })
  }

  /** Handles one status line JSON; `false` when it is not one. */
  handle(body: unknown, profileHeader: string | null): boolean {
    const parsed = parseStatusLine(body)
    if (!parsed) return false
    if (!this.applyStatus(parsed.sessionId, parsed.status)) {
      if (this.pending.size >= MAX_PENDING && !this.pending.has(parsed.sessionId)) {
        const oldest = this.pending.keys().next().value
        if (oldest !== undefined) this.pending.delete(oldest)
      }
      this.pending.set(parsed.sessionId, parsed.status)
    }
    const profileId =
      resolveProfileId(profileHeader, parsed.transcriptPath, this.profiles) ??
      this.store.get(parsed.sessionId)?.profileId ??
      null
    if (parsed.limits && profileId) this.updateLimits(profileId, parsed.limits)
    return true
  }

  /** Latest limits of every profile that reported them. */
  current(): AccountLimits[] {
    return [...this.limits.values()]
  }

  private applyStatus(sessionId: string, status: SessionStatus | null): boolean {
    const session = this.store.get(sessionId)
    if (!session) return false
    // Keeps `updatedAt`: status ticks must not reorder the session list.
    this.store.upsert(sessionId, { status, updatedAt: session.updatedAt })
    return true
  }

  private updateLimits(profileId: string, windows: Pick<AccountLimits, 'fiveHour' | 'sevenDay'>): void {
    const previous = this.limits.get(profileId)
    if (previous && isDeepStrictEqual({ fiveHour: previous.fiveHour, sevenDay: previous.sevenDay }, windows))
      return
    const limits: AccountLimits = { profileId, ...windows, updatedAt: new Date().toISOString() }
    this.limits.set(profileId, limits)
    this.logger.debug({ profileId }, 'account limits updated')
    this.hub.broadcast({ type: 'limits.updated', limits })
  }
}

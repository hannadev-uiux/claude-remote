import { DIAGNOSTICS_LIMIT, type ErrorCode, type RejectedRequest } from '@remote-harness/protocol'
import { DAEMON_VERSION } from '../../core/version.ts'
import type { DaemonContext } from '../../main.ts'

/** The last rejected requests, kept in memory for "Report a problem" on the phone. */
export class RejectionLog {
  private readonly entries: RejectedRequest[] = []

  constructor(private readonly limit = DIAGNOSTICS_LIMIT) {}

  push(entry: RejectedRequest): void {
    this.entries.push(entry)
    if (this.entries.length > this.limit) this.entries.splice(0, this.entries.length - this.limit)
  }

  /** Most recent first. */
  recent(): RejectedRequest[] {
    return [...this.entries].reverse()
  }
}

export function registerDiagnosticsFeature(
  ctx: Pick<DaemonContext, 'router'>,
  now: () => Date = () => new Date(),
) {
  const log = new RejectionLog()
  ctx.router.onRejected((type: string, code: ErrorCode) =>
    log.push({ at: now().toISOString(), type: type.slice(0, 64), code }),
  )
  ctx.router.register('diagnostics.errors', () => ({
    type: 'diagnostics.result',
    daemonVersion: DAEMON_VERSION,
    errors: log.recent(),
  }))
  return { log }
}

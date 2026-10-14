import type { ErrorCode } from '@claude-remote/protocol'

/** Error carrying a protocol error code; the router turns it into an `error` message. */
export class DaemonError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly data?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'DaemonError'
  }
}

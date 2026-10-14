import { createHash } from 'node:crypto'
import type { Logger } from '../../core/logger.ts'
import type { TmuxClient } from '../../infra/tmux.ts'
import type { Connection } from '../../transport/connection.ts'

export const FRAME_INTERVAL_MS = 250

type Stream = {
  paneId: string
  subscribers: Set<Connection>
  timer: NodeJS.Timeout
  lastHash: string
  busy: boolean
}

/** Polls `capture-pane` for sessions with viewers and pushes frames only when the content changes. */
export class PaneStreamer {
  private readonly streams = new Map<string, Stream>()

  constructor(
    private readonly tmux: TmuxClient,
    private readonly logger: Logger,
    private readonly intervalMs = FRAME_INTERVAL_MS,
  ) {}

  subscribe(sessionId: string, paneId: string, connection: Connection): void {
    let stream = this.streams.get(sessionId)
    if (!stream) {
      const created: Stream = {
        paneId,
        subscribers: new Set(),
        lastHash: '',
        busy: false,
        timer: setInterval(() => void this.tick(sessionId, created), this.intervalMs),
      }
      stream = created
      this.streams.set(sessionId, created)
    }
    if (!stream.subscribers.has(connection)) {
      stream.subscribers.add(connection)
      connection.onClose(() => this.unsubscribe(sessionId, connection))
    }
    // New viewers always get the current frame.
    stream.lastHash = ''
    void this.tick(sessionId, stream)
  }

  unsubscribe(sessionId: string, connection: Connection): void {
    const stream = this.streams.get(sessionId)
    if (!stream) return
    stream.subscribers.delete(connection)
    if (stream.subscribers.size === 0) {
      clearInterval(stream.timer)
      this.streams.delete(sessionId)
    }
  }

  get activeStreams(): number {
    return this.streams.size
  }

  private async tick(sessionId: string, stream: Stream): Promise<void> {
    if (stream.busy) return
    stream.busy = true
    try {
      const frame = await this.tmux.captureWithSize(stream.paneId)
      const hash = createHash('sha1').update(frame.text).update(`${frame.cols}x${frame.rows}`).digest('hex')
      if (hash === stream.lastHash) return
      stream.lastHash = hash
      for (const connection of stream.subscribers)
        connection.send({ type: 'pane.frame', sessionId, ...frame })
    } catch (error) {
      this.logger.debug({ err: error, sessionId }, 'capture-pane failed')
    } finally {
      stream.busy = false
    }
  }

  dispose(): void {
    for (const stream of this.streams.values()) clearInterval(stream.timer)
    this.streams.clear()
  }
}

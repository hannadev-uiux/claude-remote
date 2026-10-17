import type { ServerMessageOf, TranscriptEntry } from '@remote-harness/protocol'
import { type FSWatcher, watch } from 'chokidar'
import type { Logger } from '../../core/logger.ts'
import type { Connection } from '../../transport/connection.ts'
import { parseMetaLine, parseTranscriptLine, type TranscriptMetaUpdate } from './parser.ts'
import { TranscriptFile } from './transcript-file.ts'

export const DEFAULT_PAGE_SIZE = 50
/** Safety net: fs events get coalesced under bursts of appends, so subscribed files are also polled. */
export const POLL_INTERVAL_MS = 500

type Stream = {
  key: string
  sessionId: string
  agentId?: string
  file: TranscriptFile
  watcher: FSWatcher
  subscribers: Set<Connection>
}

export type StreamTarget = { sessionId: string; agentId?: string; path: string }

/** Tails transcripts that have at least one subscriber and fans entries out to them. */
export class TranscriptService {
  private readonly streams = new Map<string, Stream>()
  /** Files kept around (with their line index) for history requests without a live subscription. */
  private readonly files = new Map<string, TranscriptFile>()
  private readonly poller: NodeJS.Timeout

  constructor(
    private readonly logger: Logger,
    private readonly onMeta: (sessionId: string, update: TranscriptMetaUpdate) => void = () => {},
  ) {
    this.poller = setInterval(() => {
      for (const stream of this.streams.values()) void this.pump(stream)
    }, POLL_INTERVAL_MS)
    this.poller.unref()
  }

  static key(sessionId: string, agentId?: string): string {
    return agentId ? `${sessionId}#${agentId}` : sessionId
  }

  private fileFor(path: string): TranscriptFile {
    let file = this.files.get(path)
    if (!file) {
      file = new TranscriptFile(path)
      this.files.set(path, file)
    }
    return file
  }

  /**
   * Subscribes a connection and returns the initial page: everything after `sinceCursor`, or the
   * last page when no cursor is given.
   */
  async subscribe(
    target: StreamTarget,
    connection: Connection,
    sinceCursor?: number,
  ): Promise<Omit<ServerMessageOf<'transcript.page'>, 'type' | 'replyTo'>> {
    const key = TranscriptService.key(target.sessionId, target.agentId)
    let stream = this.streams.get(key)
    if (!stream) {
      const file = this.fileFor(target.path)
      await file.sync()
      const watcher = watch(target.path, { ignoreInitial: true })
      const created: Stream = {
        key,
        sessionId: target.sessionId,
        agentId: target.agentId,
        file,
        watcher,
        subscribers: new Set(),
      }
      watcher.on('add', () => void this.pump(created))
      watcher.on('change', () => void this.pump(created))
      watcher.on('error', (error) => this.logger.warn({ err: error, key }, 'transcript watcher error'))
      this.streams.set(key, created)
      await new Promise<void>((resolve) => watcher.once('ready', () => resolve()))
      stream = created
    } else {
      await this.pump(stream)
    }
    if (!stream.subscribers.has(connection)) {
      stream.subscribers.add(connection)
      connection.onClose(() => this.unsubscribe(target.sessionId, connection, target.agentId))
    }
    const { file } = stream
    if (sinceCursor !== undefined) {
      return {
        sessionId: target.sessionId,
        agentId: target.agentId,
        entries: await file.since(sinceCursor),
        hasMore: false,
        lineCount: file.lineCount,
      }
    }
    const page = await file.page(file.lineCount, DEFAULT_PAGE_SIZE)
    return { sessionId: target.sessionId, agentId: target.agentId, ...page, lineCount: file.lineCount }
  }

  unsubscribe(sessionId: string, connection: Connection, agentId?: string): void {
    const key = TranscriptService.key(sessionId, agentId)
    const stream = this.streams.get(key)
    if (!stream) return
    stream.subscribers.delete(connection)
    if (stream.subscribers.size === 0) {
      void stream.watcher.close()
      this.streams.delete(key)
    }
  }

  async history(target: StreamTarget, before: number, limit: number) {
    const file = this.fileFor(target.path)
    await file.sync()
    const page = await file.page(before, limit)
    return { sessionId: target.sessionId, agentId: target.agentId, ...page, lineCount: file.lineCount }
  }

  /** Reads newly appended lines and pushes their entries to subscribers. */
  private async pump(stream: Stream): Promise<void> {
    // TranscriptFile.sync is serialized and only returns lines once, so concurrent pumps are safe.
    for (;;) {
      let lines: Awaited<ReturnType<TranscriptFile['sync']>>
      try {
        lines = await stream.file.sync()
      } catch (error) {
        this.logger.warn({ err: error, key: stream.key }, 'transcript read failed')
        return
      }
      if (lines.length === 0) return
      for (const line of lines) {
        if (!stream.agentId) {
          const meta = parseMetaLine(line.text)
          if (meta) this.onMeta(stream.sessionId, meta)
        }
        for (const entry of parseTranscriptLine(line.text, line.cursor)) this.emit(stream, entry)
      }
    }
  }

  private emit(stream: Stream, entry: TranscriptEntry): void {
    for (const connection of stream.subscribers) {
      connection.send({
        type: 'transcript.entry',
        sessionId: stream.sessionId,
        agentId: stream.agentId,
        cursor: entry.cursor,
        entry,
      })
    }
  }

  async dispose(): Promise<void> {
    clearInterval(this.poller)
    await Promise.all([...this.streams.values()].map((s) => s.watcher.close()))
    this.streams.clear()
    this.files.clear()
  }
}

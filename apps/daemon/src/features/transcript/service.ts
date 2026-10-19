import {
  MAX_TRANSCRIPT_IMAGE_BYTES,
  type ServerMessageOf,
  type TranscriptEntry,
} from '@remote-harness/protocol'
import { type FSWatcher, watch } from 'chokidar'
import { DaemonError } from '../../core/errors.ts'
import type { Logger } from '../../core/logger.ts'
import type { Connection } from '../../transport/connection.ts'
import type { TranscriptFormat, TranscriptMetaUpdate } from './format.ts'
import { claudeTranscript, parseImageId } from './parser.ts'
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
  /** Daemon-side listeners (live status), fed the same entries as the subscribers. */
  listeners: Set<EntryListener>
}

export type EntryListener = (sessionId: string, entry: TranscriptEntry) => void

/** `format` is the agent's transcript format (Claude Code when absent). */
export type StreamTarget = { sessionId: string; agentId?: string; path: string; format?: TranscriptFormat }

/** Tails transcripts that have at least one subscriber or listener and fans entries out to them. */
export class TranscriptService {
  private readonly streams = new Map<string, Stream>()
  /** Files kept around (with their line index) for history requests without a live subscription. */
  private readonly files = new Map<string, TranscriptFile>()
  private readonly poller: NodeJS.Timeout

  constructor(
    private readonly logger: Logger,
    private readonly onMeta: (sessionId: string, update: TranscriptMetaUpdate) => void = () => {},
    /** New lines were read for a session (its own transcript or a subagent's): last activity. */
    private readonly onActivity: (sessionId: string, at: number) => void = () => {},
  ) {
    this.poller = setInterval(() => {
      for (const stream of this.streams.values()) void this.pump(stream)
    }, POLL_INTERVAL_MS)
    this.poller.unref()
  }

  static key(sessionId: string, agentId?: string): string {
    return agentId ? `${sessionId}#${agentId}` : sessionId
  }

  private fileFor(path: string, format: TranscriptFormat = claudeTranscript): TranscriptFile {
    let file = this.files.get(path)
    if (!file) {
      file = new TranscriptFile(path, format)
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
    const stream = await this.open(target)
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

  /**
   * Feeds `listener` the entries appended to the transcript from now on (no backlog). Returns a
   * function that stops it; the file stops being watched once nobody needs it.
   */
  async follow(target: StreamTarget, listener: EntryListener): Promise<() => void> {
    const stream = await this.open(target)
    stream.listeners.add(listener)
    return () => {
      stream.listeners.delete(listener)
      this.closeIfUnused(stream)
    }
  }

  /** The stream of a transcript, created (and caught up) when missing. */
  private async open(target: StreamTarget): Promise<Stream> {
    const key = TranscriptService.key(target.sessionId, target.agentId)
    let stream = this.streams.get(key)
    if (!stream) {
      const file = this.fileFor(target.path, target.format)
      await file.sync()
      const watcher = watch(target.path, { ignoreInitial: true })
      const created: Stream = {
        key,
        sessionId: target.sessionId,
        agentId: target.agentId,
        file,
        watcher,
        subscribers: new Set(),
        listeners: new Set(),
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
    return stream
  }

  private closeIfUnused(stream: Stream): void {
    if (stream.subscribers.size > 0 || stream.listeners.size > 0) return
    if (this.streams.get(stream.key) !== stream) return
    void stream.watcher.close()
    this.streams.delete(stream.key)
  }

  unsubscribe(sessionId: string, connection: Connection, agentId?: string): void {
    const key = TranscriptService.key(sessionId, agentId)
    const stream = this.streams.get(key)
    if (!stream) return
    stream.subscribers.delete(connection)
    this.closeIfUnused(stream)
  }

  /**
   * Indexes lines appended since the last read. `TranscriptFile.sync` returns new lines only once,
   * so when a stream follows the file they go through its pump (and reach its subscribers) instead
   * of being read and dropped here.
   */
  private async catchUp(file: TranscriptFile): Promise<void> {
    const stream = [...this.streams.values()].find((s) => s.file === file)
    if (stream) await this.pump(stream)
    else await file.sync()
  }

  async history(target: StreamTarget, before: number, limit: number) {
    const file = this.fileFor(target.path, target.format)
    await this.catchUp(file)
    const page = await file.page(before, limit)
    return { sessionId: target.sessionId, agentId: target.agentId, ...page, lineCount: file.lineCount }
  }

  /** Data of an image ref (`parseImageId`), read again from its transcript line. */
  async image(
    target: StreamTarget,
    imageId: string,
  ): Promise<Omit<ServerMessageOf<'transcript.image'>, 'type' | 'replyTo'>> {
    const at = parseImageId(imageId)
    const file = this.fileFor(target.path, target.format)
    // Refs come from lines already read; only a new file object (daemon restart) needs indexing.
    if (at && at.cursor >= file.lineCount) await this.catchUp(file)
    const [line] = at ? await file.readLines(at.cursor, at.cursor + 1) : []
    const image = line && at ? file.format.findImage(line.text, at.index) : null
    if (!image) throw new DaemonError('not_found', `image ${imageId} not found`)
    if (image.bytes > MAX_TRANSCRIPT_IMAGE_BYTES)
      throw new DaemonError('too_large', `image ${imageId} has ${image.bytes} bytes`)
    return { imageId, mediaType: image.mediaType, data: image.data }
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
          const meta = stream.file.format.parseMeta(line.text)
          if (meta) this.onMeta(stream.sessionId, meta)
        }
        for (const entry of stream.file.format.parseLine(line.text, line.cursor)) this.emit(stream, entry)
      }
      this.onActivity(stream.sessionId, Date.now())
    }
  }

  private emit(stream: Stream, entry: TranscriptEntry): void {
    for (const listener of stream.listeners) listener(stream.sessionId, entry)
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

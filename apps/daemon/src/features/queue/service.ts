import { randomUUID } from 'node:crypto'
import {
  type InputDelivery,
  type InputMode,
  MAX_QUEUE,
  type QueuedMessage,
  QueuedMessageSchema,
} from '@remote-harness/protocol'
import { z } from 'zod'
import { DaemonError } from '../../core/errors.ts'
import type { Logger } from '../../core/logger.ts'
import { readJsonFile, writeJsonAtomic } from '../../infra/fs.ts'
import type { Broadcaster, Connection } from '../../transport/connection.ts'
import type { InputService } from '../input/service.ts'
import { requireControllable } from '../input/service.ts'
import type { SessionStore } from '../sessions/store.ts'
import type { SessionRecord } from '../sessions/types.ts'
import { canDeliver, isBusy, nextDeliverable, QUEUE_SETTLE_MS } from './queue.ts'

const PersistedSchema = z.object({ items: z.array(QueuedMessageSchema) })

export type QueueDeps = {
  store: SessionStore
  input: Pick<InputService, 'sendText'>
  hasPending: (sessionId: string) => boolean
  broadcaster: Broadcaster
  statePath: string
  logger: Logger
  now?: () => number
  sleep?: (ms: number) => Promise<void>
  settleMs?: number
  newId?: () => string
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Prompts waiting for their session to be free. Lives in the daemon so it survives the app and
 * the phone's connection; delivered one per turn when the session turns idle.
 */
export class QueueService {
  private items: QueuedMessage[] = []
  private readonly delivering = new Set<string>()
  /** When the last prompt was pasted into each session, until the session leaves `idle`. */
  private readonly lastDelivered = new Map<string, number>()
  /** Persistence writes still in flight, so stopping (or a test) can wait for them. */
  private writes: Promise<void> = Promise.resolve()
  private readonly now: () => number
  private readonly sleep: (ms: number) => Promise<void>
  private readonly settleMs: number
  private readonly newId: () => string

  constructor(private readonly deps: QueueDeps) {
    this.now = deps.now ?? Date.now
    this.sleep = deps.sleep ?? defaultSleep
    this.settleMs = deps.settleMs ?? QUEUE_SETTLE_MS
    this.newId = deps.newId ?? randomUUID
  }

  list(sessionId: string): QueuedMessage[] {
    return this.items.filter((item) => item.sessionId === sessionId)
  }

  /** Loads the persisted queue (after the sessions were restored, so ended ones get cleared). */
  async load(): Promise<void> {
    const parsed = PersistedSchema.safeParse(await readJsonFile(this.deps.statePath))
    if (!parsed.success) return
    this.items = parsed.data.items
    for (const sessionId of new Set(this.items.map((item) => item.sessionId))) {
      const session = this.deps.store.get(sessionId)
      if (session) this.onSessionChange(session)
    }
  }

  /** `session.input`: deliver now, hold, or hold only while the session is busy. */
  async submit(
    sessionId: string,
    text: string,
    attachmentIds: readonly string[],
    mode: InputMode,
  ): Promise<{ delivery: InputDelivery; itemId?: string }> {
    const session = requireControllable(this.deps.store, sessionId)
    const busy = isBusy(session, this.deps.hasPending(sessionId)) || this.list(sessionId).length > 0
    if (mode === 'now' || (mode === 'auto' && !busy)) {
      await this.deps.input.sendText(sessionId, text, attachmentIds)
      return { delivery: 'sent' }
    }
    if (!text.trim() && attachmentIds.length === 0) throw new DaemonError('bad_request', 'empty prompt')
    if (this.list(sessionId).length >= MAX_QUEUE) {
      throw new DaemonError('bad_request', `the queue holds at most ${MAX_QUEUE} prompts`)
    }
    const item: QueuedMessage = {
      id: this.newId(),
      sessionId,
      text,
      attachmentIds: [...attachmentIds],
      createdAt: new Date(this.now()).toISOString(),
      error: null,
    }
    this.items = [...this.items, item]
    await this.changed(sessionId)
    void this.maybeDeliver(sessionId)
    return { delivery: 'queued', itemId: item.id }
  }

  async update(sessionId: string, itemId: string, text: string): Promise<void> {
    const item = this.find(sessionId, itemId)
    if (!text.trim() && item.attachmentIds.length === 0) throw new DaemonError('bad_request', 'empty prompt')
    this.items = this.items.map((i) => (i.id === itemId ? { ...i, text, error: null } : i))
    await this.changed(sessionId)
    void this.maybeDeliver(sessionId)
  }

  async remove(sessionId: string, itemId: string): Promise<void> {
    this.find(sessionId, itemId)
    this.items = this.items.filter((i) => i.id !== itemId)
    await this.changed(sessionId)
    void this.maybeDeliver(sessionId)
  }

  /** Delivers one prompt right away, mid-turn or not; a failure puts it back at the head with the error. */
  async sendNow(sessionId: string, itemId: string): Promise<void> {
    const item = this.find(sessionId, itemId)
    this.items = this.items.filter((i) => i.id !== itemId)
    await this.changed(sessionId)
    try {
      await this.deps.input.sendText(sessionId, item.text, item.attachmentIds)
      this.lastDelivered.set(sessionId, this.now())
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const rest = this.items.filter((i) => i.sessionId !== sessionId)
      const mine = this.items.filter((i) => i.sessionId === sessionId)
      this.items = [...rest, { ...item, error: message }, ...mine]
      await this.changed(sessionId)
      throw error
    }
  }

  /** Delivers every queued prompt of the session right away, in order, stopping at the first error. */
  async flush(sessionId: string): Promise<void> {
    for (const item of this.list(sessionId)) await this.sendNow(sessionId, item.id)
  }

  /** Session changes: an idle session may take the next prompt; an ended one loses its queue. */
  onSessionChange(session: SessionRecord): void {
    if (session.state !== 'idle') this.lastDelivered.delete(session.id)
    if (session.state === 'ended' || !session.controllable) {
      if (this.list(session.id).length === 0) return
      this.items = this.items.filter((item) => item.sessionId !== session.id)
      void this.changed(session.id)
      return
    }
    if (session.state === 'idle') void this.maybeDeliver(session.id)
  }

  /** A phone that connects late still sees what is waiting. */
  replay(connection: Pick<Connection, 'send'>): void {
    for (const sessionId of new Set(this.items.map((item) => item.sessionId))) {
      connection.send({ type: 'session.queue', sessionId, items: this.list(sessionId) })
    }
  }

  private find(sessionId: string, itemId: string): QueuedMessage {
    const item = this.items.find((i) => i.id === itemId && i.sessionId === sessionId)
    if (!item) throw new DaemonError('not_found', `queued prompt ${itemId} not found`)
    return item
  }

  private ready(sessionId: string): boolean {
    return canDeliver(
      this.deps.store.get(sessionId),
      this.deps.hasPending(sessionId),
      this.lastDelivered.get(sessionId),
      this.now(),
    )
  }

  private async maybeDeliver(sessionId: string): Promise<void> {
    if (this.delivering.has(sessionId) || !this.ready(sessionId)) return
    const item = nextDeliverable(this.list(sessionId))
    if (!item) return
    this.delivering.add(sessionId)
    let outcome: 'sent' | 'failed' | 'skipped' = 'skipped'
    try {
      await this.sleep(this.settleMs)
      // A prompt from the computer or a permission may have arrived during the settle.
      if (this.ready(sessionId) && this.list(sessionId)[0]?.id === item.id) {
        try {
          await this.deps.input.sendText(sessionId, item.text, item.attachmentIds)
          this.items = this.items.filter((i) => i.id !== item.id)
          // Set before anything else can run: the next prompt waits for this turn.
          this.lastDelivered.set(sessionId, this.now())
          outcome = 'sent'
          this.deps.logger.info({ sessionId, itemId: item.id }, 'queued prompt delivered')
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          this.items = this.items.map((i) => (i.id === item.id ? { ...i, error: message } : i))
          outcome = 'failed'
          this.deps.logger.warn({ sessionId, itemId: item.id, reason: message }, 'queued prompt failed')
        }
      }
    } finally {
      // Released before persisting, so a state change during the write is not lost.
      this.delivering.delete(sessionId)
    }
    if (outcome !== 'skipped') await this.changed(sessionId)
  }

  /** Waits for the writes still in flight (daemon stop, tests). */
  dispose(): Promise<void> {
    return this.writes
  }

  private async changed(sessionId: string): Promise<void> {
    this.deps.broadcaster.broadcast({ type: 'session.queue', sessionId, items: this.list(sessionId) })
    const write = writeJsonAtomic(this.deps.statePath, { items: this.items }, 0o600).catch((error) =>
      this.deps.logger.warn({ err: error }, 'could not persist the message queue'),
    )
    this.writes = this.writes.then(() => write)
    await write
  }
}

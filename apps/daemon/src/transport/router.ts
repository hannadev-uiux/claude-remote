import type {
  ClientMessage,
  ClientMessageOf,
  ClientMessageType,
  ErrorCode,
  ServerMessage,
} from '@remote-harness/protocol'
import { DaemonError } from '../core/errors.ts'
import type { Logger } from '../core/logger.ts'
import type { Connection } from './connection.ts'

type Reply = ServerMessage | undefined
export type MessageHandler<T extends ClientMessageType> = (
  message: ClientMessageOf<T>,
  connection: Connection,
) => Reply | Promise<Reply>

/** Told about every rejected request: its type and error code, never the payload or message. */
export type RejectionListener = (type: string, code: ErrorCode) => void

/** Maps message types to feature handlers and turns results/errors into replies. */
export class MessageRouter {
  // biome-ignore lint/suspicious/noExplicitAny: heterogeneous handler map, typed at register()
  private readonly handlers = new Map<ClientMessageType, MessageHandler<any>>()
  private readonly rejectionListeners = new Set<RejectionListener>()

  constructor(private readonly logger: Logger) {}

  register<T extends ClientMessageType>(type: T, handler: MessageHandler<T>): void {
    if (this.handlers.has(type)) throw new Error(`handler already registered for ${type}`)
    this.handlers.set(type, handler)
  }

  onRejected(listener: RejectionListener): () => void {
    this.rejectionListeners.add(listener)
    return () => this.rejectionListeners.delete(listener)
  }

  private rejected(type: string, code: ErrorCode): void {
    for (const listener of this.rejectionListeners) listener(type, code)
  }

  /**
   * Logs and records a rejection exactly like `dispatch` does for its own handlers, for a message
   * that never reaches one at all (e.g. one that failed schema validation before dispatch).
   */
  reportRejected(type: string, code: ErrorCode): void {
    this.logger.warn({ type, code }, 'request rejected')
    this.rejected(type, code)
  }

  async dispatch(message: ClientMessage, connection: Connection): Promise<void> {
    const handler = this.handlers.get(message.type) as MessageHandler<typeof message.type> | undefined
    if (!handler) {
      connection.send({
        type: 'error',
        replyTo: message.id,
        code: 'unknown_type',
        message: `no handler for ${message.type}`,
      })
      this.logger.info({ type: message.type, code: 'unknown_type' }, 'request rejected')
      this.rejected(message.type, 'unknown_type')
      return
    }
    try {
      const reply = await handler(message as never, connection)
      connection.send(
        reply ? ({ ...reply, replyTo: message.id } as ServerMessage) : { type: 'ack', replyTo: message.id },
      )
    } catch (error) {
      if (error instanceof DaemonError) {
        connection.send({ type: 'error', replyTo: message.id, code: error.code, message: error.message })
        this.logger.warn({ type: message.type, code: error.code }, 'request rejected')
        this.rejected(message.type, error.code)
        return
      }
      this.logger.error({ err: error, type: message.type, code: 'internal' }, 'handler failed')
      connection.send({ type: 'error', replyTo: message.id, code: 'internal', message: 'internal error' })
      this.rejected(message.type, 'internal')
    }
  }
}

import type {
  ClientMessage,
  ClientMessageOf,
  ClientMessageType,
  ServerMessage,
} from '@claude-remote/protocol'
import { DaemonError } from '../core/errors.ts'
import type { Logger } from '../core/logger.ts'
import type { Connection } from './connection.ts'

type Reply = ServerMessage | undefined
export type MessageHandler<T extends ClientMessageType> = (
  message: ClientMessageOf<T>,
  connection: Connection,
) => Reply | Promise<Reply>

/** Maps message types to feature handlers and turns results/errors into replies. */
export class MessageRouter {
  // biome-ignore lint/suspicious/noExplicitAny: heterogeneous handler map, typed at register()
  private readonly handlers = new Map<ClientMessageType, MessageHandler<any>>()

  constructor(private readonly logger: Logger) {}

  register<T extends ClientMessageType>(type: T, handler: MessageHandler<T>): void {
    if (this.handlers.has(type)) throw new Error(`handler already registered for ${type}`)
    this.handlers.set(type, handler)
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
        return
      }
      this.logger.error({ err: error, type: message.type }, 'handler failed')
      connection.send({ type: 'error', replyTo: message.id, code: 'internal', message: 'internal error' })
    }
  }
}

import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'
import {
  PROTOCOL_VERSION,
  parseClientMessage,
  type ServerMessage,
  type ServerMessageOf,
} from '@claude-remote/protocol'
import { type WebSocket, WebSocketServer } from 'ws'
import type { Logger } from '../core/logger.ts'
import type { ClientHub, Connection } from './connection.ts'
import type { MessageRouter } from './router.ts'

export const AUTH_TIMEOUT_MS = 5_000
const HEARTBEAT_MS = 30_000
/** Fits one image attachment (5 MB decoded is ~6.7 MB in base64) plus the envelope. */
export const MAX_PAYLOAD_BYTES = 8 * 1024 * 1024

export type WsServerOptions = {
  host: string
  port: number
  getToken: () => string
  router: MessageRouter
  hub: ClientHub
  logger: Logger
  /** Builds the `auth.ok` payload sent after a successful handshake. */
  hello: () => Omit<ServerMessageOf<'auth.ok'>, 'type' | 'replyTo'>
  authTimeoutMs?: number
  onAuthenticated?: (connection: Connection) => void
}

export function tokensMatch(expected: string, received: string): boolean {
  const a = createHash('sha256').update(expected).digest()
  const b = createHash('sha256').update(received).digest()
  return timingSafeEqual(a, b)
}

class SocketConnection implements Connection {
  readonly id = randomUUID()
  foreground = false
  private readonly closeHandlers: Array<() => void> = []

  constructor(private readonly socket: WebSocket) {
    socket.on('close', () => {
      for (const fn of this.closeHandlers.splice(0)) fn()
    })
  }

  send(message: ServerMessage): void {
    if (this.socket.readyState === this.socket.OPEN) this.socket.send(JSON.stringify(message))
  }

  onClose(fn: () => void): void {
    this.closeHandlers.push(fn)
  }

  close(code = 1000, reason = ''): void {
    this.socket.close(code, reason)
  }
}

export async function startWsServer(options: WsServerOptions): Promise<WebSocketServer> {
  const { router, hub, logger } = options
  const wss = new WebSocketServer({ host: options.host, port: options.port, maxPayload: MAX_PAYLOAD_BYTES })
  const alive = new WeakMap<WebSocket, boolean>()

  wss.on('connection', (socket, request) => {
    const connection = new SocketConnection(socket)
    const log = logger.child({ conn: connection.id.slice(0, 8), remote: request.socket.remoteAddress })
    let authenticated = false
    alive.set(socket, true)
    socket.on('pong', () => alive.set(socket, true))

    const authTimer = setTimeout(() => {
      if (!authenticated) {
        log.warn('auth timeout')
        socket.close(4001, 'auth timeout')
      }
    }, options.authTimeoutMs ?? AUTH_TIMEOUT_MS)
    connection.onClose(() => clearTimeout(authTimer))

    socket.on('message', (data) => {
      const parsed = parseClientMessage(data.toString())
      if (!parsed.ok) {
        connection.send({
          type: 'error',
          replyTo: parsed.error.id,
          code: parsed.error.code,
          message: parsed.error.message,
        })
        if (!authenticated) socket.close(4001, 'unauthorized')
        return
      }
      const message = parsed.value
      if (!authenticated) {
        if (message.type !== 'auth' || !tokensMatch(options.getToken(), message.token)) {
          log.warn('unauthorized')
          connection.send({
            type: 'error',
            replyTo: message.id,
            code: 'unauthorized',
            message: 'invalid token',
          })
          socket.close(4001, 'unauthorized')
          return
        }
        if (Math.trunc(message.protocolVersion) !== PROTOCOL_VERSION) {
          connection.send({
            type: 'error',
            replyTo: message.id,
            code: 'protocol_mismatch',
            message: `daemon speaks protocol ${PROTOCOL_VERSION}`,
          })
          socket.close(4002, 'protocol mismatch')
          return
        }
        authenticated = true
        clearTimeout(authTimer)
        hub.add(connection)
        connection.send({ type: 'auth.ok', replyTo: message.id, ...options.hello() })
        options.onAuthenticated?.(connection)
        log.info('client authenticated')
        return
      }
      if (message.type === 'auth') {
        connection.send({ type: 'auth.ok', replyTo: message.id, ...options.hello() })
        return
      }
      void router.dispatch(message, connection)
    })
  })

  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      if (alive.get(socket) === false) {
        socket.terminate()
        continue
      }
      alive.set(socket, false)
      socket.ping()
    }
  }, HEARTBEAT_MS)
  wss.on('close', () => clearInterval(heartbeat))

  await new Promise<void>((resolve, reject) => {
    wss.once('listening', resolve)
    wss.once('error', reject)
  })
  return wss
}

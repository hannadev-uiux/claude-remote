import {
  type ClientRequest,
  type ErrorCode,
  PROTOCOL_VERSION,
  parseServerMessage,
  type ServerMessage,
  type ServerMessageOf,
  type ServerMessageType,
} from '@remote-harness/protocol'

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'authenticating'
  | 'open'
  | 'reconnecting'
  | 'unauthorized'
  | 'closed'

export type Hello = Omit<ServerMessageOf<'auth.ok'>, 'type' | 'replyTo'>

/** Minimal WebSocket surface used by the client (RN's global WebSocket or a test fake). */
export interface SocketLike {
  readyState: number
  send(data: string): void
  close(code?: number, reason?: string): void
  onopen: ((ev: unknown) => void) | null
  onmessage: ((ev: { data: unknown }) => void) | null
  onclose: ((ev: { code: number; reason?: string }) => void) | null
  onerror: ((ev: unknown) => void) | null
}
export type SocketFactory = (url: string) => SocketLike

export class DaemonRequestError extends Error {
  constructor(
    readonly code: ErrorCode | 'timeout' | 'disconnected',
    message: string,
  ) {
    super(message)
    this.name = 'DaemonRequestError'
  }
}

export type DaemonClientOptions = {
  host: string
  port: number
  token: string
  socketFactory?: SocketFactory
  /** Automatically reconnect with exponential backoff (disabled for the pairing test). */
  reconnect?: boolean
  requestTimeoutMs?: number
  minBackoffMs?: number
  maxBackoffMs?: number
  /** An attempt that has not opened after this long is abandoned and counted as unreachable. */
  connectTimeoutMs?: number
  clientName?: string
}

type Pending = {
  resolve: (message: ServerMessage) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}
type AnyHandler = (message: ServerMessage) => void

const OPEN = 1
/** Close codes after which retrying is pointless (bad token, rotated token, protocol mismatch). */
const FATAL_CLOSE_CODES = new Set([4001, 4002, 4003])

export function daemonUrl(host: string, port: number): string {
  const h = host.includes(':') && !host.startsWith('[') ? `[${host}]` : host
  return `ws://${h}:${port}`
}

/**
 * WebSocket client for the daemon: authenticates, correlates requests by id, and keeps the
 * connection alive with exponential backoff. No React in here so it can be unit-tested.
 */
export class DaemonClient {
  private socket: SocketLike | null = null
  private readonly pending = new Map<string, Pending>()
  private readonly handlers = new Map<ServerMessageType | '*', Set<AnyHandler>>()
  private readonly statusListeners = new Set<(status: ConnectionStatus, error?: string) => void>()
  private readyListeners = new Set<(hello: Hello) => void>()
  private seq = 0
  private attempt = 0
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private connectTimer: ReturnType<typeof setTimeout> | null = null
  private _unreachable = false
  /** `unreachable` as of the last status notification (a flip alone notifies the listeners). */
  private notifiedUnreachable = false
  private stopped = false
  private _status: ConnectionStatus = 'idle'
  private _hello: Hello | null = null
  private _lastError: string | undefined

  constructor(private readonly options: DaemonClientOptions) {}

  get status(): ConnectionStatus {
    return this._status
  }

  get hello(): Hello | null {
    return this._hello
  }

  get lastError(): string | undefined {
    return this._lastError
  }

  /**
   * The last attempt got no answer at all (timed out): the computer is likely asleep or offline.
   * A refused or failed-at-once attempt clears it, as does a successful open.
   */
  get unreachable(): boolean {
    return this._unreachable
  }

  connect(): void {
    this.stopped = false
    if (this.socket || this.retryTimer) return
    this.open()
  }

  /** Reconnects immediately (e.g. app returned to the foreground), skipping the backoff wait. */
  resumeNow(): void {
    if (this.stopped || this._status === 'unauthorized') return
    if (this._status === 'open' || this._status === 'connecting' || this._status === 'authenticating') return
    this.clearRetry()
    this.attempt = 0
    this.open()
  }

  close(): void {
    this.stopped = true
    this.clearRetry()
    this.clearConnectTimer()
    const socket = this.socket
    this.socket = null
    if (socket) {
      socket.onclose = null
      socket.close(1000, 'client closed')
    }
    this.failPending('disconnected')
    this.setStatus('closed')
  }

  on<T extends ServerMessageType>(type: T, handler: (message: ServerMessageOf<T>) => void): () => void {
    return this.addHandler(type, handler as AnyHandler)
  }

  onAny(handler: AnyHandler): () => void {
    return this.addHandler('*', handler)
  }

  onStatus(listener: (status: ConnectionStatus, error?: string) => void): () => void {
    this.statusListeners.add(listener)
    return () => this.statusListeners.delete(listener)
  }

  /** Called after every successful (re)authentication, so stores can resubscribe. */
  onReady(listener: (hello: Hello) => void): () => void {
    this.readyListeners.add(listener)
    return () => this.readyListeners.delete(listener)
  }

  /**
   * Sends a request and resolves with the correlated reply; `error` replies reject. `timeoutMs`
   * overrides the default for replies that take long to arrive (large images).
   */
  request(message: ClientRequest, options: { timeoutMs?: number } = {}): Promise<ServerMessage> {
    if (!this.socket || this.socket.readyState !== OPEN || this._status !== 'open') {
      return Promise.reject(new DaemonRequestError('disconnected', 'not connected to the daemon'))
    }
    return this.sendRequest(message, options.timeoutMs)
  }

  /** Fire-and-forget variant that ignores the reply. */
  send(message: ClientRequest): void {
    this.request(message).catch(() => undefined)
  }

  private addHandler(key: ServerMessageType | '*', handler: AnyHandler): () => void {
    let set = this.handlers.get(key)
    if (!set) {
      set = new Set()
      this.handlers.set(key, set)
    }
    set.add(handler)
    return () => set.delete(handler)
  }

  private nextId(): string {
    this.seq += 1
    return `${Date.now().toString(36)}-${this.seq}`
  }

  private sendRequest(message: ClientRequest, timeoutMs?: number): Promise<ServerMessage> {
    const id = this.nextId()
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => {
          this.pending.delete(id)
          reject(new DaemonRequestError('timeout', `no reply to ${message.type}`))
        },
        timeoutMs ?? this.options.requestTimeoutMs ?? 15_000,
      )
      this.pending.set(id, { resolve, reject, timer })
      this.socket?.send(JSON.stringify({ ...message, id }))
    })
  }

  private setStatus(status: ConnectionStatus, error?: string): void {
    this._lastError = error
    if (this._status === status && !error && this._unreachable === this.notifiedUnreachable) return
    this.notifiedUnreachable = this._unreachable
    this._status = status
    for (const listener of this.statusListeners) listener(status, error)
  }

  private open(): void {
    const factory =
      this.options.socketFactory ?? ((url: string) => new WebSocket(url) as unknown as SocketLike)
    this.setStatus(this.attempt === 0 ? 'connecting' : 'reconnecting')
    let socket: SocketLike
    try {
      socket = factory(daemonUrl(this.options.host, this.options.port))
    } catch (error) {
      this.scheduleReconnect(String(error))
      return
    }
    this.socket = socket
    this.clearConnectTimer()
    this.connectTimer = setTimeout(() => {
      this.connectTimer = null
      if (this.socket !== socket) return
      // No answer at all: drop this attempt instead of waiting for the OS timeout.
      this.socket = null
      socket.onopen = null
      socket.onclose = null
      socket.close()
      this._unreachable = true
      this.failPending('disconnected')
      this.scheduleReconnect('unreachable')
    }, this.options.connectTimeoutMs ?? 10_000)
    socket.onopen = () => {
      this.clearConnectTimer()
      this._unreachable = false
      this.setStatus('authenticating')
      this.sendRequest({
        type: 'auth',
        token: this.options.token,
        protocolVersion: PROTOCOL_VERSION,
        client: this.options.clientName,
      })
        .then((reply) => {
          if (reply.type !== 'auth.ok') return
          const { type: _t, replyTo: _r, ...hello } = reply
          this._hello = hello
          this.attempt = 0
          this.setStatus('open')
          for (const listener of this.readyListeners) listener(hello)
        })
        .catch((error: unknown) => {
          const code = error instanceof DaemonRequestError ? error.code : undefined
          if (code === 'unauthorized' || code === 'protocol_mismatch') {
            this.stopped = true
            this.setStatus('unauthorized', (error as Error).message)
          }
        })
    }
    socket.onmessage = (event) => this.handleMessage(event.data)
    socket.onerror = () => {
      // onclose follows and drives reconnection.
    }
    socket.onclose = (event) => {
      if (this.socket !== socket) return
      this.socket = null
      // Closed before opening, within the timeout: something answered (refused, no network).
      if (this.connectTimer) this._unreachable = false
      this.clearConnectTimer()
      this.failPending('disconnected')
      if (FATAL_CLOSE_CODES.has(event.code)) {
        this.stopped = true
        this.setStatus('unauthorized', event.reason || 'connection refused by the daemon')
        return
      }
      this.scheduleReconnect(event.reason)
    }
  }

  private handleMessage(data: unknown): void {
    const parsed = parseServerMessage(typeof data === 'string' ? data : String(data))
    if (!parsed.ok) return
    const message = parsed.value
    const replyTo = 'replyTo' in message ? message.replyTo : undefined
    if (replyTo) {
      const pending = this.pending.get(replyTo)
      if (pending) {
        this.pending.delete(replyTo)
        clearTimeout(pending.timer)
        if (message.type === 'error') pending.reject(new DaemonRequestError(message.code, message.message))
        else pending.resolve(message)
      }
    }
    for (const handler of this.handlers.get(message.type) ?? []) handler(message)
    for (const handler of this.handlers.get('*') ?? []) handler(message)
  }

  private failPending(code: 'disconnected'): void {
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer)
      pending.reject(new DaemonRequestError(code, 'connection lost'))
      this.pending.delete(id)
    }
  }

  private scheduleReconnect(reason?: string): void {
    if (this.stopped || this.options.reconnect === false) {
      this.setStatus('closed', reason)
      return
    }
    const min = this.options.minBackoffMs ?? 1_000
    const max = this.options.maxBackoffMs ?? 30_000
    const delay = Math.min(max, min * 2 ** this.attempt)
    this.attempt += 1
    this.setStatus('reconnecting', reason)
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      this.open()
    }, delay)
  }

  private clearRetry(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer)
    this.retryTimer = null
  }

  private clearConnectTimer(): void {
    if (this.connectTimer) clearTimeout(this.connectTimer)
    this.connectTimer = null
  }
}

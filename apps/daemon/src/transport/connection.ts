import type { ServerMessage } from '@claude-remote/protocol'

/** Per-connection view handed to message handlers. */
export interface Connection {
  readonly id: string
  /** Whether the app reported itself as in the foreground (used to suppress push). */
  foreground: boolean
  send(message: ServerMessage): void
  /** Registers cleanup to run when the socket closes (e.g. drop subscriptions). */
  onClose(fn: () => void): void
  close(code?: number, reason?: string): void
}

/** Tracks authenticated connections and fans out broadcasts. */
export class ClientHub {
  private readonly connections = new Map<string, Connection>()

  add(connection: Connection): void {
    this.connections.set(connection.id, connection)
    connection.onClose(() => this.connections.delete(connection.id))
  }

  broadcast(message: ServerMessage): void {
    for (const connection of this.connections.values()) connection.send(message)
  }

  get size(): number {
    return this.connections.size
  }

  hasForegroundClient(): boolean {
    for (const connection of this.connections.values()) if (connection.foreground) return true
    return false
  }

  closeAll(code = 4001, reason = 'closed'): void {
    for (const connection of [...this.connections.values()]) connection.close(code, reason)
  }
}

export type Broadcaster = Pick<ClientHub, 'broadcast'>

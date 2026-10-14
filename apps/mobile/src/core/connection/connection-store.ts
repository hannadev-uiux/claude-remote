import { create } from 'zustand'
import type { Credentials } from '../storage/credentials'
import { type ConnectionStatus, DaemonClient, type Hello } from './daemon-client'

type ConnectionState = {
  credentials: Credentials | null
  /** False until SecureStore has been read once. */
  credentialsLoaded: boolean
  client: DaemonClient | null
  status: ConnectionStatus
  error: string | undefined
  hello: Hello | null
  /** Starts (or restarts) the connection for the given credentials; null disconnects. */
  setCredentials(credentials: Credentials | null): void
}

/** Global connection state. Feature stores subscribe to `client` for their messages. */
export const useConnectionStore = create<ConnectionState>((set, get) => ({
  credentials: null,
  credentialsLoaded: false,
  client: null,
  status: 'idle',
  error: undefined,
  hello: null,
  setCredentials(credentials) {
    get().client?.close()
    if (!credentials) {
      set({
        credentials: null,
        credentialsLoaded: true,
        client: null,
        status: 'idle',
        hello: null,
        error: undefined,
      })
      return
    }
    const client = new DaemonClient({ ...credentials, clientName: 'claude-remote-ios' })
    client.onStatus((status, error) => set({ status, error }))
    client.onReady((hello) => set({ hello }))
    set({
      credentials,
      credentialsLoaded: true,
      client,
      status: client.status,
      hello: null,
      error: undefined,
    })
    client.connect()
  },
}))

export function getClient(): DaemonClient | null {
  return useConnectionStore.getState().client
}

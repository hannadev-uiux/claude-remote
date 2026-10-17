import type { ServerMessageOf, ServerMessageType } from '@remote-harness/protocol'
import { useEffect, useRef } from 'react'
import { useConnectionStore } from './connection-store'

export function useDaemonClient() {
  return useConnectionStore((s) => s.client)
}

/** Subscribes to one server message type for the lifetime of the component. */
export function useDaemonEvent<T extends ServerMessageType>(
  type: T,
  handler: (message: ServerMessageOf<T>) => void,
) {
  const client = useDaemonClient()
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => {
    if (!client) return
    return client.on(type, (message) => ref.current(message))
  }, [client, type])
}

export function useIsConnected() {
  return useConnectionStore((s) => s.status === 'open')
}

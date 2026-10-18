import type { QueuedMessage } from '@remote-harness/protocol'
import { create } from 'zustand'
import type { DaemonClient } from '@/core/connection/daemon-client'

type QueueState = { bySession: Record<string, QueuedMessage[]> }

const EMPTY: QueuedMessage[] = []

export const useQueueStore = create<QueueState>(() => ({ bySession: {} }))

export function selectQueueFor(sessionId: string) {
  return (s: QueueState) => s.bySession[sessionId] ?? EMPTY
}

/** Mirrors each session's queued prompts. The daemon replays non-empty queues on every (re)connect. */
export function bindQueue(client: DaemonClient): () => void {
  const offs = [
    client.onReady(() => useQueueStore.setState({ bySession: {} })),
    client.on('session.queue', ({ sessionId, items }) => {
      useQueueStore.setState((s) => {
        if (items.length === 0) {
          const { [sessionId]: _gone, ...rest } = s.bySession
          return { bySession: rest }
        }
        return { bySession: { ...s.bySession, [sessionId]: items } }
      })
    }),
  ]
  return () => {
    for (const off of offs) off()
  }
}

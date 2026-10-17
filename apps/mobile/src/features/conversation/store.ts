import type { ServerMessageOf, TranscriptEntry } from '@remote-harness/protocol'
import { create } from 'zustand'
import type { DaemonClient } from '@/core/connection/daemon-client'
import { mergeEntries } from './timeline'

export type StreamState = {
  entries: TranscriptEntry[]
  /** Highest line cursor received; used to resume after reconnecting. */
  lastCursor: number | null
  hasMore: boolean
  loadingOlder: boolean
  /** Last subscription failure (rendered with `errorMessage`), null when fine. */
  error: unknown
}

const EMPTY: StreamState = { entries: [], lastCursor: null, hasMore: false, loadingOlder: false, error: null }

type TranscriptStore = {
  streams: Record<string, StreamState>
  update(key: string, fn: (s: StreamState) => Partial<StreamState>): void
}

export const useTranscriptStore = create<TranscriptStore>((set) => ({
  streams: {},
  update: (key, fn) =>
    set((state) => {
      const current = state.streams[key] ?? EMPTY
      return { streams: { ...state.streams, [key]: { ...current, ...fn(current) } } }
    }),
}))

export function streamKey(sessionId: string, agentId?: string): string {
  return agentId ? `${sessionId}#${agentId}` : sessionId
}

export function selectStream(key: string) {
  return (s: TranscriptStore) => s.streams[key] ?? EMPTY
}

function maxCursor(entries: readonly TranscriptEntry[], fallback: number | null): number | null {
  return entries.reduce<number | null>(
    (max, e) => (max === null || e.cursor > max ? e.cursor : max),
    fallback,
  )
}

function applyEntries(key: string, entries: TranscriptEntry[], patch: Partial<StreamState> = {}) {
  useTranscriptStore.getState().update(key, (s) => ({
    entries: mergeEntries(s.entries, entries),
    lastCursor: maxCursor(entries, s.lastCursor),
    error: null,
    ...patch,
  }))
}

/**
 * Subscribes to a session transcript and keeps it live across reconnects (resuming from the last
 * cursor). Returns an unsubscribe function.
 */
export function subscribeTranscript(client: DaemonClient, sessionId: string, agentId?: string): () => void {
  const key = streamKey(sessionId, agentId)

  const subscribe = async () => {
    const { lastCursor } = useTranscriptStore.getState().streams[key] ?? EMPTY
    try {
      const reply = await client.request({
        type: 'session.subscribe',
        sessionId,
        agentId,
        ...(lastCursor !== null ? { sinceCursor: lastCursor } : {}),
      })
      if (reply.type !== 'transcript.page') return
      applyEntries(key, reply.entries, lastCursor === null ? { hasMore: reply.hasMore } : {})
    } catch (error) {
      useTranscriptStore.getState().update(key, () => ({ error: error ?? null }))
    }
  }

  const onEntry = (message: ServerMessageOf<'transcript.entry'>) => {
    if (message.sessionId !== sessionId || message.agentId !== agentId) return
    applyEntries(key, [message.entry])
  }

  const offEntry = client.on('transcript.entry', onEntry)
  const offReady = client.onReady(() => void subscribe())
  if (client.status === 'open') void subscribe()

  return () => {
    offEntry()
    offReady()
    client.send({ type: 'session.unsubscribe', sessionId, agentId })
  }
}

/** Loads the page before the oldest loaded entry. */
export async function loadOlder(client: DaemonClient, sessionId: string, agentId?: string): Promise<void> {
  const key = streamKey(sessionId, agentId)
  const state = useTranscriptStore.getState().streams[key] ?? EMPTY
  if (state.loadingOlder || !state.hasMore) return
  const oldest = state.entries[0]?.cursor
  if (oldest === undefined) return
  useTranscriptStore.getState().update(key, () => ({ loadingOlder: true }))
  try {
    const reply = await client.request({
      type: 'session.history',
      sessionId,
      agentId,
      before: oldest,
      limit: 50,
    })
    if (reply.type === 'transcript.page') applyEntries(key, reply.entries, { hasMore: reply.hasMore })
  } finally {
    useTranscriptStore.getState().update(key, () => ({ loadingOlder: false }))
  }
}

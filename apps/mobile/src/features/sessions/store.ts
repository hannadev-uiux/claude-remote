import type { Session } from '@remote-harness/protocol'
import { create } from 'zustand'
import type { DaemonClient } from '@/core/connection/daemon-client'

type SessionsState = {
  sessions: Record<string, Session>
  loaded: boolean
  refreshing: boolean
  applySnapshot(sessions: Session[]): void
  upsert(session: Session): void
  patch(id: string, patch: Partial<Session>): void
  remove(id: string): void
}

export const useSessionsStore = create<SessionsState>((set) => ({
  sessions: {},
  loaded: false,
  refreshing: false,
  applySnapshot: (sessions) =>
    set({ sessions: Object.fromEntries(sessions.map((s) => [s.id, s])), loaded: true }),
  upsert: (session) => set((state) => ({ sessions: { ...state.sessions, [session.id]: session } })),
  patch: (id, patch) =>
    set((state) => {
      const current = state.sessions[id]
      return current ? { sessions: { ...state.sessions, [id]: { ...current, ...patch } } } : state
    }),
  remove: (id) =>
    set((state) => {
      const { [id]: _removed, ...rest } = state.sessions
      return { sessions: rest }
    }),
}))

export async function refreshSessions(client: DaemonClient): Promise<void> {
  useSessionsStore.setState({ refreshing: true })
  try {
    const reply = await client.request({ type: 'sessions.list' })
    if (reply.type === 'sessions.snapshot') useSessionsStore.getState().applySnapshot(reply.sessions)
  } finally {
    useSessionsStore.setState({ refreshing: false })
  }
}

/** Keeps the sessions store in sync with the daemon. Returns an unsubscribe function. */
export function bindSessions(client: DaemonClient): () => void {
  const store = useSessionsStore.getState()
  const offs = [
    client.onReady(() => void refreshSessions(client).catch(() => undefined)),
    client.on('session.updated', (m) => store.upsert(m.session)),
    client.on('session.removed', (m) => store.remove(m.sessionId)),
    client.on('session.state', (m) =>
      store.patch(m.sessionId, { state: m.state, permissionMode: m.permissionMode }),
    ),
    client.on('subagent.updated', (m) => {
      const current = useSessionsStore.getState().sessions[m.sessionId]
      if (!current) return
      const others = current.subagents.filter((s) => s.agentId !== m.subagent.agentId)
      store.patch(m.sessionId, { subagents: [...others, m.subagent] })
    }),
  ]
  if (client.status === 'open') void refreshSessions(client).catch(() => undefined)
  return () => {
    for (const off of offs) off()
  }
}

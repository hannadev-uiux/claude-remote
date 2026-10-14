import type { MuteState } from '@claude-remote/protocol'
import { create } from 'zustand'
import type { DaemonClient } from '@/core/connection/daemon-client'

export const useMuteStore = create<MuteState>(() => ({ profiles: [], sessions: [] }))

export function bindMute(client: DaemonClient): () => void {
  const offs = [
    client.onReady((hello) => useMuteStore.setState(hello.muted)),
    client.on('mute.updated', (m) => useMuteStore.setState(m.muted)),
  ]
  if (client.hello) useMuteStore.setState(client.hello.muted)
  return () => {
    for (const off of offs) off()
  }
}

/** Optimistically flips a mute flag; the daemon's `mute.updated` is the source of truth. */
export async function setMuted(
  client: DaemonClient,
  target: 'profile' | 'session',
  targetId: string,
  muted: boolean,
) {
  const key = target === 'profile' ? 'profiles' : 'sessions'
  const previous = useMuteStore.getState()
  const without = previous[key].filter((x) => x !== targetId)
  useMuteStore.setState({ [key]: muted ? [...without, targetId] : without })
  try {
    await client.request({ type: 'settings.mute', target, targetId, muted })
  } catch (error) {
    useMuteStore.setState(previous)
    throw error
  }
}

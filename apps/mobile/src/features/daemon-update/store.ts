import type { DaemonUpdateChannel, DaemonUpdateInfo } from '@remote-harness/protocol'
import { create } from 'zustand'
import type { DaemonClient } from '@/core/connection/daemon-client'

type DaemonUpdateState = {
  /** The daemon accepts `daemon.update.*` (it says so in `auth.ok`). */
  supported: boolean
  info: DaemonUpdateInfo | null
  /** A request of this phone is in flight. */
  pending: 'check' | 'start' | null
}

export const useDaemonUpdateStore = create<DaemonUpdateState>(() => ({
  supported: false,
  info: null,
  pending: null,
}))

/** Follows the daemon's update info: asked on every (re)connection, then pushed by the daemon. */
export function bindDaemonUpdate(client: DaemonClient): () => void {
  const ready = () => {
    const supported = Boolean(client.hello?.update)
    useDaemonUpdateStore.setState({ supported, ...(supported ? {} : { info: null }) })
    if (supported) void checkDaemonUpdate(client).catch(() => undefined)
  }
  const offs = [
    client.onReady(ready),
    client.on('daemon.update.info', (m) => useDaemonUpdateStore.setState({ info: m.info })),
  ]
  if (client.hello) ready()
  return () => {
    for (const off of offs) off()
  }
}

async function request(
  client: DaemonClient,
  kind: 'check' | 'start',
  message: Parameters<DaemonClient['request']>[0],
): Promise<void> {
  useDaemonUpdateStore.setState({ pending: kind })
  try {
    const reply = await client.request(message, { timeoutMs: 60_000 })
    if (reply.type === 'daemon.update.info') useDaemonUpdateStore.setState({ info: reply.info })
  } finally {
    useDaemonUpdateStore.setState({ pending: null })
  }
}

/** Asks for the info; a `channel` is saved on the computer, `force` checks the remote now. */
export function checkDaemonUpdate(
  client: DaemonClient,
  o: { channel?: DaemonUpdateChannel; force?: boolean } = {},
): Promise<void> {
  return request(client, 'check', { type: 'daemon.update.check', ...o })
}

export function startDaemonUpdate(client: DaemonClient, channel: DaemonUpdateChannel): Promise<void> {
  return request(client, 'start', { type: 'daemon.update.start', channel })
}

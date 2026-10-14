import { beforeEach, describe, expect, test } from 'vitest'
import type { DaemonClient } from '@/core/connection/daemon-client'
import { setMuted, useMuteStore } from './store'

beforeEach(() => useMuteStore.setState({ profiles: [], sessions: [] }))

describe('setMuted', () => {
  test('applies optimistically and sends settings.mute', async () => {
    const sent: unknown[] = []
    const client = {
      request: async (m: unknown) => {
        sent.push(m)
        return { type: 'ack' }
      },
    } as unknown as DaemonClient
    await setMuted(client, 'profile', 'claudin', true)
    expect(useMuteStore.getState().profiles).toEqual(['claudin'])
    expect(sent[0]).toEqual({ type: 'settings.mute', target: 'profile', targetId: 'claudin', muted: true })
  })

  test('rolls back when the daemon rejects', async () => {
    const client = { request: async () => Promise.reject(new Error('x')) } as unknown as DaemonClient
    await expect(setMuted(client, 'session', 's1', true)).rejects.toThrow()
    expect(useMuteStore.getState().sessions).toEqual([])
  })
})

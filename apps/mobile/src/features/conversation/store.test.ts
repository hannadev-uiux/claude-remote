import type { ServerMessage, TranscriptEntry } from '@remote-harness/protocol'
import { beforeEach, describe, expect, test } from 'vitest'
import type { DaemonClient } from '@/core/connection/daemon-client'
import { loadOlder, selectStream, subscribeTranscript, useTranscriptStore } from './store'

function entry(cursor: number): TranscriptEntry {
  return {
    kind: 'user',
    text: `m${cursor}`,
    images: [],
    cursor,
    index: 0,
    uuid: `u${cursor}`,
    key: `u${cursor}:0`,
    timestamp: null,
    isSidechain: false,
  }
}

function fakeClient() {
  const handlers: Record<string, ((m: ServerMessage) => void)[]> = {}
  const ready: (() => void)[] = []
  const requests: Record<string, unknown>[] = []
  let replies: ServerMessage[] = []
  const client = {
    status: 'open',
    on: (type: string, h: (m: ServerMessage) => void) => {
      handlers[type] = [...(handlers[type] ?? []), h]
      return () => undefined
    },
    onReady: (h: () => void) => {
      ready.push(h)
      return () => undefined
    },
    request: async (m: Record<string, unknown>) => {
      requests.push(m)
      const reply = replies.shift()
      if (!reply) throw new Error('no reply')
      return reply
    },
    send: (m: Record<string, unknown>) => requests.push(m),
  }
  return {
    client: client as unknown as DaemonClient,
    requests,
    reply: (...m: ServerMessage[]) => {
      replies = [...replies, ...m]
    },
    emit: (m: ServerMessage) => {
      for (const h of handlers[m.type] ?? []) h(m)
    },
    reconnect: () => {
      for (const h of ready) h()
    },
  }
}

const tick = () => new Promise((r) => setTimeout(r, 0))
const page = (entries: TranscriptEntry[], hasMore: boolean): ServerMessage => ({
  type: 'transcript.page',
  sessionId: 's',
  entries,
  hasMore,
  lineCount: 100,
})

beforeEach(() => useTranscriptStore.setState({ streams: {} }))

describe('transcript store', () => {
  test('subscribes, streams live entries and resumes from the last cursor', async () => {
    const f = fakeClient()
    f.reply(page([entry(50), entry(51)], true))
    const off = subscribeTranscript(f.client, 's')
    await tick()
    expect(f.requests[0]).toEqual({ type: 'session.subscribe', sessionId: 's', agentId: undefined })
    f.emit({ type: 'transcript.entry', sessionId: 's', cursor: 52, entry: entry(52) })
    f.emit({ type: 'transcript.entry', sessionId: 's', cursor: 52, entry: entry(52) })
    f.emit({ type: 'transcript.entry', sessionId: 'other', cursor: 9, entry: entry(9) })
    let state = selectStream('s')(useTranscriptStore.getState())
    expect(state.entries.map((e) => e.cursor)).toEqual([50, 51, 52])

    f.reply(page([entry(53)], false))
    f.reconnect()
    await tick()
    expect(f.requests[1]).toMatchObject({ type: 'session.subscribe', sinceCursor: 52 })
    state = selectStream('s')(useTranscriptStore.getState())
    expect(state.entries.map((e) => e.cursor)).toEqual([50, 51, 52, 53])
    expect(state.hasMore).toBe(true)
    off()
    expect(f.requests.at(-1)).toMatchObject({ type: 'session.unsubscribe' })
  })

  test('loads older pages before the oldest entry', async () => {
    const f = fakeClient()
    f.reply(page([entry(50)], true), page([entry(10), entry(20)], false))
    subscribeTranscript(f.client, 's')
    await tick()
    await loadOlder(f.client, 's')
    expect(f.requests[1]).toMatchObject({ type: 'session.history', before: 50, limit: 50 })
    const state = selectStream('s')(useTranscriptStore.getState())
    expect(state.entries.map((e) => e.cursor)).toEqual([10, 20, 50])
    expect(state.hasMore).toBe(false)
  })
})

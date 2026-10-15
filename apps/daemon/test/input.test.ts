import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { KeyedMutex } from '../src/core/keyed-mutex.ts'
import { silentLogger } from '../src/core/logger.ts'
import { InputService } from '../src/features/input/service.ts'
import { SessionStore } from '../src/features/sessions/store.ts'
import type { SessionRecord } from '../src/features/sessions/types.ts'
import { TmuxClient } from '../src/infra/tmux.ts'
import { fakeExecutor, useTempHome } from './helpers.ts'

const home = useTempHome()

function session(patch: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: 'abcdef123456',
    profileId: 'claudin',
    cwd: '/w',
    title: 't',
    state: 'idle',
    permissionMode: 'default',
    controllable: true,
    paneId: '%7',
    updatedAt: '',
    subagents: [],
    backgroundTasks: 0,
    checkout: null,
    transcriptPath: null,
    ...patch,
  }
}

function setup(strategy: 'paste' | 'type' = 'paste', record = session()) {
  const exec = fakeExecutor()
  const store = new SessionStore({ broadcast: () => {} }, join(home.dir(), 's.json'), silentLogger, 60_000)
  store.upsert(record.id, {}, () => record)
  store.dispose()
  const sleeps: number[] = []
  const service = new InputService(new TmuxClient(exec), store, new KeyedMutex(), {
    strategy,
    pasteEnterDelayMs: 80,
    sleep: async (ms) => {
      sleeps.push(ms)
    },
  })
  return { exec, service, sleeps }
}

describe('InputService', () => {
  test('pastes the prompt, waits, then presses Enter', async () => {
    const { exec, service, sleeps } = setup()
    await service.sendText('abcdef123456', 'linha 1\nlinha 2 @src/a.ts /x')
    expect(exec.calls.map((c) => c.args)).toEqual([
      ['load-buffer', '-b', 'cr-abcdef12-1', '-'],
      ['paste-buffer', '-p', '-d', '-b', 'cr-abcdef12-1', '-t', '%7'],
      ['send-keys', '-t', '%7', 'Enter'],
    ])
    expect(exec.calls[0]?.options?.input).toBe('linha 1\nlinha 2 @src/a.ts /x')
    expect(sleeps).toEqual([80])
  })

  test('type strategy uses backslash-newline and closes menus before Enter', async () => {
    const { exec, service } = setup('type')
    await service.sendText('abcdef123456', 'a\nb')
    expect(exec.calls.map((c) => c.args.slice(3))).toEqual([
      ['-l', '--', 'a'],
      ['-l', '--', '\\'],
      ['Enter'],
      ['-l', '--', 'b'],
      ['Escape'],
      ['Enter'],
    ])
  })

  test('serializes concurrent prompts per session', async () => {
    const { exec, service } = setup()
    await Promise.all([service.sendText('abcdef123456', 'um'), service.sendText('abcdef123456', 'dois')])
    const order = exec.calls.filter((c) => c.args[0] !== 'load-buffer').map((c) => c.args.at(-1))
    expect(order).toEqual(['%7', 'Enter', '%7', 'Enter'])
    expect(exec.calls[0]?.options?.input).toBe('um')
    expect(exec.calls[3]?.options?.input).toBe('dois')
  })

  test('sends allowed keys and rejects others', async () => {
    const { exec, service } = setup()
    await service.sendKey('abcdef123456', 'Escape')
    expect(exec.calls[0]?.args).toEqual(['send-keys', '-t', '%7', 'Escape'])
    await expect(service.sendKey('abcdef123456', 'C-z')).rejects.toMatchObject({ code: 'invalid_key' })
  })

  test('refuses read-only sessions, unknown sessions and huge prompts', async () => {
    const { service } = setup('paste', session({ controllable: false, paneId: null }))
    await expect(service.sendText('abcdef123456', 'oi')).rejects.toMatchObject({ code: 'not_controllable' })
    await expect(service.sendText('nope', 'oi')).rejects.toMatchObject({ code: 'not_found' })
    await expect(service.sendText('abcdef123456', 'x'.repeat(200 * 1024))).rejects.toMatchObject({
      code: 'too_large',
    })
  })
})

import { join } from 'node:path'
import type { PermissionMode } from '@claude-remote/protocol'
import { describe, expect, test } from 'vitest'
import { KeyedMutex } from '../src/core/keyed-mutex.ts'
import { silentLogger } from '../src/core/logger.ts'
import { detectMode } from '../src/features/mode/detect.ts'
import { ModeService } from '../src/features/mode/service.ts'
import { SessionStore } from '../src/features/sessions/store.ts'
import { TmuxClient } from '../src/infra/tmux.ts'
import { fakeExecutor, useTempHome } from './helpers.ts'

const home = useTempHome()

const LABEL: Record<PermissionMode, string> = {
  default: '? for shortcuts',
  acceptEdits: '⏵⏵ accept edits on (shift+tab to cycle)',
  plan: '⏸ plan mode on (shift+tab to cycle)',
  auto: '⏵⏵ auto mode on (shift+tab to cycle)',
  bypassPermissions: '⏵⏵ bypass permissions on (shift+tab to cycle)',
  dontAsk: "⏵⏵ don't ask on",
}

function pane(mode: PermissionMode): string {
  return `╭────╮\n│ > │\n╰────╯\n  ${LABEL[mode]}\n\n`
}

describe('detectMode', () => {
  test('recognizes every label', () => {
    for (const mode of Object.keys(LABEL) as PermissionMode[]) expect(detectMode(pane(mode))).toBe(mode)
    expect(detectMode('  ⏸ manual mode on')).toBe('default')
  })

  test('ignores labels far above the status line', () => {
    const text = `plan mode on\n${'linha\n'.repeat(20)}> prompt\n`
    expect(detectMode(text)).toBe('default')
  })
})

function setup(cycle: PermissionMode[], start = 0, pending = false) {
  let index = start
  const exec = fakeExecutor((call) => {
    if (call.args[0] === 'capture-pane') return { stdout: pane(cycle[index]!) }
    if (call.args[0] === 'send-keys' && call.args.includes('BTab')) index = (index + 1) % cycle.length
    return undefined
  })
  const store = new SessionStore({ broadcast: () => {} }, join(home.dir(), 's.json'), silentLogger, 60_000)
  store.upsert('s', {}, () => ({
    id: 's',
    profileId: 'p',
    cwd: '/w',
    title: '',
    state: 'idle',
    permissionMode: null,
    controllable: true,
    paneId: '%1',
    updatedAt: '',
    subagents: [],
    backgroundTasks: 0,
    checkout: null,
    transcriptPath: null,
  }))
  store.dispose()
  const service = new ModeService(new TmuxClient(exec), store, new KeyedMutex(), () => pending, {
    sleep: async () => {},
  })
  const presses = () => exec.calls.filter((c) => c.args.includes('BTab')).length
  return { service, store, presses }
}

describe('ModeService', () => {
  test('cycles until the target is confirmed', async () => {
    const { service, store, presses } = setup(['default', 'acceptEdits', 'plan', 'auto'])
    expect(await service.setMode('s', 'plan')).toBe('plan')
    expect(presses()).toBe(2)
    expect(store.get('s')?.permissionMode).toBe('plan')
  })

  test('skips bypass permissions', async () => {
    const { service, presses } = setup(['plan', 'bypassPermissions', 'auto', 'default'])
    expect(await service.setMode('s', 'auto')).toBe('auto')
    expect(presses()).toBe(2)
  })

  test('does nothing when already in the target mode', async () => {
    const { service, presses } = setup(['default', 'acceptEdits'])
    expect(await service.setMode('s', 'default')).toBe('default')
    expect(presses()).toBe(0)
  })

  test('reports the real mode when the target is unreachable', async () => {
    const { service, store } = setup(['default', 'acceptEdits', 'plan'])
    await expect(service.setMode('s', 'auto')).rejects.toMatchObject({ code: 'mode_unreachable' })
    expect(store.get('s')?.permissionMode).toBeDefined()
  })

  test('refuses bypass, unknown modes and busy sessions', async () => {
    const { service, presses } = setup(['default'])
    await expect(service.setMode('s', 'bypassPermissions')).rejects.toMatchObject({ code: 'mode_forbidden' })
    await expect(service.setMode('s', 'yolo')).rejects.toMatchObject({ code: 'bad_request' })
    expect(presses()).toBe(0)
    const busy = setup(['default'], 0, true)
    await expect(busy.service.setMode('s', 'plan')).rejects.toMatchObject({ code: 'session_busy' })
  })
})

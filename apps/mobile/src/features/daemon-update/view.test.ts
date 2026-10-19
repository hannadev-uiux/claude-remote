import type { DaemonUpdateInfo, DaemonUpdateRun } from '@remote-harness/protocol'
import { describe, expect, test } from 'vitest'
import { availableLabel, confirmationWarnings, daemonUpdatePhase, RUN_NOTE_MS, runNote } from './view'

const info = (patch: Partial<DaemonUpdateInfo> = {}): DaemonUpdateInfo => ({
  current: '0.12.0',
  channel: 'main',
  checkedAt: null,
  checking: false,
  available: null,
  blocked: null,
  busy: false,
  run: null,
  ...patch,
})

const run = (patch: Partial<DaemonUpdateRun> = {}): DaemonUpdateRun => ({
  channel: 'main',
  from: '0.11.0',
  to: '0.12.0',
  commit: 'abcdef1234',
  step: 'done',
  startedAt: '2026-10-19T10:00:00.000Z',
  finishedAt: '2026-10-19T10:02:00.000Z',
  ...patch,
})

describe('daemon update phase', () => {
  test('older daemons and the first load', () => {
    expect(daemonUpdatePhase(null, false)).toEqual({ kind: 'unsupported' })
    expect(daemonUpdatePhase(null, true)).toEqual({ kind: 'loading' })
  })

  test('a blocker wins, then a running step, then a check, then the available version', () => {
    expect(daemonUpdatePhase(info({ blocked: 'not-installer', checking: true }), true)).toEqual({
      kind: 'blocked',
      reason: 'not-installer',
    })
    expect(daemonUpdatePhase(info({ run: run({ step: 'building', finishedAt: null }) }), true)).toEqual({
      kind: 'running',
      step: 'building',
      index: 2,
    })
    expect(daemonUpdatePhase(info({ checking: true }), true)).toEqual({ kind: 'checking' })
    expect(
      daemonUpdatePhase(info({ available: { version: '0.11.0', commit: 'abc', downgrade: true } }), true),
    ).toEqual({ kind: 'available', label: '0.11.0', downgrade: true })
    expect(daemonUpdatePhase(info({ run: run() }), true)).toEqual({ kind: 'upToDate' })
  })

  test('a new commit with the same version shows the short commit', () => {
    expect(availableLabel({ version: '0.12.0', commit: 'abcdef1234' }, '0.12.0')).toBe('0.12.0 (abcdef1)')
    expect(availableLabel({ version: null, commit: 'abcdef1234' }, '0.12.0')).toBe('abcdef1')
  })
})

describe('run note', () => {
  const now = Date.parse('2026-10-19T11:00:00.000Z')

  test('tells a recent update and a recent failure with its rollback', () => {
    expect(runNote(run(), '0.12.0', now)).toEqual({ kind: 'updated', version: '0.12.0' })
    expect(
      runNote(run({ step: 'failed', error: 'build failed', rolledBack: true, to: '0.13.0' }), '0.12.0', now),
    ).toEqual({ kind: 'failed', error: 'build failed', rolledBack: true, version: '0.11.0' })
  })

  test('says nothing for old runs, unfinished runs or no-op runs', () => {
    expect(runNote(run(), '0.12.0', Date.parse(run().finishedAt ?? '') + RUN_NOTE_MS + 1)).toBeNull()
    expect(runNote(run({ step: 'building', finishedAt: null }), '0.12.0', now)).toBeNull()
    expect(runNote(run({ from: '0.12.0' }), '0.12.0', now)).toBeNull()
    expect(runNote(null, '0.12.0', now)).toBeNull()
  })
})

test('the confirmation warns about an older version and busy sessions', () => {
  expect(
    confirmationWarnings(
      info({ busy: true, available: { version: '0.11.0', commit: 'a', downgrade: true } }),
    ),
  ).toEqual({ older: true, busy: true })
  expect(confirmationWarnings(info())).toEqual({ older: false, busy: false })
})

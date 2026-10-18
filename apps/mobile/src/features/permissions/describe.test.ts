import { describe, expect, test } from 'vitest'
import { createI18n } from '@/core/i18n/create'
import { buildRespond, describePermission, permissionTimer, secondsLeft } from './describe'

const en = createI18n('en-US').t
const pt = createI18n('pt-BR').t

test('permissionTimer counts the wait and flags the last 30 seconds', () => {
  const created = '2026-10-18T12:00:00Z'
  const expires = '2026-10-18T12:06:00Z'
  // 4:36 waiting, 84 s left.
  expect(permissionTimer(created, expires, Date.parse('2026-10-18T12:04:36Z'))).toEqual({
    elapsedMs: 276_000,
    urgent: false,
  })
  // 5:40 waiting, 20 s left.
  expect(permissionTimer(created, expires, Date.parse('2026-10-18T12:05:40Z'))).toEqual({
    elapsedMs: 340_000,
    urgent: true,
  })
  // A clock behind the daemon never shows a negative wait; a bad date shows zero.
  expect(permissionTimer(created, expires, Date.parse('2026-10-18T11:59:00Z')).elapsedMs).toBe(0)
  expect(permissionTimer('nope', expires, Date.parse('2026-10-18T12:01:00Z')).elapsedMs).toBe(0)
})

describe('describePermission', () => {
  test('shows the full command for Bash', () => {
    expect(describePermission({ tool: 'Bash', input: { command: 'rm -rf dist' } }, en)).toEqual({
      title: 'Bash(rm -rf dist)',
      detail: 'rm -rf dist',
      detailLabel: 'command',
    })
    expect(describePermission({ tool: 'Bash', input: { command: 'ls' } }, pt).detailLabel).toBe('comando')
  })

  test('shows paths and falls back to JSON', () => {
    expect(describePermission({ tool: 'Edit', input: { file_path: '/w/a.ts' } }, en).detail).toBe('/w/a.ts')
    expect(describePermission({ tool: 'mcp__x__y', input: { n: 1 } }, en).detailLabel).toBe('input')
  })
})

describe('buildRespond', () => {
  test('includes the trimmed rule only when allowing always', () => {
    expect(buildRespond('r', 'allow', { rule: ' Bash(pnpm test:*) ', scope: 'project' })).toEqual({
      type: 'permission.respond',
      requestId: 'r',
      decision: 'allow',
      always: { rule: 'Bash(pnpm test:*)', scope: 'project' },
    })
    expect(buildRespond('r', 'deny', { rule: 'x', scope: 'profile' })).toEqual({
      type: 'permission.respond',
      requestId: 'r',
      decision: 'deny',
    })
    expect(buildRespond('r', 'allow')).toEqual({
      type: 'permission.respond',
      requestId: 'r',
      decision: 'allow',
    })
  })

  test('computes the countdown', () => {
    expect(secondsLeft('2026-10-14T12:01:00Z', Date.parse('2026-10-14T12:00:00Z'))).toBe(60)
    expect(secondsLeft('2026-10-14T11:00:00Z', Date.parse('2026-10-14T12:00:00Z'))).toBe(0)
  })
})

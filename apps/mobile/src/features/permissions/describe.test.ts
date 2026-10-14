import { describe, expect, test } from 'vitest'
import { buildRespond, describePermission, secondsLeft } from './describe'

describe('describePermission', () => {
  test('shows the full command for Bash', () => {
    expect(describePermission({ tool: 'Bash', input: { command: 'rm -rf dist' } })).toEqual({
      title: 'Bash(rm -rf dist)',
      detail: 'rm -rf dist',
      detailLabel: 'comando',
    })
  })

  test('shows paths and falls back to JSON', () => {
    expect(describePermission({ tool: 'Edit', input: { file_path: '/w/a.ts' } }).detail).toBe('/w/a.ts')
    expect(describePermission({ tool: 'mcp__x__y', input: { n: 1 } }).detailLabel).toBe('entrada')
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

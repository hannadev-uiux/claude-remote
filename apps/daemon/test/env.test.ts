import { describe, expect, test } from 'vitest'
import { envVar } from '../src/core/env.ts'
import { dataHome } from '../src/core/paths.ts'

describe('envVar', () => {
  test('prefers REMOTE_HARNESS_*, then the legacy CLAUDE_REMOTE_* name', () => {
    expect(envVar('REF', { REMOTE_HARNESS_REF: 'a', CLAUDE_REMOTE_REF: 'b' })).toBe('a')
    expect(envVar('REF', { CLAUDE_REMOTE_REF: 'b' })).toBe('b')
    expect(envVar('REF', { REMOTE_HARNESS_REF: '', CLAUDE_REMOTE_REF: 'b' })).toBe('b')
    expect(envVar('REF', {})).toBeUndefined()
  })
})

describe('dataHome', () => {
  const existing =
    (...dirs: string[]) =>
    (path: string) =>
      dirs.includes(path)

  test('honors the override, new or legacy name', () => {
    expect(dataHome({ REMOTE_HARNESS_HOME: '/d' }, '/h', existing())).toBe('/d')
    expect(dataHome({ CLAUDE_REMOTE_HOME: '/legacy' }, '/h', existing())).toBe('/legacy')
  })

  test('keeps an existing ~/.claude-remote, otherwise uses ~/.remote-harness', () => {
    expect(dataHome({}, '/h', existing())).toBe('/h/.remote-harness')
    expect(dataHome({}, '/h', existing('/h/.claude-remote'))).toBe('/h/.claude-remote')
    expect(dataHome({}, '/h', existing('/h/.claude-remote', '/h/.remote-harness'))).toBe('/h/.remote-harness')
  })
})

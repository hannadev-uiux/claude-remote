import { describe, expect, test } from 'vitest'
import { extractSessionIdFromPathname } from './active-session'

describe('extractSessionIdFromPathname', () => {
  test('conversation route', () => {
    expect(extractSessionIdFromPathname('/session/abc')).toBe('abc')
  })

  test('terminal route keeps the parent session id', () => {
    expect(extractSessionIdFromPathname('/session/abc/terminal')).toBe('abc')
  })

  test('subagent route keeps the parent session id', () => {
    expect(extractSessionIdFromPathname('/session/abc/agent/xyz')).toBe('abc')
  })

  test('session list route has no selected session', () => {
    expect(extractSessionIdFromPathname('/')).toBeNull()
  })

  test('settings route has no selected session', () => {
    expect(extractSessionIdFromPathname('/settings')).toBeNull()
  })
})

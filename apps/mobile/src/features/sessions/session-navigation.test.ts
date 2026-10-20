import { expect, test } from 'vitest'
import { openSessionMode } from './session-navigation'

test('opening a session pushes it, swaps another conversation, or stays', () => {
  expect(openSessionMode('/', 'a')).toBe('push')
  expect(openSessionMode('/settings', 'a')).toBe('push')
  expect(openSessionMode('/session/a', 'a')).toBe('stay')
  expect(openSessionMode('/session/b', 'a')).toBe('replace')
  // Deeper screens of a session keep their place under the conversation.
  expect(openSessionMode('/session/a/terminal', 'a')).toBe('push')
  expect(openSessionMode('/session/b/agent/x', 'a')).toBe('push')
  expect(openSessionMode('/session/a%20b', 'a b')).toBe('stay')
})

import { describe, expect, test } from 'vitest'
import { createTapDeduper, firebaseEnabledFor, NOTIFICATION_CHANNEL_ID } from './platform'

describe('firebaseEnabledFor', () => {
  test('reads the per-platform flag set by app.config.ts', () => {
    const extra = { firebase: { ios: true, android: false } }
    expect(firebaseEnabledFor(extra, 'ios')).toBe(true)
    expect(firebaseEnabledFor(extra, 'android')).toBe(false)
    expect(firebaseEnabledFor(extra, 'web')).toBe(false)
    expect(firebaseEnabledFor(undefined, 'ios')).toBe(false)
    expect(firebaseEnabledFor({ firebaseEnabled: true }, 'ios')).toBe(false)
  })
})

describe('createTapDeduper', () => {
  test('handles a notification once within the window', () => {
    const first = createTapDeduper(1000)
    expect(first('s1', 0)).toBe(true)
    expect(first('s1', 500)).toBe(false)
    expect(first('s2', 600)).toBe(true)
    expect(first('s1', 2000)).toBe(true)
  })
})

test('the channel matches the daemon payload', () => {
  expect(NOTIFICATION_CHANNEL_ID).toBe('claude-remote')
})

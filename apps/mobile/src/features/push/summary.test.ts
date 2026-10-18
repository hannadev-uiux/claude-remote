import { describe, expect, test } from 'vitest'
import { isTestPush } from './payload'
import type { PhonePush } from './push-state'
import { canTestPush, pushIssue } from './summary'

const ready: PhonePush = {
  firebase: true,
  relayConfigured: true,
  permission: 'granted',
  token: 't',
  relay: true,
}

describe('pushIssue', () => {
  test('ready with the relay or Firebase', () => {
    expect(pushIssue('relay', ready)).toBeNull()
    expect(pushIssue('firebase', { ...ready, relay: false, relayConfigured: false })).toBeNull()
  })

  test('in the order the user fixes them', () => {
    expect(pushIssue('relay', { ...ready, firebase: false, permission: 'denied' })).toBe('noFirebase')
    expect(pushIssue('off', { ...ready, permission: 'denied' })).toBe('permissionDenied')
    expect(pushIssue('off', ready)).toBe('daemonOff')
    expect(pushIssue('relay', { ...ready, token: null })).toBe('notRegistered')
  })

  test('relay mode needs a grant', () => {
    expect(pushIssue('relay', { ...ready, relay: false })).toBe('relayFailed')
    expect(pushIssue('relay', { ...ready, relay: false, relayConfigured: false })).toBe('noRelay')
  })

  test('older daemons (unknown mode) only check the phone', () => {
    expect(pushIssue(null, { ...ready, relay: false })).toBeNull()
  })
})

test('canTestPush', () => {
  expect(canTestPush('relay', ready)).toBe(true)
  expect(canTestPush(null, ready)).toBe(false)
  expect(canTestPush('off', ready)).toBe(false)
  expect(canTestPush('firebase', { ...ready, token: null })).toBe(false)
})

test('isTestPush reads the event wherever iOS put it', () => {
  expect(isTestPush({ content: { data: { event: 'test' } } })).toBe(true)
  expect(isTestPush({ content: { data: {} }, trigger: { payload: { event: 'test' } } })).toBe(true)
  expect(isTestPush({ content: { data: { event: 'Stop', sessionId: 's' } } })).toBe(false)
})

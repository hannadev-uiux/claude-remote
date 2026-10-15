import { describe, expect, test } from 'vitest'
import {
  channelHeaders,
  compareVersions,
  daemonOutdated,
  isUpdateChannel,
  shortUpdateId,
  shouldCheck,
  updateChannelOf,
} from './policy'

describe('shouldCheck', () => {
  test('always checks the first time, then every interval', () => {
    expect(shouldCheck(null, 1_000)).toBe(true)
    expect(shouldCheck(0, 29 * 60_000)).toBe(false)
    expect(shouldCheck(0, 30 * 60_000)).toBe(true)
  })
})

describe('compareVersions', () => {
  test.each([
    ['0.3.0', '0.3.0', 0],
    ['0.3.1', '0.3.0', 1],
    ['0.10.0', '0.9.9', 1],
    ['1.0', '1.0.0', 0],
    ['v0.4.0', '0.4.0', 0],
    ['0.4.0-beta.1', '0.4.0', 0],
    ['0.2.9', '0.3.0', -1],
  ] as const)('%s vs %s', (a, b, sign) => {
    expect(Math.sign(compareVersions(a, b))).toBe(sign)
  })
})

describe('daemonOutdated', () => {
  test('only when the daemon is known and older', () => {
    expect(daemonOutdated('0.2.0', '0.3.0')).toBe(true)
    expect(daemonOutdated('0.3.0', '0.3.0')).toBe(false)
    expect(daemonOutdated('0.4.0', '0.3.0')).toBe(false)
    expect(daemonOutdated(undefined, '0.3.0')).toBe(false)
  })
})

test('shortUpdateId', () => {
  expect(shortUpdateId('0f3c2a1b-1111-2222-3333-444455556666')).toBe('0f3c2a1b')
  expect(shortUpdateId(null)).toBeNull()
})

describe('channels', () => {
  test('production keeps the build headers; other channels override them', () => {
    expect(channelHeaders('production')).toBeNull()
    expect(channelHeaders('development')).toEqual({ 'expo-channel-name': 'development' })
  })

  test('isUpdateChannel', () => {
    expect(isUpdateChannel('development')).toBe(true)
    expect(isUpdateChannel('staging')).toBe(false)
    expect(isUpdateChannel(null)).toBe(false)
  })

  test('updateChannelOf reads the signed metadata', () => {
    expect(updateChannelOf({ metadata: { channel: 'development' } })).toBe('development')
    expect(updateChannelOf({ metadata: {} })).toBeNull()
    expect(updateChannelOf(null)).toBeNull()
  })
})

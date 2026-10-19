import { describe, expect, test } from 'vitest'
import { parseCredentials, parsePairingUrl } from './parse-pairing-url'

const token = 'ti0qF1B7akZANBBFwIcB_ZfJzvhtk-__oDDS6jtpIZc'

describe('parsePairingUrl', () => {
  test('reads host, port and token', () => {
    expect(parsePairingUrl(`claude-remote://pair?host=100.101.1.2&port=7337&token=${token}`)).toEqual({
      host: '100.101.1.2',
      port: 7337,
      token,
    })
  })

  test('accepts the remoteharness:// scheme too', () => {
    expect(parsePairingUrl(`remoteharness://pair?host=100.101.1.2&port=7337&token=${token}`)).toEqual({
      host: '100.101.1.2',
      port: 7337,
      token,
    })
  })

  test('rejects other formats', () => {
    expect(parsePairingUrl('https://example.com')).toBeNull()
    expect(parsePairingUrl(`other://pair?host=x&port=7337&token=${token}`)).toBeNull()
    expect(parsePairingUrl('claude-remote://pair?host=x&port=abc&token=t')).toBeNull()
    expect(parsePairingUrl('claude-remote://pair?host=x&port=7337')).toBeNull()
  })

  test('validates manual input', () => {
    expect(parseCredentials({ host: ' mac.tail ', port: '7337', token })).toEqual({
      host: 'mac.tail',
      port: 7337,
      token,
    })
    expect(parseCredentials({ host: 'mac', port: '99999', token })).toBeNull()
  })
})

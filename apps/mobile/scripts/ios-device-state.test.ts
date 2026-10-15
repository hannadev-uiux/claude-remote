import { describe, expect, test } from 'vitest'
import { parseDevices, pickDevice } from './ios-device-state'

const raw = (
  name: string,
  udid: string,
  extra: { tunnel?: string; pairing?: string; devMode?: string; reality?: string } = {},
) => ({
  deviceProperties: { name, developerModeStatus: extra.devMode ?? 'enabled' },
  hardwareProperties: { udid, reality: extra.reality ?? 'physical', platform: 'iOS' },
  connectionProperties: {
    pairingState: extra.pairing ?? 'paired',
    tunnelState: extra.tunnel ?? 'disconnected',
  },
})

describe('parseDevices', () => {
  test('keeps physical iOS devices and classifies them', () => {
    const devices = parseDevices({
      result: {
        devices: [
          raw('iPhone de Marco', 'A', { tunnel: 'unavailable' }),
          raw('Simulator', 'B', { reality: 'simulated', tunnel: 'connected' }),
          raw('Work iPhone', 'C', { tunnel: 'connected' }),
          raw('New iPhone', 'D', { pairing: 'unpaired' }),
          raw('Old iPhone', 'E', { devMode: 'disabled' }),
        ],
      },
    })
    expect(devices).toEqual([
      { name: 'iPhone de Marco', udid: 'A', state: 'offline' },
      { name: 'Work iPhone', udid: 'C', state: 'ready' },
      { name: 'New iPhone', udid: 'D', state: 'unpaired' },
      { name: 'Old iPhone', udid: 'E', state: 'developer-mode-off' },
    ])
    expect(parseDevices({})).toEqual([])
  })

  test('keeps a just-paired device whose `reality` is not reported yet', () => {
    const fresh = raw('iPad de Hanna', 'F')
    delete (fresh.hardwareProperties as { reality?: string }).reality
    expect(parseDevices({ result: { devices: [fresh] } })).toEqual([{ name: 'iPad de Hanna', udid: 'F', state: 'ready' }])
  })
})

describe('pickDevice', () => {
  const devices = [
    { name: 'iPhone de Marco', udid: 'A', state: 'offline' as const },
    { name: 'Work iPhone', udid: 'C', state: 'ready' as const },
  ]

  test('by name or UDID, explaining why it cannot be used', () => {
    expect(pickDevice(devices, 'iPhone de Marco')).toMatchObject({ ok: false, reason: 'offline' })
    expect(pickDevice(devices, 'C')).toMatchObject({ ok: true, device: { name: 'Work iPhone' } })
    expect(pickDevice(devices, 'nope')).toEqual({ ok: false, reason: 'not-found' })
  })

  test('first ready one, or none', () => {
    expect(pickDevice(devices)).toMatchObject({ ok: true, device: { udid: 'C' } })
    expect(pickDevice([devices[0]!])).toEqual({ ok: false, reason: 'none-ready' })
  })
})

/**
 * Physical iOS devices as seen by Xcode (`xcrun devicectl list devices --json-output`), and why
 * one cannot be built to. Pure; used by ios-devices.mts (the CLI) and tested with Vitest.
 */

export type DeviceState = 'ready' | 'offline' | 'unpaired' | 'developer-mode-off'

export type IosDevice = { name: string; udid: string; state: DeviceState }

type RawDevice = {
  deviceProperties?: { name?: string; developerModeStatus?: string }
  hardwareProperties?: { udid?: string; reality?: string; platform?: string }
  connectionProperties?: { pairingState?: string; tunnelState?: string }
}

function stateOf(device: RawDevice): DeviceState {
  if (device.connectionProperties?.pairingState !== 'paired') return 'unpaired'
  if (device.deviceProperties?.developerModeStatus === 'disabled') return 'developer-mode-off'
  // `unavailable` means Xcode cannot reach it (no cable, locked, other network); `disconnected` and
  // `connected` can be built to.
  return device.connectionProperties?.tunnelState === 'unavailable' ? 'offline' : 'ready'
}

export function parseDevices(json: unknown): IosDevice[] {
  const devices = (json as { result?: { devices?: RawDevice[] } })?.result?.devices ?? []
  return devices
    // `reality` is missing for a device that was just paired, so only simulators are left out.
    .filter((d) => d.hardwareProperties?.reality !== 'simulated' && d.hardwareProperties?.platform === 'iOS')
    .map((d) => ({
      name: d.deviceProperties?.name ?? '?',
      udid: d.hardwareProperties?.udid ?? '?',
      state: stateOf(d),
    }))
}

/** The device to build to: the one named (name or UDID) or the first ready one. */
export function pickDevice(
  devices: readonly IosDevice[],
  wanted?: string,
):
  | { ok: true; device: IosDevice }
  | { ok: false; reason: 'not-found' | 'none-ready' | DeviceState; device?: IosDevice } {
  if (wanted) {
    const device = devices.find((d) => d.name === wanted || d.udid === wanted)
    if (!device) return { ok: false, reason: 'not-found' }
    return device.state === 'ready' ? { ok: true, device } : { ok: false, reason: device.state, device }
  }
  const ready = devices.find((d) => d.state === 'ready')
  return ready ? { ok: true, device: ready } : { ok: false, reason: 'none-ready' }
}

export const HINTS: Record<Exclude<DeviceState, 'ready'> | 'not-found' | 'none-ready', string> = {
  offline:
    'Xcode cannot reach it: connect the cable (or join the same Wi-Fi as the Mac), unlock the phone and keep it awake. Check Xcode → Window → Devices and Simulators.',
  unpaired: 'Not paired with this Mac: connect it with the cable, unlock it and tap Trust.',
  'developer-mode-off':
    'Developer Mode is off: on the phone, Settings → Privacy & Security → Developer Mode, then restart it.',
  'not-found': 'No such device. Run `make ios-devices` to see the names and UDIDs Xcode knows.',
  'none-ready':
    'No iPhone is ready to build to. Connect it with the cable (or the same Wi-Fi), unlock it, trust this Mac and enable Developer Mode.',
}

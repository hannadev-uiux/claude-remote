import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'

const KEY = 'remote-harness.push-enabled'

/** Per device: whether this phone registers for pushes (on by default). Muting stays on the daemon. */
export const usePushSettings = create<{ enabled: boolean }>(() => ({ enabled: true }))

/** Loads the saved choice; called once at app start. */
export async function restorePushSettings(): Promise<void> {
  const saved = await SecureStore.getItemAsync(KEY).catch(() => null)
  if (saved === 'off') usePushSettings.setState({ enabled: false })
}

export async function setPushEnabled(enabled: boolean): Promise<void> {
  usePushSettings.setState({ enabled })
  await SecureStore.setItemAsync(KEY, enabled ? 'on' : 'off').catch(() => undefined)
}

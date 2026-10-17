import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'

const LIVE_STATUS_KEY = 'remote-harness.live-status'

type LiveStatusSettings = { enabled: boolean }

/** Whether running sessions get a live status on the lock screen (per device, on by default). */
export const useLiveStatusSettings = create<LiveStatusSettings>(() => ({ enabled: true }))

/** Loads the persisted choice; called once at app start. */
export async function restoreLiveStatusSetting(): Promise<void> {
  const saved = await SecureStore.getItemAsync(LIVE_STATUS_KEY).catch(() => null)
  useLiveStatusSettings.setState({ enabled: saved !== 'off' })
}

export async function setLiveStatusEnabled(enabled: boolean): Promise<void> {
  useLiveStatusSettings.setState({ enabled })
  await SecureStore.setItemAsync(LIVE_STATUS_KEY, enabled ? 'on' : 'off').catch(() => undefined)
}

import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'

const KEY = 'remote-harness.performance'

/** Per device: whether performance data goes to Firebase (off by default). `loaded` once restored. */
export const usePerformanceSettings = create<{ enabled: boolean; loaded: boolean }>(() => ({
  enabled: false,
  loaded: false,
}))

/** Loads the saved choice; called once at app start. */
export async function restorePerformanceSetting(): Promise<void> {
  const saved = await SecureStore.getItemAsync(KEY).catch(() => null)
  usePerformanceSettings.setState({ enabled: saved === 'on', loaded: true })
}

export async function setPerformanceEnabled(enabled: boolean): Promise<void> {
  usePerformanceSettings.setState({ enabled })
  await SecureStore.setItemAsync(KEY, enabled ? 'on' : 'off').catch(() => undefined)
}

import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'

const KEY = 'remote-harness.open-after-create'

/** Per device: whether `Start session` navigates into the new session (on by default). */
export const useOpenAfterCreateSettings = create<{ enabled: boolean }>(() => ({ enabled: true }))

/** Loads the saved choice; called once at app start. */
export async function restoreOpenAfterCreateSettings(): Promise<void> {
  const saved = await SecureStore.getItemAsync(KEY).catch(() => null)
  if (saved === 'off') useOpenAfterCreateSettings.setState({ enabled: false })
}

export async function setOpenAfterCreate(enabled: boolean): Promise<void> {
  useOpenAfterCreateSettings.setState({ enabled })
  await SecureStore.setItemAsync(KEY, enabled ? 'on' : 'off').catch(() => undefined)
}

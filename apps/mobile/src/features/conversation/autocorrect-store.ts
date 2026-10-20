import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'

const KEY = 'remote-harness.autocorrect'

/** Per device: whether the message input autocorrects (on by default). */
export const useAutocorrectSettings = create<{ enabled: boolean }>(() => ({ enabled: true }))

/** Loads the saved choice; called once at app start. */
export async function restoreAutocorrectSetting(): Promise<void> {
  const saved = await SecureStore.getItemAsync(KEY).catch(() => null)
  if (saved === 'off') useAutocorrectSettings.setState({ enabled: false })
}

export async function setAutocorrect(enabled: boolean): Promise<void> {
  useAutocorrectSettings.setState({ enabled })
  await SecureStore.setItemAsync(KEY, enabled ? 'on' : 'off').catch(() => undefined)
}

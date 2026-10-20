import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'

const KEY = 'remote-harness.return-sends'

/** Per device: whether the on-screen keyboard's return key sends the message (off by default). */
export const useReturnKeySettings = create<{ sends: boolean }>(() => ({ sends: false }))

/** Loads the saved choice; called once at app start. */
export async function restoreReturnKeySettings(): Promise<void> {
  const saved = await SecureStore.getItemAsync(KEY).catch(() => null)
  if (saved === 'on') useReturnKeySettings.setState({ sends: true })
}

export async function setReturnSends(sends: boolean): Promise<void> {
  useReturnKeySettings.setState({ sends })
  await SecureStore.setItemAsync(KEY, sends ? 'on' : 'off').catch(() => undefined)
}

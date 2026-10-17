import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'

const KEY_BAR_KEY = 'remote-harness.key-bar'

type KeyBarState = { visible: boolean }

/** Whether the special-keys bar is shown under the conversation (per device, hidden by default). */
export const useKeyBarStore = create<KeyBarState>(() => ({ visible: false }))

/** Loads the persisted choice; called once at app start. */
export async function restoreKeyBar(): Promise<void> {
  const saved = await SecureStore.getItemAsync(KEY_BAR_KEY).catch(() => null)
  useKeyBarStore.setState({ visible: saved === 'shown' })
}

export async function setKeyBarVisible(visible: boolean): Promise<void> {
  useKeyBarStore.setState({ visible })
  await SecureStore.setItemAsync(KEY_BAR_KEY, visible ? 'shown' : 'hidden').catch(() => undefined)
}

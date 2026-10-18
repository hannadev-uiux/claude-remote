import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'

const EXPANDED_KEY = 'remote-harness.keyboard-toolbar'

type KeyboardToolbarStore = {
  /** The special keys are expanded in the keyboard toolbar (per device, collapsed by default). */
  expanded: boolean
  /**
   * Composer whose toolbar shows the keys, so the key bar under the conversation hides. An owner
   * (not a boolean) so a composer unmounting below another one does not clear the other's flag.
   */
  keyBarHiddenBy: symbol | null
}

export const useKeyboardToolbarStore = create<KeyboardToolbarStore>(() => ({
  expanded: false,
  keyBarHiddenBy: null,
}))

/** Loads the persisted choice; called once at app start. */
export async function restoreKeyboardToolbar(): Promise<void> {
  const saved = await SecureStore.getItemAsync(EXPANDED_KEY).catch(() => null)
  useKeyboardToolbarStore.setState({ expanded: saved === 'expanded' })
}

export async function setKeyboardToolbarExpanded(expanded: boolean): Promise<void> {
  useKeyboardToolbarStore.setState({ expanded })
  await SecureStore.setItemAsync(EXPANDED_KEY, expanded ? 'expanded' : 'collapsed').catch(() => undefined)
}

export function hideKeyBar(owner: symbol): void {
  useKeyboardToolbarStore.setState({ keyBarHiddenBy: owner })
}

/** Gives the key bar back, unless another composer took it over meanwhile. */
export function releaseKeyBar(owner: symbol): void {
  if (useKeyboardToolbarStore.getState().keyBarHiddenBy === owner) {
    useKeyboardToolbarStore.setState({ keyBarHiddenBy: null })
  }
}

import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'

const FOLLOW_KEY = 'remote-harness.follow-output'

/** Whether conversations follow new output to the end (per device, on by default). */
export const useFollowStore = create<{ follow: boolean }>(() => ({ follow: true }))

/** Loads the persisted choice; called once at app start. */
export async function restoreFollow(): Promise<void> {
  const saved = await SecureStore.getItemAsync(FOLLOW_KEY).catch(() => null)
  useFollowStore.setState({ follow: saved !== 'off' })
}

export async function setFollow(follow: boolean): Promise<void> {
  useFollowStore.setState({ follow })
  await SecureStore.setItemAsync(FOLLOW_KEY, follow ? 'on' : 'off').catch(() => undefined)
}

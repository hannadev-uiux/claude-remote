import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'
import type { SessionSort } from './filter'

const SORT_KEY = 'remote-harness.session-sort'

/** How the list is ordered: by last activity (default) or by state; per device. */
export const useSessionSortStore = create<{ sort: SessionSort }>(() => ({ sort: 'recent' }))

/** Loads the persisted choice; called once at app start. */
export async function restoreSessionSort(): Promise<void> {
  const saved = await SecureStore.getItemAsync(SORT_KEY).catch(() => null)
  if (saved === 'recent' || saved === 'state') useSessionSortStore.setState({ sort: saved })
}

export async function setSessionSort(sort: SessionSort): Promise<void> {
  useSessionSortStore.setState({ sort })
  await SecureStore.setItemAsync(SORT_KEY, sort).catch(() => undefined)
}

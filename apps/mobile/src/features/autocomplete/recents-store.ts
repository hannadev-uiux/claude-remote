import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'
import { type CommandRecents, parseRecents, recordUse } from './recents'

const RECENTS_KEY = 'remote-harness.command-recents'

/** Commands sent from this device, per profile id; only used to rank the `/` suggestions. */
export const useCommandRecentsStore = create<{ recents: CommandRecents }>(() => ({ recents: {} }))

function save(): Promise<void> {
  const { recents } = useCommandRecentsStore.getState()
  return SecureStore.setItemAsync(RECENTS_KEY, JSON.stringify(recents)).catch(() => undefined)
}

/** Loads the persisted recents; called once at app start. */
export async function restoreCommandRecents(): Promise<void> {
  const saved = parseRecents(await SecureStore.getItemAsync(RECENTS_KEY).catch(() => null))
  // Uses recorded while restoring win over the stored ones.
  useCommandRecentsStore.setState((s) => ({ recents: { ...saved, ...s.recents } }))
}

export function recordCommandUse(profileId: string, name: string): Promise<void> {
  useCommandRecentsStore.setState((s) => ({
    recents: { ...s.recents, [profileId]: recordUse(s.recents[profileId] ?? [], name, Date.now()) },
  }))
  return save()
}

/** Forget the machine: profiles belong to it. */
export async function clearCommandRecents(): Promise<void> {
  useCommandRecentsStore.setState({ recents: {} })
  await SecureStore.deleteItemAsync(RECENTS_KEY).catch(() => undefined)
}

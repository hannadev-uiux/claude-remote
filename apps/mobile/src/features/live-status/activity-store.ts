import * as SecureStore from 'expo-secure-store'
import { type ActivityMap, parseActivityMap } from './logic'

const KEY = 'remote-harness.live-activities'

/** Which Live Activity belongs to which session, as saved by the last run (empty when unreadable). */
export async function loadActivityMap(): Promise<ActivityMap> {
  return parseActivityMap(await SecureStore.getItemAsync(KEY).catch(() => null))
}

let pending: Promise<void> = Promise.resolve()

/** Saves the record; writes run in order, the last one wins. A failed write is ignored: the next reconcile then ends that activity instead of showing it twice. */
export function saveActivityMap(map: ActivityMap): Promise<void> {
  const value = JSON.stringify(map)
  pending = pending.then(() => SecureStore.setItemAsync(KEY, value)).catch(() => undefined)
  return pending
}

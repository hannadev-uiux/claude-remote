import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'
import type { SessionPrefs } from './filter'

const PREFS_KEY = 'remote-harness.session-prefs'

/** Per-device list preferences: pinned sessions sort first, hidden ones leave the list until live again. */
export const useSessionPrefsStore = create<SessionPrefs>(() => ({ pinned: [], hidden: [] }))

function parse(raw: string | null): SessionPrefs | null {
  if (!raw) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object') return null
    const strings = (list: unknown) =>
      Array.isArray(list) ? list.filter((item): item is string => typeof item === 'string') : []
    const record = value as Record<string, unknown>
    return { pinned: strings(record.pinned), hidden: strings(record.hidden) }
  } catch {
    return null
  }
}

/** Loads the persisted preferences; called once at app start. */
export async function restoreSessionPrefs(): Promise<void> {
  const saved = parse(await SecureStore.getItemAsync(PREFS_KEY).catch(() => null))
  if (saved) useSessionPrefsStore.setState(saved)
}

async function save(patch: Partial<SessionPrefs>): Promise<void> {
  useSessionPrefsStore.setState(patch)
  const { pinned, hidden } = useSessionPrefsStore.getState()
  await SecureStore.setItemAsync(PREFS_KEY, JSON.stringify({ pinned, hidden })).catch(() => undefined)
}

export function setPinned(sessionId: string, pinned: boolean): Promise<void> {
  const current = useSessionPrefsStore.getState().pinned.filter((id) => id !== sessionId)
  return save({ pinned: pinned ? [...current, sessionId] : current })
}

export function setHidden(sessionId: string, hidden: boolean): Promise<void> {
  const current = useSessionPrefsStore.getState().hidden.filter((id) => id !== sessionId)
  return save({ hidden: hidden ? [...current, sessionId] : current })
}

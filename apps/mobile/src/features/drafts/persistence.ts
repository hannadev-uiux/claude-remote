import { File } from 'expo-file-system'
import * as SecureStore from 'expo-secure-store'
import { AppState } from 'react-native'
import type { PreparedImage } from '../attachments/limits'
import { useSessionsStore } from '../sessions/store'
import {
  DRAFT_INDEX_KEY,
  type Drafts,
  draftStorageKey,
  type PersistedImage,
  parseDraftIndex,
  parsePersistedDraft,
  serializeDraft,
} from './logic'
import { pruneDraftsNow, useDraftsStore } from './store'

// Encrypted by the Keychain / Keystore and never restored on another device.
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
}
const SAVE_DEBOUNCE_MS = 500

/** What each session's item holds on disk, to skip identical writes and to know the index. */
const written = new Map<string, string>()
const dirty = new Set<string>()
let indexDirty = false
let restored = false
let timer: ReturnType<typeof setTimeout> | undefined
let chain: Promise<void> = Promise.resolve()
let keySeq = 0

const ignore = () => undefined

async function writeDirty(): Promise<void> {
  // Edits made before the restore wait for it, so the index keeps the restored ids.
  if (!restored) return
  const { drafts } = useDraftsStore.getState()
  const ids = [...dirty]
  dirty.clear()
  for (const id of ids) {
    const raw = serializeDraft(drafts[id])
    if (raw === (written.get(id) ?? null)) continue
    if (raw === null) {
      await SecureStore.deleteItemAsync(draftStorageKey(id)).catch(ignore)
      written.delete(id)
      indexDirty = true
    } else {
      await SecureStore.setItemAsync(draftStorageKey(id), raw, OPTIONS).catch(ignore)
      if (!written.has(id)) indexDirty = true
      written.set(id, raw)
    }
  }
  if (!indexDirty) return
  indexDirty = false
  await SecureStore.setItemAsync(DRAFT_INDEX_KEY, JSON.stringify([...written.keys()]), OPTIONS).catch(ignore)
}

/** Writes pending changes now (one write at a time). */
function flush(): Promise<void> {
  clearTimeout(timer)
  timer = undefined
  chain = chain.then(writeDirty, writeDirty)
  return chain
}

function schedule(): void {
  if (timer === undefined) timer = setTimeout(() => void flush(), SAVE_DEBOUNCE_MS)
}

/** Rebuilds a photo from its local copy; null when the file is gone or unreadable. */
async function readImage(image: PersistedImage): Promise<PreparedImage | null> {
  try {
    const file = new File(image.uri)
    if (!file.exists) return null
    const base64 = await file.base64()
    return { ...image, key: `draft-img-${++keySeq}`, base64, mimeType: 'image/jpeg' }
  } catch {
    return null
  }
}

async function restore(): Promise<void> {
  const ids = parseDraftIndex(await SecureStore.getItemAsync(DRAFT_INDEX_KEY).catch(() => null))
  const drafts: Drafts = {}
  for (const id of ids) {
    const raw = await SecureStore.getItemAsync(draftStorageKey(id)).catch(() => null)
    const persisted = parsePersistedDraft(raw)
    if (!raw || !persisted) {
      // Unreadable: forget it and rewrite the index.
      await SecureStore.deleteItemAsync(draftStorageKey(id)).catch(ignore)
      indexDirty = true
      continue
    }
    written.set(id, raw)
    const images: PreparedImage[] = []
    for (const ref of persisted.images) {
      const image = await readImage(ref)
      if (image) images.push(image)
    }
    drafts[id] = {
      text: persisted.text,
      images,
      updatedAt: persisted.updatedAt,
      imagesLost: persisted.images.length - images.length,
    }
  }
  // Edits made while restoring win; the store change marks the restored drafts for a rewrite when they lost photos.
  useDraftsStore.setState((s) => ({ drafts: { ...drafts, ...s.drafts } }))
}

function prune(): void {
  const sessions = useSessionsStore.getState()
  pruneDraftsNow(sessions.loaded ? new Set(Object.keys(sessions.sessions)) : null)
}

/**
 * Restores the drafts saved on the device and keeps them saved: debounced writes, a flush when the app
 * leaves the foreground, and pruning when the session list changes. Called once from the root layout.
 */
export function bindDrafts(): () => void {
  const offDrafts = useDraftsStore.subscribe((state, previous) => {
    for (const id of new Set([...Object.keys(state.drafts), ...Object.keys(previous.drafts)])) {
      if (state.drafts[id] !== previous.drafts[id]) dirty.add(id)
    }
    if (dirty.size > 0) schedule()
  })
  const offSessions = useSessionsStore.subscribe((state, previous) => {
    if (state.loaded && (state.sessions !== previous.sessions || !previous.loaded)) prune()
  })
  const appState = AppState.addEventListener('change', (next) => {
    if (next !== 'active') void flush()
  })
  void restore()
    .catch(ignore)
    .finally(() => {
      restored = true
      prune()
      void flush()
    })
  return () => {
    offDrafts()
    offSessions()
    appState.remove()
    void flush()
  }
}

/** Forget the machine: every draft leaves the store and the device. */
export async function clearAllDrafts(): Promise<void> {
  useDraftsStore.setState({ drafts: {} })
  clearTimeout(timer)
  timer = undefined
  dirty.clear()
  chain = chain.then(async () => {
    for (const id of written.keys()) await SecureStore.deleteItemAsync(draftStorageKey(id)).catch(ignore)
    written.clear()
    indexDirty = false
    await SecureStore.deleteItemAsync(DRAFT_INDEX_KEY).catch(ignore)
  })
  await chain
}

import type { PreparedImage } from '../attachments/limits'

/** A session's unsent prompt: what the composer shows when the session is opened again. */
export type Draft = {
  text: string
  images: PreparedImage[]
  /** Last edit, in ms. */
  updatedAt: number
  /** Photos that could not be restored from their files after a relaunch (shown once). */
  imagesLost: number
}

/** On disk: photos are references to their local copies, never their bytes. */
export type PersistedImage = { uri: string; width: number; height: number }
export type PersistedDraft = { text: string; images: PersistedImage[]; updatedAt: number }

export type Drafts = Record<string, Draft>

export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000
/** A daemon restart briefly lists fewer sessions: only drafts idle for longer go with a missing session. */
export const ABSENT_GRACE_MS = 60 * 60 * 1000
/** Same as the daemon's prompt limit; a longer draft keeps its start on disk. */
export const MAX_DRAFT_CHARS = 100_000
export const PREVIEW_CHARS = 60

export const DRAFT_INDEX_KEY = 'remote-harness.drafts'

/** SecureStore keys only take `[A-Za-z0-9._-]`. */
export function draftStorageKey(sessionId: string): string {
  return `remote-harness.draft.${sessionId.replace(/[^A-Za-z0-9._-]/g, '_')}`
}

type Update<T> = T | ((current: T) => T)

function resolve<T>(update: Update<T>, current: T): T {
  return typeof update === 'function' ? (update as (current: T) => T)(current) : update
}

/** Applies an edit; an empty field with no photos discards the draft. Returns `drafts` itself when nothing changed. */
export function updateDraft(
  drafts: Drafts,
  sessionId: string,
  patch: { text?: Update<string>; images?: Update<PreparedImage[]> },
  now: number,
): Drafts {
  const current = drafts[sessionId]
  const text = patch.text === undefined ? (current?.text ?? '') : resolve(patch.text, current?.text ?? '')
  const images =
    patch.images === undefined ? (current?.images ?? []) : resolve(patch.images, current?.images ?? [])
  if (current && text === current.text && images === current.images) return drafts
  if (text === '' && images.length === 0) {
    if (!current) return drafts
    const { [sessionId]: _discarded, ...rest } = drafts
    return rest
  }
  return { ...drafts, [sessionId]: { text, images, updatedAt: now, imagesLost: current?.imagesLost ?? 0 } }
}

/** Something worth keeping: blank text alone is not a draft. */
export function hasContent(draft: Pick<Draft, 'text' | 'images'> | undefined): boolean {
  return draft !== undefined && (draft.text.trim().length > 0 || draft.images.length > 0)
}

/** What the session list shows: the start of the text, else the photo count. */
export function draftSummary(
  draft: Pick<Draft, 'text' | 'images'> | undefined,
): { text: string } | { photos: number } | null {
  if (!draft || !hasContent(draft)) return null
  const text = draft.text.replace(/\s+/g, ' ').trim()
  if (!text) return { photos: draft.images.length }
  return { text: text.length > PREVIEW_CHARS ? `${text.slice(0, PREVIEW_CHARS).trimEnd()}…` : text }
}

/**
 * Drops drafts older than the TTL and, once the session list is known (`liveIds`), drafts of sessions
 * that are gone and were not edited within the grace period. Returns `drafts` itself when nothing goes.
 */
export function pruneDrafts(drafts: Drafts, now: number, liveIds: ReadonlySet<string> | null): Drafts {
  let changed = false
  const kept: Drafts = {}
  for (const [id, draft] of Object.entries(drafts)) {
    const age = now - draft.updatedAt
    const gone = liveIds !== null && !liveIds.has(id) && age > ABSENT_GRACE_MS
    if (age > DRAFT_TTL_MS || gone) changed = true
    else kept[id] = draft
  }
  return changed ? kept : drafts
}

/** JSON for the device's secure store, or null when there is nothing to keep (delete the item). */
export function serializeDraft(draft: Draft | undefined): string | null {
  if (!draft || !hasContent(draft)) return null
  const persisted: PersistedDraft = {
    text: draft.text.slice(0, MAX_DRAFT_CHARS),
    images: draft.images.map(({ uri, width, height }) => ({ uri, width, height })),
    updatedAt: draft.updatedAt,
  }
  return JSON.stringify(persisted)
}

function isPersistedImage(value: unknown): value is PersistedImage {
  if (!value || typeof value !== 'object') return false
  const image = value as Record<string, unknown>
  return typeof image.uri === 'string' && typeof image.width === 'number' && typeof image.height === 'number'
}

export function parsePersistedDraft(raw: string | null): PersistedDraft | null {
  if (!raw) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object') return null
    const record = value as Record<string, unknown>
    if (typeof record.text !== 'string' || typeof record.updatedAt !== 'number') return null
    const images = Array.isArray(record.images) ? record.images.filter(isPersistedImage) : []
    return { text: record.text, images, updatedAt: record.updatedAt }
  } catch {
    return null
  }
}

export function parseDraftIndex(raw: string | null): string[] {
  if (!raw) return []
  try {
    const value: unknown = JSON.parse(raw)
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

import { create } from 'zustand'
import type { PreparedImage } from '../attachments/limits'
import { type Draft, type Drafts, pruneDrafts, updateDraft } from './logic'

type DraftsState = { drafts: Drafts }

/** Each session's unsent prompt; the composer reads and writes it, `persistence.ts` keeps it on the device. */
export const useDraftsStore = create<DraftsState>(() => ({ drafts: {} }))

export function selectDraft(sessionId: string) {
  return (s: DraftsState): Draft | undefined => s.drafts[sessionId]
}

function apply(update: (drafts: Drafts) => Drafts): void {
  useDraftsStore.setState((s) => {
    const drafts = update(s.drafts)
    return drafts === s.drafts ? s : { drafts }
  })
}

export function setDraftText(sessionId: string, text: string | ((current: string) => string)): void {
  apply((drafts) => updateDraft(drafts, sessionId, { text }, Date.now()))
}

export function setDraftImages(
  sessionId: string,
  images: PreparedImage[] | ((current: PreparedImage[]) => PreparedImage[]),
): void {
  apply((drafts) => updateDraft(drafts, sessionId, { images }, Date.now()))
}

/** The lost-photos notice was shown. */
export function clearImagesLost(sessionId: string): void {
  apply((drafts) => {
    const draft = drafts[sessionId]
    return draft && draft.imagesLost > 0 ? { ...drafts, [sessionId]: { ...draft, imagesLost: 0 } } : drafts
  })
}

export function pruneDraftsNow(liveIds: ReadonlySet<string> | null): void {
  apply((drafts) => pruneDrafts(drafts, Date.now(), liveIds))
}

import { create } from 'zustand'
import { DEFAULT_REPORT_PREFERENCE, type ReportPreference } from './consent'
import type { ErrorEntry } from './scrub'

type ErrorReportsState = {
  preference: ReportPreference
  /** The on-device log, oldest first. */
  entries: ErrorEntry[]
  /** Time of the last crash that was sent or dismissed. */
  handledAt: string | null
  /** The previous run crashed and the user is asked whether to send it ("Ask each time"). */
  prompt: { native: boolean } | null
}

export const useErrorReportsStore = create<ErrorReportsState>(() => ({
  preference: DEFAULT_REPORT_PREFERENCE,
  entries: [],
  handledAt: null,
  prompt: null,
}))

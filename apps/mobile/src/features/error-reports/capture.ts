import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { useConnectionStore } from '@/core/connection'
import type { DaemonClient } from '@/core/connection/daemon-client'
import { runningUpdate } from '@/core/updates'
import { launchAction, type ReportPreference, sendsAsTheyHappen } from './consent'
import {
  applyPreference,
  crashlyticsReady,
  didCrashLastRun,
  discardUnsent,
  initCrashlytics,
  sendReport,
} from './crashlytics'
import { buildReport, errorFromEntry, type Report } from './format'
import { appendEntry, isDuplicate, pendingCrashes, recentEntries } from './log'
import { buildEntry, type ErrorEntry, type ErrorSource, type ReportContext } from './scrub'
import { loadHandledAt, loadPreference, readLog, saveHandledAt, savePreference, writeLog } from './storage'
import { useErrorReportsStore } from './store'

/** Non-fatal entries are written to disk in batches; a crash is written at once. */
const PERSIST_DELAY_MS = 1000

let route: readonly string[] = []
let persistTimer: ReturnType<typeof setTimeout> | undefined
let installed = false

/** Current Expo Router segments (patterns such as `[id]`, never the values). */
export function setRoute(segments: readonly string[]): void {
  route = segments
}

export function currentContext(): ReportContext {
  const running = runningUpdate()
  return {
    appVersion: Constants.expoConfig?.version ?? null,
    runtimeVersion: running.runtimeVersion ?? null,
    updateId: running.updateId ?? null,
    channel: running.channel ?? null,
    platform: Platform.OS,
    osVersion: String(Platform.Version),
    daemonVersion: useConnectionStore.getState().hello?.daemonVersion ?? null,
  }
}

function schedulePersist(): void {
  clearTimeout(persistTimer)
  persistTimer = setTimeout(() => writeLog(useErrorReportsStore.getState().entries), PERSIST_DELAY_MS)
}

/** Records an error in the on-device log; returns the scrubbed entry (also for duplicates). */
export function recordError(
  source: ErrorSource,
  error: unknown,
  extra: { requestType?: string; code?: string } = {},
): ErrorEntry {
  const entry = buildEntry({ at: new Date(), source, error, ...extra, route, context: currentContext() })
  const { entries, preference } = useErrorReportsStore.getState()
  if (isDuplicate(entries, entry)) return entry
  const next = appendEntry(entries, entry)
  useErrorReportsStore.setState({ entries: next })
  if (source === 'fatal') {
    clearTimeout(persistTimer)
    writeLog(next)
  } else {
    schedulePersist()
    if (sendsAsTheyHappen(preference, crashlyticsReady())) {
      void sendReport(
        buildReport({ kind: 'crash', at: new Date(), context: currentContext(), entries: [entry] }),
      )
    }
  }
  return entry
}

type HermesInternal = {
  enablePromiseRejectionTracker?: (options: {
    allRejections: boolean
    onUnhandled: (id: number, rejection: unknown) => void
    onHandled: (id: number) => void
  }) => void
}

/**
 * Installs the global JS error handler and the promise rejection tracker, once, before the app
 * renders. React Native's own handler still runs (it shows LogBox in development and turns a fatal
 * error into a native crash in release); in release it only ever gets the scrubbed error.
 */
export function installErrorCapture(): void {
  if (installed) return
  installed = true
  useErrorReportsStore.setState({ entries: readLog() })
  const reactNativeHandler = ErrorUtils.getGlobalHandler()
  initCrashlytics()
  ErrorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
    const entry = recordError(isFatal ? 'fatal' : 'error', error)
    reactNativeHandler(__DEV__ ? error : errorFromEntry(entry), isFatal)
  })
  const hermes = (globalThis as { HermesInternal?: HermesInternal }).HermesInternal
  hermes?.enablePromiseRejectionTracker?.({
    allRejections: true,
    onUnhandled: (_id, rejection) => {
      recordError('rejection', rejection)
      if (__DEV__) console.warn('Unhandled promise rejection', rejection)
    },
    onHandled: () => undefined,
  })
  void startErrorReports()
}

/** Loads the preference and deals with the previous run's crash according to it. */
async function startErrorReports(): Promise<void> {
  const [preference, handledAt] = await Promise.all([loadPreference(), loadHandledAt()])
  useErrorReportsStore.setState({ preference, handledAt })
  await applyPreference(preference)
  const pending = pendingCrashes(useErrorReportsStore.getState().entries, handledAt)
  const native = await didCrashLastRun()
  const action = launchAction(preference, pending.length > 0 || native)
  if (action === 'send') {
    await sendReport(crashReport())
    await markHandled()
  } else if (action === 'prompt') {
    useErrorReportsStore.setState({ prompt: { native } })
  } else if (action === 'discard') {
    await markHandled()
  }
}

async function markHandled(): Promise<void> {
  const at = new Date().toISOString()
  useErrorReportsStore.setState({ handledAt: at, prompt: null })
  await saveHandledAt(at)
}

/** The report of the previous run's crash: the entries recorded since the last handled crash. */
export function crashReport(): Report {
  const { entries, handledAt } = useErrorReportsStore.getState()
  return buildReport({
    kind: 'crash',
    at: new Date(),
    context: currentContext(),
    entries: recentEntries(entries, { since: handledAt }),
  })
}

/** "Send" on the crash prompt. */
export async function sendCrashReport(): Promise<boolean> {
  const sent = await sendReport(crashReport())
  await markHandled()
  return sent
}

/** "Don't send" on the crash prompt: the native report waiting on the device is dropped too. */
export async function dismissCrashReport(): Promise<void> {
  await discardUnsent()
  await markHandled()
}

export async function setReportPreference(preference: ReportPreference): Promise<void> {
  useErrorReportsStore.setState({ preference })
  await savePreference(preference)
  await applyPreference(preference)
}

/** Records the requests the daemon rejected or never answered (type and code only). */
export function bindErrorReports(client: DaemonClient): () => void {
  return client.onRequestError((type, error) => {
    // The expected answer of older daemons to newer messages, not a bug.
    if (error.code === 'unknown_type') return
    recordError('request', error, { requestType: type, code: error.code })
  })
}

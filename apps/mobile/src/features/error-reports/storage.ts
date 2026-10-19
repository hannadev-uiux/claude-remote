import { File, Paths } from 'expo-file-system'
import * as SecureStore from 'expo-secure-store'
import { DEFAULT_REPORT_PREFERENCE, isReportPreference, type ReportPreference } from './consent'
import { parseLog } from './log'
import type { ErrorEntry } from './scrub'

const LOG_FILE = 'error-log.json'
const PREFERENCE_KEY = 'remote-harness.error-reports'
/** Time of the last crash that was sent or dismissed. */
const HANDLED_KEY = 'remote-harness.error-reports.handled'

const logFile = () => new File(Paths.document, LOG_FILE)

/** The on-device log; empty when missing or unreadable. Synchronous so a crash can be recorded. */
export function readLog(): ErrorEntry[] {
  try {
    const file = logFile()
    return file.exists ? parseLog(file.textSync()) : []
  } catch {
    return []
  }
}

export function writeLog(entries: readonly ErrorEntry[]): void {
  try {
    const file = logFile()
    if (!file.exists) file.create()
    file.write(JSON.stringify(entries))
  } catch {
    // Nothing to do: the log is best effort.
  }
}

/** Writes a report to the cache folder (to share it as a file); null when it fails. */
export function writeReportFile(name: string, text: string): string | null {
  try {
    const file = new File(Paths.cache, name)
    if (file.exists) file.delete()
    file.create()
    file.write(text)
    return file.uri
  } catch {
    return null
  }
}

export async function loadPreference(): Promise<ReportPreference> {
  const saved = await SecureStore.getItemAsync(PREFERENCE_KEY).catch(() => null)
  return isReportPreference(saved) ? saved : DEFAULT_REPORT_PREFERENCE
}

export async function savePreference(preference: ReportPreference): Promise<void> {
  await SecureStore.setItemAsync(PREFERENCE_KEY, preference).catch(() => undefined)
}

export async function loadHandledAt(): Promise<string | null> {
  return SecureStore.getItemAsync(HANDLED_KEY).catch(() => null)
}

export async function saveHandledAt(at: string): Promise<void> {
  await SecureStore.setItemAsync(HANDLED_KEY, at).catch(() => undefined)
}

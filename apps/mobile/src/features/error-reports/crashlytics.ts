import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { firebaseEnabledFor } from '../push/platform'
import { collectionEnabled, type ReportPreference } from './consent'
import { crashlyticsAttributes, errorFromEntry, type Report } from './format'

type CrashlyticsModule = typeof import('@react-native-firebase/crashlytics')
type Crashlytics = ReturnType<CrashlyticsModule['getCrashlytics']>

let module: CrashlyticsModule | null = null
let instance: Crashlytics | null = null
let loaded = false

/** `recordError` parses the stack before reaching the SDK; give each record time to land. */
const RECORD_SETTLE_MS = 300

const settle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Whether this build has Firebase (and so Crashlytics) for this platform. */
export const firebaseInBuild = () => firebaseEnabledFor(Constants.expoConfig?.extra, Platform.OS)

/**
 * Loads Crashlytics. Its module installs RN Firebase's own JS error handlers, so this runs before
 * ours are installed (ours chain to React Native's handler and never hand it raw errors).
 */
export function initCrashlytics(): boolean {
  if (loaded) return instance !== null
  loaded = true
  if (!firebaseInBuild()) return false
  try {
    module = require('@react-native-firebase/crashlytics') as CrashlyticsModule
    instance = module.getCrashlytics()
  } catch {
    module = null
    instance = null
  }
  return instance !== null
}

export const crashlyticsReady = () => instance !== null

/** Native collection on only with "Send automatically"; "Never" also drops waiting reports. */
export async function applyPreference(preference: ReportPreference): Promise<void> {
  if (!module || !instance) return
  try {
    await module.setCrashlyticsCollectionEnabled(instance, collectionEnabled(preference))
    if (preference === 'never') {
      await module.checkForUnsentReports(instance).catch(() => false)
      await module.deleteUnsentReports(instance)
    }
  } catch {
    // Best effort: the preference is saved and applied again on the next launch.
  }
}

/** A native crash (or a JS crash turned native by React Native) in the previous run. */
export async function didCrashLastRun(): Promise<boolean> {
  if (!module || !instance) return false
  return module.didCrashOnPreviousExecution(instance).catch(() => false)
}

/** Drops the native reports waiting for a decision ("Don't send"). */
export async function discardUnsent(): Promise<void> {
  if (!module || !instance || instance.isCrashlyticsCollectionEnabled) return
  await module.checkForUnsentReports(instance).catch(() => false)
  await module.deleteUnsentReports(instance).catch(() => undefined)
}

/**
 * Records the report's entries (scrubbed fields only) and uploads them with any native crash
 * waiting on the device. With collection off ("Ask each time"), RN Firebase only forwards
 * `sendUnsentReports` while collection is on, so it is turned on just for the upload.
 */
export async function sendReport(report: Report): Promise<boolean> {
  if (!module || !instance) return false
  const crashlytics = instance
  const firebase = module
  try {
    for (const entry of report.entries) {
      await firebase.setAttributes(crashlytics, crashlyticsAttributes(entry, report.context))
      firebase.recordError(crashlytics, errorFromEntry(entry), entry.name)
      await settle(RECORD_SETTLE_MS)
    }
    if (report.description) {
      await firebase.setAttribute(crashlytics, 'description', report.description)
      const userReport = new Error(report.description.split('\n')[0]?.slice(0, 120) ?? 'report')
      userReport.name = 'UserReport'
      firebase.recordError(crashlytics, userReport, 'UserReport')
      await settle(RECORD_SETTLE_MS)
      // Later crashes of this run must not carry the description.
      await firebase.setAttribute(crashlytics, 'description', '')
    }
    if (!crashlytics.isCrashlyticsCollectionEnabled) {
      await firebase.checkForUnsentReports(crashlytics).catch(() => false)
      await firebase.setCrashlyticsCollectionEnabled(crashlytics, true)
      firebase.sendUnsentReports(crashlytics)
      await firebase.setCrashlyticsCollectionEnabled(crashlytics, false)
    }
    return true
  } catch {
    return false
  }
}

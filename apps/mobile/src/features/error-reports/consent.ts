/** Error report preference: send automatically, ask after each crash, or never send. */
export type ReportPreference = 'auto' | 'ask' | 'never'

export const REPORT_PREFERENCES: readonly ReportPreference[] = ['auto', 'ask', 'never']
export const DEFAULT_REPORT_PREFERENCE: ReportPreference = 'ask'

export const isReportPreference = (value: unknown): value is ReportPreference =>
  typeof value === 'string' && (REPORT_PREFERENCES as readonly string[]).includes(value)

/** What the launch does with the previous run's crash, if any. */
export type LaunchAction = 'send' | 'prompt' | 'discard' | 'none'

/** `never` also drops native reports waiting on the device when nothing else is pending. */
export function launchAction(preference: ReportPreference, pendingCrash: boolean): LaunchAction {
  if (preference === 'never') return 'discard'
  if (!pendingCrash) return 'none'
  return preference === 'auto' ? 'send' : 'prompt'
}

/** Native Crashlytics collection follows the preference: on only with `auto`. */
export const collectionEnabled = (preference: ReportPreference) => preference === 'auto'

/** Whether errors that do not crash are sent as they happen. */
export const sendsAsTheyHappen = (preference: ReportPreference, firebase: boolean) =>
  firebase && preference === 'auto'

/** Whether a report can go to Crashlytics at all ("Send" buttons). */
export const canSend = (preference: ReportPreference, firebase: boolean) => firebase && preference !== 'never'

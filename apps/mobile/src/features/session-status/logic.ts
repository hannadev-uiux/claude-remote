import type { AccountLimits, SessionStatus, UsageWindow } from '@remote-harness/protocol'
import type { ColorName } from '@/core/theme'

/** Percentages from here are shown in the warning color… */
export const WARNING_PERCENT = 70
/** …and from here in red. */
export const CRITICAL_PERCENT = 90

export type StatusLevel = 'normal' | 'warning' | 'critical'

/** Secondary text, warning yellow, red (the accent is the brand color, not a warning). */
export const LEVEL_COLORS: Record<StatusLevel, ColorName> = {
  normal: 'textMuted',
  warning: 'warning',
  critical: 'danger',
}

export function statusLevel(percent: number): StatusLevel {
  if (percent >= CRITICAL_PERCENT) return 'critical'
  if (percent >= WARNING_PERCENT) return 'warning'
  return 'normal'
}

export function formatPercent(percent: number): string {
  return `${Math.round(percent)}%`
}

/** `950`, `1.2k`, `124k`, `1M`, `1.5M`. */
export function formatTokens(tokens: number): string {
  const one = (value: number) => (Math.round(value * 10) / 10).toString()
  if (tokens < 1000) return String(Math.round(tokens))
  if (tokens < 10_000) return `${one(tokens / 1000)}k`
  if (tokens < 1_000_000) return `${Math.round(tokens / 1000)}k`
  return `${one(tokens / 1_000_000)}M`
}

/** A window whose reset time has passed no longer says anything about the account. */
export function activeWindow(window: UsageWindow | null | undefined, now: number): UsageWindow | null {
  return window && window.resetsAt > now ? window : null
}

export type GaugeKey = 'context' | 'fiveHour' | 'sevenDay'

/** One item of the status bar: the model or effort as text, or a gauge with its level. */
export type StatusItem =
  | { key: 'model' | 'effort'; text: string; percent: null; level: null }
  | { key: GaugeKey; text: ''; percent: number; level: StatusLevel }

/** Items to show, in order; unknown items are left out (never shown as 0%). */
export function statusItems(
  status: SessionStatus | null | undefined,
  limits: Pick<AccountLimits, 'fiveHour' | 'sevenDay'> | null | undefined,
  now: number,
): StatusItem[] {
  const items: StatusItem[] = []
  const gauge = (key: GaugeKey, percent: number) =>
    items.push({ key, text: '', percent, level: statusLevel(percent) })
  if (status?.model) items.push({ key: 'model', text: status.model, percent: null, level: null })
  if (status?.effort) items.push({ key: 'effort', text: status.effort, percent: null, level: null })
  if (status?.context) gauge('context', status.context.percent)
  const fiveHour = activeWindow(limits?.fiveHour, now)
  if (fiveHour) gauge('fiveHour', fiveHour.percent)
  const sevenDay = activeWindow(limits?.sevenDay, now)
  if (sevenDay) gauge('sevenDay', sevenDay.percent)
  return items
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * When a limit resets, in the device's locale: the time when it is within the next 24 hours, the
 * weekday and time within a week, the date and time otherwise.
 */
export function formatReset(resetsAt: number, now: number, locale: string): string {
  const time: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
  const date = new Date(resetsAt)
  const ahead = resetsAt - now
  if (ahead < DAY_MS) return date.toLocaleTimeString(locale, time)
  if (ahead < 7 * DAY_MS) return date.toLocaleString(locale, { weekday: 'short', ...time })
  return date.toLocaleString(locale, { day: 'numeric', month: 'short', ...time })
}

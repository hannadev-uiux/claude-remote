import type { TFunction } from '@/core/i18n/create'

/** `100.101.1.7:7788 · remote-harness 0.11.0 · protocol 9`, with the unknown parts left out. */
export function machineMeta(
  info: {
    host?: string | null
    port?: number | null
    daemonVersion?: string | null
    protocolVersion?: number | null
  },
  t: TFunction,
): string {
  const parts = [
    info.host ? (info.port ? `${info.host}:${info.port}` : info.host) : null,
    info.daemonVersion ? `remote-harness ${info.daemonVersion}` : null,
    info.protocolVersion != null ? `${t('settings.protocol')} ${info.protocolVersion}` : null,
  ].filter(Boolean)
  return parts.join(' · ')
}

/** `1 profile · 2 sessions`, or "nothing muted". */
export function mutedSummary(counts: { profiles: number; sessions: number }, t: TFunction): string {
  const parts = [
    counts.profiles > 0 ? t('settings.mutedProfiles', { count: counts.profiles }) : null,
    counts.sessions > 0 ? t('settings.mutedSessions', { count: counts.sessions }) : null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : t('settings.mutedNone')
}

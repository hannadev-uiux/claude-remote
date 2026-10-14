import type { Profile, Session, SessionState } from '@claude-remote/protocol'

export type SessionSection = { profile: Profile; sessions: Session[] }

const STATE_ORDER: Record<SessionState, number> = { waiting: 0, running: 1, idle: 2, ended: 3 }

export function compareSessions(a: Session, b: Session): number {
  return STATE_ORDER[a.state] - STATE_ORDER[b.state] || b.updatedAt.localeCompare(a.updatedAt)
}

/**
 * Groups sessions by profile (in profile order), waiting first then running/idle/ended, newest
 * first inside each state. Sessions of unknown profiles get a synthetic group at the end.
 */
export function groupSessions(
  sessions: Iterable<Session>,
  profiles: readonly Profile[],
  filter: string | null = null,
): SessionSection[] {
  const byProfile = new Map<string, Session[]>()
  for (const session of sessions) {
    if (filter && session.profileId !== filter) continue
    const list = byProfile.get(session.profileId) ?? []
    list.push(session)
    byProfile.set(session.profileId, list)
  }
  const known = new Set(profiles.map((p) => p.id))
  const sections: SessionSection[] = []
  for (const profile of profiles) {
    const list = byProfile.get(profile.id)
    if (list?.length) sections.push({ profile, sessions: list.sort(compareSessions) })
  }
  for (const [id, list] of byProfile) {
    if (known.has(id)) continue
    sections.push({
      profile: { id, name: id, configDir: '', color: '#8A8784' },
      sessions: list.sort(compareSessions),
    })
  }
  return sections
}

export type SessionListItem =
  | { type: 'header'; profile: Profile; count: number }
  | { type: 'session'; session: Session }

export function flattenSections(sections: readonly SessionSection[]): SessionListItem[] {
  return sections.flatMap((s) => [
    { type: 'header' as const, profile: s.profile, count: s.sessions.length },
    ...s.sessions.map((session) => ({ type: 'session' as const, session })),
  ])
}

import type { Session, SessionState } from '@remote-harness/protocol'

const STATE_ORDER: Record<SessionState, number> = { waiting: 0, running: 1, idle: 2, ended: 3 }

export type StateFilter = 'all' | 'active' | 'ended'

export type SessionFilter = {
  /** Only this profile; null for every profile. */
  profileId: string | null
  state: StateFilter
  /** Free text matched against the title and the folder. */
  query: string
}

export const NO_FILTER: SessionFilter = { profileId: null, state: 'all', query: '' }

export function isFiltering(filter: SessionFilter): boolean {
  return filter.profileId !== null || filter.state !== 'all' || filter.query.trim() !== ''
}

/** Lowercase without accents, so "sessao" finds "Sessão". */
export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

/** Every word of the query must appear in the title or the folder. */
export function matchesFilter(session: Session, filter: SessionFilter): boolean {
  if (filter.profileId && session.profileId !== filter.profileId) return false
  if (filter.state === 'active' && session.state === 'ended') return false
  if (filter.state === 'ended' && session.state !== 'ended') return false
  const words = normalizeSearch(filter.query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const haystack = normalizeSearch(`${session.title} ${session.cwd}`)
  return words.every((word) => haystack.includes(word))
}

/** Waiting first, then running, idle and ended; newest first inside each state. */
export function compareSessions(a: Session, b: Session): number {
  return STATE_ORDER[a.state] - STATE_ORDER[b.state] || b.updatedAt.localeCompare(a.updatedAt)
}

/** Newest activity first, whatever the state; ties by title so the order is stable. */
export function compareByRecency(a: Session, b: Session): number {
  return b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title)
}

/** `recent` (default): last activity first. `state`: waiting, running, idle, ended, then recency. */
export type SessionSort = 'recent' | 'state'

const COMPARATORS: Record<SessionSort, (a: Session, b: Session) => number> = {
  recent: compareByRecency,
  state: compareSessions,
}

/** The sessions that match `filter`, as one flat list in the chosen order (profiles are filters, not groups). */
export function listSessions(
  sessions: Iterable<Session>,
  filter: SessionFilter = NO_FILTER,
  sort: SessionSort = 'recent',
): Session[] {
  return [...sessions].filter((session) => matchesFilter(session, filter)).sort(COMPARATORS[sort])
}

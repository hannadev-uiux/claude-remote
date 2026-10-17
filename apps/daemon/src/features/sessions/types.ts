import type { Session } from '@remote-harness/protocol'

/** Daemon-side session: the wire `Session` plus fields the app never sees. */
export type SessionRecord = Session & { transcriptPath: string | null }

export function toWire(record: SessionRecord): Session {
  const { transcriptPath: _omit, ...session } = record
  return session
}

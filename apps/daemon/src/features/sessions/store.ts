import { isDeepStrictEqual } from 'node:util'
import { z } from 'zod'
import type { Logger } from '../../core/logger.ts'
import { readJsonFile, writeJsonAtomic } from '../../infra/fs.ts'
import type { Broadcaster } from '../../transport/connection.ts'
import { type SessionRecord, toWire } from './types.ts'

const PersistedLinkSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  paneId: z.string(),
  cwd: z.string(),
  title: z.string(),
  transcriptPath: z.string().nullable(),
})
export type PersistedLink = z.infer<typeof PersistedLinkSchema>
const PersistedStateSchema = z.object({ links: z.array(PersistedLinkSchema) })

type Listener = (session: SessionRecord, previous: SessionRecord | undefined) => void

/** In-memory registry of sessions; broadcasts changes and persists pane links. */
export class SessionStore {
  private readonly sessions = new Map<string, SessionRecord>()
  private readonly listeners = new Set<Listener>()
  private saveTimer: NodeJS.Timeout | undefined

  constructor(
    private readonly broadcaster: Broadcaster,
    private readonly statePath: string,
    private readonly logger: Logger,
    private readonly saveDebounceMs = 500,
  ) {}

  get(id: string): SessionRecord | undefined {
    return this.sessions.get(id)
  }

  all(): SessionRecord[] {
    return [...this.sessions.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  findByPane(paneId: string): SessionRecord[] {
    return [...this.sessions.values()].filter((s) => s.paneId === paneId)
  }

  onChange(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Creates or patches a session. Returns the stored record. No-op patches emit nothing. */
  upsert(
    id: string,
    patch: Partial<SessionRecord>,
    defaults?: () => SessionRecord,
  ): SessionRecord | undefined {
    const previous = this.sessions.get(id)
    const base = previous ?? defaults?.()
    if (!base) return undefined
    const { updatedAt: _ignored, ...rest } = patch
    const candidate: SessionRecord = { ...base, ...rest, id }
    if (previous && isDeepStrictEqual({ ...candidate, updatedAt: previous.updatedAt }, previous))
      return previous
    const next: SessionRecord = { ...candidate, updatedAt: patch.updatedAt ?? new Date().toISOString() }
    this.sessions.set(id, next)
    this.broadcaster.broadcast({ type: 'session.updated', session: toWire(next) })
    for (const listener of this.listeners) listener(next, previous)
    this.scheduleSave()
    return next
  }

  remove(id: string): void {
    if (!this.sessions.delete(id)) return
    this.broadcaster.broadcast({ type: 'session.removed', sessionId: id })
    this.scheduleSave()
  }

  async loadLinks(): Promise<PersistedLink[]> {
    try {
      const parsed = PersistedStateSchema.safeParse(await readJsonFile(this.statePath))
      return parsed.success ? parsed.data.links : []
    } catch (error) {
      this.logger.warn({ err: error }, 'could not read state file')
      return []
    }
  }

  private scheduleSave(): void {
    clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => void this.save(), this.saveDebounceMs)
  }

  async save(): Promise<void> {
    clearTimeout(this.saveTimer)
    const links: PersistedLink[] = []
    for (const s of this.sessions.values()) {
      if (s.paneId && s.controllable) {
        links.push({
          id: s.id,
          profileId: s.profileId,
          paneId: s.paneId,
          cwd: s.cwd,
          title: s.title,
          transcriptPath: s.transcriptPath,
        })
      }
    }
    try {
      await writeJsonAtomic(this.statePath, { links })
    } catch (error) {
      this.logger.warn({ err: error }, 'could not persist session links')
    }
  }

  dispose(): void {
    clearTimeout(this.saveTimer)
  }
}

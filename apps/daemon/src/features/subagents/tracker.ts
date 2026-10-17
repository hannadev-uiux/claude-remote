import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import type { SubagentInfo } from '@remote-harness/protocol'
import { type FSWatcher, watch } from 'chokidar'
import type { Logger } from '../../core/logger.ts'
import type { Broadcaster } from '../../transport/connection.ts'
import type { HookEvent } from '../hooks/payloads.ts'
import type { SessionStore } from '../sessions/store.ts'
import type { SessionRecord } from '../sessions/types.ts'

/** Subagents with no transcript activity for this long, in an idle session, are considered done. */
export const INACTIVITY_MS = 2 * 60_000

const AGENT_FILE = /^agent-(.+)\.jsonl$/

/** `<project>/<session>.jsonl` → `<project>/<session>/subagents`. */
export function subagentsDir(transcriptPath: string): string {
  return join(dirname(transcriptPath), basename(transcriptPath, '.jsonl'), 'subagents')
}

type Tracked = { watcher: FSWatcher | null; dir: string; lastActivity: Map<string, number> }

/** Watches each live session's `subagents/` folder and keeps `session.subagents` up to date. */
export class SubagentTracker {
  private readonly tracked = new Map<string, Tracked>()
  private readonly sweeper: NodeJS.Timeout
  private readonly dirPoller: NodeJS.Timeout
  private readonly now: () => number

  constructor(
    private readonly store: SessionStore,
    private readonly broadcaster: Broadcaster,
    private readonly logger: Logger,
    options: { now?: () => number; dirPollMs?: number } = {},
  ) {
    this.now = options.now ?? Date.now
    this.sweeper = setInterval(() => this.sweep(), 30_000)
    this.sweeper.unref()
    // The subagents folder only appears when the first subagent starts; watch it once it exists.
    this.dirPoller = setInterval(() => this.attachPending(), options.dirPollMs ?? 3_000)
    this.dirPoller.unref()
  }

  /** Starts or stops watching depending on whether the session is live. */
  sync(session: SessionRecord): void {
    const live = session.state !== 'ended' && session.transcriptPath
    const current = this.tracked.get(session.id)
    if (live && !current && session.transcriptPath) this.track(session.id, session.transcriptPath)
    if (!live && current) this.untrack(session.id)
  }

  transcriptPath(sessionId: string, agentId: string): string | null {
    const session = this.store.get(sessionId)
    if (!session?.transcriptPath) return null
    if (!session.subagents.some((s) => s.agentId === agentId)) return null
    return join(subagentsDir(session.transcriptPath), `agent-${agentId}.jsonl`)
  }

  private track(sessionId: string, transcriptPath: string): void {
    const tracked: Tracked = { watcher: null, dir: subagentsDir(transcriptPath), lastActivity: new Map() }
    this.tracked.set(sessionId, tracked)
    this.attach(sessionId, tracked)
  }

  private attach(sessionId: string, tracked: Tracked): void {
    if (tracked.watcher || !existsSync(tracked.dir)) return
    const watcher = watch(tracked.dir, { depth: 0, ignoreInitial: false })
    const onFile = (path: string) => {
      const match = AGENT_FILE.exec(basename(path))
      if (match?.[1]) void this.touch(sessionId, match[1], tracked)
    }
    watcher.on('add', onFile)
    watcher.on('change', onFile)
    watcher.on('error', (error) =>
      this.logger.debug({ err: error, dir: tracked.dir }, 'subagent watcher error'),
    )
    tracked.watcher = watcher
  }

  private attachPending(): void {
    for (const [sessionId, tracked] of this.tracked) this.attach(sessionId, tracked)
  }

  private untrack(sessionId: string): void {
    const tracked = this.tracked.get(sessionId)
    if (!tracked) return
    void tracked.watcher?.close()
    this.tracked.delete(sessionId)
  }

  private async readMeta(
    dir: string,
    agentId: string,
  ): Promise<{ agentType: string | null; description: string | null }> {
    try {
      const meta = JSON.parse(await readFile(join(dir, `agent-${agentId}.meta.json`), 'utf8')) as Record<
        string,
        unknown
      >
      return {
        agentType: typeof meta.agentType === 'string' ? meta.agentType : null,
        description: typeof meta.description === 'string' ? meta.description : null,
      }
    } catch {
      return { agentType: null, description: null }
    }
  }

  async touch(sessionId: string, agentId: string, tracked = this.tracked.get(sessionId)): Promise<void> {
    tracked?.lastActivity.set(agentId, this.now())
    const session = this.store.get(sessionId)
    if (!session) return
    const existing = session.subagents.find((s) => s.agentId === agentId)
    if (existing?.state === 'running')
      return this.update(sessionId, { ...existing, updatedAt: new Date(this.now()).toISOString() })
    if (existing?.state === 'done') return
    const meta = tracked ? await this.readMeta(tracked.dir, agentId) : { agentType: null, description: null }
    this.update(sessionId, {
      agentId,
      ...meta,
      state: 'running',
      updatedAt: new Date(this.now()).toISOString(),
    })
  }

  handleHook(hook: HookEvent): void {
    const sessionId = hook.payload.session_id
    if (hook.event === 'SubagentStop' && typeof hook.payload.agent_id === 'string') {
      const session = this.store.get(sessionId)
      const existing = session?.subagents.find((s) => s.agentId === hook.payload.agent_id)
      const agentType =
        typeof hook.payload.agent_type === 'string' ? hook.payload.agent_type : (existing?.agentType ?? null)
      this.update(sessionId, {
        agentId: hook.payload.agent_id,
        agentType,
        description: existing?.description ?? null,
        state: 'done',
        updatedAt: hook.receivedAt,
      })
    }
    if (hook.event === 'Stop') {
      const tasks = hook.payload.background_tasks
      this.store.upsert(sessionId, { backgroundTasks: Array.isArray(tasks) ? tasks.length : 0 })
    }
  }

  private update(sessionId: string, info: SubagentInfo): void {
    const session = this.store.get(sessionId)
    if (!session) return
    const others = session.subagents.filter((s) => s.agentId !== info.agentId)
    this.store.upsert(sessionId, { subagents: [...others, info] })
    this.broadcaster.broadcast({ type: 'subagent.updated', sessionId, subagent: info })
  }

  /** Marks quiet subagents of idle sessions as done (the SubagentStop hook can be missed). */
  sweep(): void {
    for (const [sessionId, tracked] of this.tracked) {
      const session = this.store.get(sessionId)
      if (session?.state !== 'idle') continue
      for (const sub of session.subagents) {
        if (sub.state !== 'running') continue
        const last = tracked.lastActivity.get(sub.agentId) ?? Date.parse(sub.updatedAt)
        if (this.now() - last > INACTIVITY_MS)
          this.update(sessionId, { ...sub, state: 'done', updatedAt: new Date(this.now()).toISOString() })
      }
    }
  }

  async dispose(): Promise<void> {
    clearInterval(this.sweeper)
    clearInterval(this.dirPoller)
    await Promise.all([...this.tracked.values()].map((t) => t.watcher?.close()))
    this.tracked.clear()
  }
}

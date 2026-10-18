import { existsSync } from 'node:fs'
import { open, readdir, readFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import type { SubagentInfo } from '@remote-harness/protocol'
import { type FSWatcher, watch } from 'chokidar'
import type { Logger } from '../../core/logger.ts'
import type { Broadcaster } from '../../transport/connection.ts'
import type { HookEvent } from '../hooks/payloads.ts'
import type { SessionStore } from '../sessions/store.ts'
import type { SessionRecord } from '../sessions/types.ts'
import { parseTranscriptLine } from '../transcript/parser.ts'

/** Subagents with no transcript activity for this long, in an idle session, are considered done. */
export const INACTIVITY_MS = 2 * 60_000

const AGENT_FILE = /^agent-(.+)\.jsonl$/
const NEWLINE = 0x0a

/** `<project>/<session>.jsonl` → `<project>/<session>/subagents`. */
export function subagentsDir(transcriptPath: string): string {
  return join(dirname(transcriptPath), basename(transcriptPath, '.jsonl'), 'subagents')
}

/** Tool uses in complete transcript lines; the parser owns the format, malformed lines count nothing. */
export function countToolUses(lines: readonly string[]): number {
  let count = 0
  for (const line of lines) {
    if (!line.trim()) continue
    try {
      count += parseTranscriptLine(line, 0).filter((entry) => entry.kind === 'tool_use').length
    } catch {
      // not a transcript line
    }
  }
  return count
}

/**
 * Where the incremental count of one transcript stands: bytes consumed, the trailing partial line
 * (kept as bytes so a multibyte character cut by a read survives), tool uses so far, start time, and
 * the chain that serializes reads of this file.
 */
type Cursor = {
  offset: number
  rest: Buffer
  tools: number
  startedAt: string | null
  pending: Promise<void>
}

type Tracked = {
  watcher: FSWatcher | null
  dir: string
  lastActivity: Map<string, number>
  cursors: Map<string, Cursor>
}

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
    const tracked: Tracked = {
      watcher: null,
      dir: subagentsDir(transcriptPath),
      lastActivity: new Map(),
      cursors: new Map(),
    }
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
    // chokidar lists the folder before watching it: files created in between are only caught by a rescan.
    watcher.on('ready', () => void this.rescan(sessionId, tracked))
    watcher.on('error', (error) =>
      this.logger.debug({ err: error, dir: tracked.dir }, 'subagent watcher error'),
    )
    tracked.watcher = watcher
  }

  private async rescan(sessionId: string, tracked: Tracked): Promise<void> {
    const files = await readdir(tracked.dir).catch(() => [] as string[])
    for (const file of files) {
      const agentId = AGENT_FILE.exec(file)?.[1]
      if (agentId && !tracked.lastActivity.has(agentId)) void this.touch(sessionId, agentId, tracked)
    }
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

  /** Consumes what the transcript gained since the last read; reads of one file never overlap. */
  private advance(tracked: Tracked, agentId: string): Promise<Cursor> {
    let cursor = tracked.cursors.get(agentId)
    if (!cursor) {
      cursor = { offset: 0, rest: Buffer.alloc(0), tools: 0, startedAt: null, pending: Promise.resolve() }
      tracked.cursors.set(agentId, cursor)
    }
    const current = cursor
    const run = current.pending.then(() => this.consume(join(tracked.dir, `agent-${agentId}.jsonl`), current))
    current.pending = run.catch(() => undefined)
    return run.then(() => current)
  }

  private async consume(path: string, cursor: Cursor): Promise<void> {
    let handle: Awaited<ReturnType<typeof open>>
    try {
      handle = await open(path, 'r')
    } catch {
      // Not readable yet, or gone with the session folder: keep what was counted.
      return
    }
    try {
      const stat = await handle.stat()
      if (!cursor.startedAt) {
        const born = stat.birthtimeMs || stat.mtimeMs
        cursor.startedAt = new Date(born > 0 ? born : this.now()).toISOString()
      }
      if (stat.size < cursor.offset) {
        // Truncated or rewritten: start over.
        cursor.offset = 0
        cursor.rest = Buffer.alloc(0)
        cursor.tools = 0
      }
      if (stat.size === cursor.offset) return
      const chunk = Buffer.alloc(stat.size - cursor.offset)
      const { bytesRead } = await handle.read(chunk, 0, chunk.length, cursor.offset)
      cursor.offset += bytesRead
      const data = Buffer.concat([cursor.rest, chunk.subarray(0, bytesRead)])
      const lastNewline = data.lastIndexOf(NEWLINE)
      if (lastNewline < 0) {
        cursor.rest = data
        return
      }
      cursor.tools += countToolUses(data.subarray(0, lastNewline).toString('utf8').split('\n'))
      cursor.rest = Buffer.from(data.subarray(lastNewline + 1))
    } finally {
      await handle.close()
    }
  }

  async touch(sessionId: string, agentId: string, tracked = this.tracked.get(sessionId)): Promise<void> {
    tracked?.lastActivity.set(agentId, this.now())
    const session = this.store.get(sessionId)
    if (!session) return
    const existing = session.subagents.find((s) => s.agentId === agentId)
    if (existing?.state === 'done') return
    const cursor = tracked ? await this.advance(tracked, agentId) : null
    const now = new Date(this.now()).toISOString()
    if (existing) {
      return this.update(sessionId, {
        ...existing,
        updatedAt: now,
        startedAt: existing.startedAt ?? cursor?.startedAt ?? null,
        toolCount: cursor?.tools ?? existing.toolCount,
      })
    }
    const meta = tracked ? await this.readMeta(tracked.dir, agentId) : { agentType: null, description: null }
    this.update(sessionId, {
      agentId,
      ...meta,
      state: 'running',
      updatedAt: now,
      startedAt: cursor?.startedAt ?? now,
      toolCount: cursor?.tools ?? 0,
    })
  }

  handleHook(hook: HookEvent): void {
    const sessionId = hook.payload.session_id
    if (hook.event === 'SubagentStop' && typeof hook.payload.agent_id === 'string') {
      const agentId = hook.payload.agent_id
      const session = this.store.get(sessionId)
      const existing = session?.subagents.find((s) => s.agentId === agentId)
      const agentType =
        typeof hook.payload.agent_type === 'string' ? hook.payload.agent_type : (existing?.agentType ?? null)
      this.update(sessionId, {
        agentId,
        agentType,
        description: existing?.description ?? null,
        state: 'done',
        updatedAt: hook.receivedAt,
        startedAt: existing?.startedAt ?? null,
        toolCount: existing?.toolCount ?? 0,
      })
      // The hook can arrive before the last change event: settle the count once more.
      const tracked = this.tracked.get(sessionId)
      if (tracked) void this.settle(sessionId, agentId, tracked)
    }
    if (hook.event === 'Stop') {
      const tasks = hook.payload.background_tasks
      this.store.upsert(sessionId, { backgroundTasks: Array.isArray(tasks) ? tasks.length : 0 })
    }
  }

  private async settle(sessionId: string, agentId: string, tracked: Tracked): Promise<void> {
    const cursor = await this.advance(tracked, agentId)
    const current = this.store.get(sessionId)?.subagents.find((s) => s.agentId === agentId)
    if (current && current.toolCount !== cursor.tools)
      this.update(sessionId, { ...current, toolCount: cursor.tools })
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

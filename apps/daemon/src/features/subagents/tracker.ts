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
import { parseTranscriptLine, subagentOutcome, subagentPromptLine } from '../transcript/parser.ts'

/** Subagents with no transcript activity for this long, in an idle session, are considered done. */
export const INACTIVITY_MS = 2 * 60_000
/**
 * After `SubagentStop`, when to look at the parent's transcript for how the subagent ended: the
 * tool result (or a background task's notification) is written after the subagent stops.
 */
export const OUTCOME_CHECKS_MS = [3_000, 15_000, 60_000] as const
/** How much of the end of the parent's transcript an outcome check reads. */
const OUTCOME_TAIL_BYTES = 512 * 1024

/** A name from the meta file or a hook: trimmed, and `null` when empty. */
export function cleanName(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

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
  /** First line of the subagent's prompt (its first user message), the name of last resort. */
  prompt: string | null
  pending: Promise<void>
}

type Tracked = {
  watcher: FSWatcher | null
  dir: string
  lastActivity: Map<string, number>
  cursors: Map<string, Cursor>
  /** The parent's tool call that spawned each subagent (from its meta file). */
  toolUseIds: Map<string, string>
}

/** Watches each live session's `subagents/` folder and keeps `session.subagents` up to date. */
export class SubagentTracker {
  private readonly tracked = new Map<string, Tracked>()
  private readonly sweeper: NodeJS.Timeout
  private readonly dirPoller: NodeJS.Timeout
  private readonly now: () => number
  private readonly outcomeChecksMs: readonly number[]
  private readonly outcomeTimers = new Set<NodeJS.Timeout>()

  constructor(
    private readonly store: SessionStore,
    private readonly broadcaster: Broadcaster,
    private readonly logger: Logger,
    options: { now?: () => number; dirPollMs?: number; outcomeChecksMs?: readonly number[] } = {},
  ) {
    this.now = options.now ?? Date.now
    this.outcomeChecksMs = options.outcomeChecksMs ?? OUTCOME_CHECKS_MS
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
      toolUseIds: new Map(),
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

  /** The meta file's names (blank ones as `null`); it may not exist yet when the transcript does. */
  private async readMeta(
    tracked: Tracked,
    agentId: string,
  ): Promise<{ agentType: string | null; description: string | null }> {
    try {
      const meta = JSON.parse(
        await readFile(join(tracked.dir, `agent-${agentId}.meta.json`), 'utf8'),
      ) as Record<string, unknown>
      const toolUseId = cleanName(meta.toolUseId)
      if (toolUseId) tracked.toolUseIds.set(agentId, toolUseId)
      return { agentType: cleanName(meta.agentType), description: cleanName(meta.description) }
    } catch {
      return { agentType: null, description: null }
    }
  }

  /** Fills missing names: the meta file again, then the prompt's first line as the description. */
  private async names(
    tracked: Tracked | undefined,
    agentId: string,
    current: Pick<SubagentInfo, 'agentType' | 'description'> | undefined,
    cursor: Cursor | null,
  ): Promise<{ agentType: string | null; description: string | null }> {
    let agentType = current?.agentType ?? null
    let description = current?.description ?? null
    if (tracked && (agentType === null || description === null)) {
      const meta = await this.readMeta(tracked, agentId)
      agentType ??= meta.agentType
      description ??= meta.description
    }
    return { agentType, description: description ?? cursor?.prompt ?? null }
  }

  /** Consumes what the transcript gained since the last read; reads of one file never overlap. */
  private advance(tracked: Tracked, agentId: string): Promise<Cursor> {
    let cursor = tracked.cursors.get(agentId)
    if (!cursor) {
      cursor = {
        offset: 0,
        rest: Buffer.alloc(0),
        tools: 0,
        startedAt: null,
        prompt: null,
        pending: Promise.resolve(),
      }
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
      const lines = data.subarray(0, lastNewline).toString('utf8').split('\n')
      if (cursor.prompt === null) {
        for (const line of lines) {
          cursor.prompt = subagentPromptLine(line)
          if (cursor.prompt) break
        }
      }
      cursor.tools += countToolUses(lines)
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
    // The record may have changed while the transcript was being read: a SubagentStop that landed
    // in the meantime must not be undone, only its tool count refreshed.
    const current = this.store.get(sessionId)?.subagents.find((s) => s.agentId === agentId) ?? existing
    if (current?.state === 'done') {
      if (cursor && current.toolCount !== cursor.tools)
        this.update(sessionId, { ...current, toolCount: cursor.tools })
      return
    }
    const names = await this.names(tracked, agentId, current, cursor)
    if (current) {
      return this.update(sessionId, {
        ...current,
        ...names,
        updatedAt: now,
        startedAt: current.startedAt ?? cursor?.startedAt ?? null,
        toolCount: cursor?.tools ?? current.toolCount,
      })
    }
    this.update(sessionId, {
      agentId,
      ...names,
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
      const agentType = cleanName(hook.payload.agent_type) ?? existing?.agentType ?? null
      this.update(sessionId, {
        agentId,
        agentType,
        description: existing?.description ?? null,
        state: 'done',
        updatedAt: hook.receivedAt,
        startedAt: existing?.startedAt ?? null,
        toolCount: existing?.toolCount ?? 0,
      })
      // The hook can arrive before the last change event: settle the count (and names) once more.
      const tracked = this.tracked.get(sessionId)
      if (tracked) void this.settle(sessionId, agentId, tracked)
      for (const delay of this.outcomeChecksMs) {
        const timer = setTimeout(() => {
          this.outcomeTimers.delete(timer)
          void this.checkOutcome(sessionId, agentId)
        }, delay)
        timer.unref()
        this.outcomeTimers.add(timer)
      }
    }
    if (hook.event === 'Stop') {
      const tasks = hook.payload.background_tasks
      this.store.upsert(sessionId, { backgroundTasks: Array.isArray(tasks) ? tasks.length : 0 })
    }
  }

  private async settle(sessionId: string, agentId: string, tracked: Tracked): Promise<void> {
    const cursor = await this.advance(tracked, agentId)
    const current = this.store.get(sessionId)?.subagents.find((s) => s.agentId === agentId)
    if (!current) return
    const names = await this.names(tracked, agentId, current, cursor)
    if (
      current.toolCount !== cursor.tools ||
      current.description !== names.description ||
      current.agentType !== names.agentType
    )
      this.update(sessionId, { ...current, ...names, toolCount: cursor.tools })
  }

  /** Reads how a finished subagent ended from the end of its parent's transcript. */
  async checkOutcome(sessionId: string, agentId: string): Promise<void> {
    const session = this.store.get(sessionId)
    const current = session?.subagents.find((s) => s.agentId === agentId)
    if (!session?.transcriptPath || current?.state !== 'done' || current.outcome) return
    const lines = await readTail(session.transcriptPath, OUTCOME_TAIL_BYTES)
    const toolUseId = this.tracked.get(sessionId)?.toolUseIds.get(agentId) ?? null
    const outcome = subagentOutcome(lines, { agentId, toolUseId })
    if (outcome !== 'failed' && outcome !== 'stopped') return
    const latest = this.store.get(sessionId)?.subagents.find((s) => s.agentId === agentId)
    if (latest?.state === 'done') this.update(sessionId, { ...latest, outcome })
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
    for (const timer of this.outcomeTimers) clearTimeout(timer)
    this.outcomeTimers.clear()
    clearInterval(this.sweeper)
    clearInterval(this.dirPoller)
    await Promise.all([...this.tracked.values()].map((t) => t.watcher?.close()))
    this.tracked.clear()
  }
}

/** Complete lines of the last `bytes` of a file (the first, possibly cut, line dropped); [] on error. */
async function readTail(path: string, bytes: number): Promise<string[]> {
  let handle: Awaited<ReturnType<typeof open>>
  try {
    handle = await open(path, 'r')
  } catch {
    return []
  }
  try {
    const { size } = await handle.stat()
    const start = Math.max(0, size - bytes)
    const chunk = Buffer.alloc(size - start)
    const { bytesRead } = await handle.read(chunk, 0, chunk.length, start)
    const lines = chunk.subarray(0, bytesRead).toString('utf8').split('\n')
    return start > 0 ? lines.slice(1) : lines
  } finally {
    await handle.close()
  }
}

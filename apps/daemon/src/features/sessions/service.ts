import { basename } from 'node:path'
import {
  type PermissionMode,
  PermissionModeSchema,
  type Profile,
  type SessionState,
} from '@claude-remote/protocol'
import type { Logger } from '../../core/logger.ts'
import type { TmuxClient } from '../../infra/tmux.ts'
import type { HookEvent } from '../hooks/payloads.ts'
import { scanRecentTranscripts } from './recent-scan.ts'
import type { SessionStore } from './store.ts'
import { oneLine, readTranscriptMeta } from './transcript-meta.ts'
import type { SessionRecord } from './types.ts'

export type SessionServiceOptions = {
  recentDays: number
  maxRecentPerProfile?: number
  /** Minimum interval between disk scans triggered by `sessions.list`. */
  scanCacheMs?: number
}

const NOTIFICATIONS_NOT_WAITING = new Set(['auth_success', 'agent_completed'])

function parseMode(value: unknown): PermissionMode | undefined {
  const parsed = PermissionModeSchema.safeParse(value)
  return parsed.success ? parsed.data : undefined
}

/** Keeps the session registry in sync with hooks, tmux panes and transcripts on disk. */
export class SessionService {
  private lastScan = 0

  constructor(
    private readonly store: SessionStore,
    private readonly tmux: TmuxClient,
    private readonly profiles: readonly Profile[],
    private readonly logger: Logger,
    private readonly options: SessionServiceOptions,
  ) {}

  private defaults(id: string, hook: HookEvent): SessionRecord {
    const cwd = hook.payload.cwd ?? ''
    return {
      id,
      profileId: hook.profileId ?? 'unknown',
      cwd,
      title: cwd ? basename(cwd) : 'Session',
      state: 'idle',
      permissionMode: null,
      controllable: false,
      paneId: null,
      updatedAt: hook.receivedAt,
      subagents: [],
      backgroundTasks: 0,
      checkout: null,
      transcriptPath: hook.payload.transcript_path ?? null,
    }
  }

  async handleHook(hook: HookEvent): Promise<void> {
    const id = hook.payload.session_id
    const patch: Partial<SessionRecord> = {}
    const mode = parseMode(hook.payload.permission_mode)
    if (mode) patch.permissionMode = mode
    if (hook.payload.cwd) patch.cwd = hook.payload.cwd
    if (hook.payload.transcript_path) patch.transcriptPath = hook.payload.transcript_path
    if (hook.profileId) patch.profileId = hook.profileId
    if (hook.paneId) {
      patch.paneId = hook.paneId
      patch.controllable = true
    }

    const state = this.stateFor(hook)
    if (state) patch.state = state

    switch (hook.event) {
      case 'SessionStart': {
        if (hook.paneId) this.releasePane(hook.paneId, id)
        const title = await this.titleFromTranscript(hook.payload.transcript_path)
        if (title) patch.title = title
        break
      }
      case 'UserPromptSubmit': {
        const current = this.store.get(id)
        const prompt = hook.payload.prompt
        if (typeof prompt === 'string' && (!current || current.title === basename(current.cwd))) {
          patch.title = oneLine(prompt)
        }
        break
      }
      case 'SessionEnd':
        patch.controllable = false
        patch.paneId = null
        break
      default:
        break
    }
    this.store.upsert(id, patch, () => this.defaults(id, hook))
  }

  private stateFor(hook: HookEvent): SessionState | undefined {
    switch (hook.event) {
      case 'SessionStart':
      case 'Stop':
        return 'idle'
      case 'UserPromptSubmit':
        return 'running'
      case 'PermissionRequest':
        return 'waiting'
      case 'Notification': {
        const type = hook.payload.notification_type
        return typeof type === 'string' && NOTIFICATIONS_NOT_WAITING.has(type) ? undefined : 'waiting'
      }
      case 'SessionEnd':
        return 'ended'
      default:
        return undefined
    }
  }

  /** A pane hosts one live session; `/clear` or `--resume` replace it with a new id. */
  private releasePane(paneId: string, keepId: string): void {
    for (const other of this.store.findByPane(paneId)) {
      if (other.id !== keepId)
        this.store.upsert(other.id, { paneId: null, controllable: false, state: 'ended' })
    }
  }

  private async titleFromTranscript(path: string | undefined): Promise<string | null> {
    if (!path) return null
    try {
      return (await readTranscriptMeta(path)).title
    } catch {
      return null
    }
  }

  /** Marks sessions whose tmux pane disappeared as ended. */
  async reconcilePanes(): Promise<void> {
    const linked = this.store.all().filter((s) => s.paneId)
    if (linked.length === 0) return
    let alive: Set<string>
    try {
      alive = new Set((await this.tmux.listPanes()).map((p) => p.paneId))
    } catch (error) {
      this.logger.warn({ err: error }, 'tmux list-panes failed')
      return
    }
    for (const session of linked) {
      if (session.paneId && !alive.has(session.paneId)) {
        this.store.upsert(session.id, { paneId: null, controllable: false, state: 'ended' })
      }
    }
  }

  /** Restores pane links saved before a restart, dropping panes that no longer exist. */
  async restore(): Promise<void> {
    const links = await this.store.loadLinks()
    if (links.length === 0) return
    const alive = new Set((await this.tmux.listPanes()).map((p) => p.paneId))
    for (const link of links) {
      if (!alive.has(link.paneId)) continue
      const meta = link.transcriptPath
        ? await readTranscriptMeta(link.transcriptPath).catch(() => null)
        : null
      this.store.upsert(link.id, {}, () => ({
        id: link.id,
        profileId: link.profileId,
        cwd: link.cwd,
        title: meta?.title ?? link.title,
        state: 'idle',
        permissionMode: meta?.permissionMode ?? null,
        controllable: true,
        paneId: link.paneId,
        updatedAt: new Date().toISOString(),
        subagents: [],
        backgroundTasks: 0,
        checkout: null,
        transcriptPath: link.transcriptPath,
      }))
    }
  }

  /** Adds recent transcripts that are not in the registry yet as read-only sessions. */
  async scanRecent(force = false): Promise<void> {
    const now = Date.now()
    if (!force && now - this.lastScan < (this.options.scanCacheMs ?? 10_000)) return
    this.lastScan = now
    const files = await scanRecentTranscripts(this.profiles, {
      days: this.options.recentDays,
      maxPerProfile: this.options.maxRecentPerProfile ?? 50,
    })
    for (const file of files) {
      if (this.store.get(file.sessionId)) continue
      const meta = await readTranscriptMeta(file.path).catch(() => null)
      if (!meta?.cwd) continue
      this.store.upsert(file.sessionId, { updatedAt: file.mtime.toISOString() }, () => ({
        id: file.sessionId,
        profileId: file.profileId,
        cwd: meta.cwd ?? '',
        title: meta.title ?? basename(meta.cwd ?? ''),
        state: 'ended',
        permissionMode: meta.permissionMode,
        controllable: false,
        paneId: null,
        updatedAt: file.mtime.toISOString(),
        subagents: [],
        backgroundTasks: 0,
        checkout: null,
        transcriptPath: file.path,
      }))
    }
  }
}

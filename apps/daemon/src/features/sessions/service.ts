import { stat } from 'node:fs/promises'
import { basename } from 'node:path'
import { type PermissionMode, PermissionModeSchema, type Profile } from '@remote-harness/protocol'
import type { Logger } from '../../core/logger.ts'
import type { TmuxClient } from '../../infra/tmux.ts'
import { type AgentAdapter, adapterOf, profileAgentId, type TranscriptSummary } from '../agents/index.ts'
import type { HookEvent } from '../hooks/payloads.ts'
import { scanRecentTranscripts } from './recent-scan.ts'
import { acceptsHook, hookState } from './state.ts'
import type { SessionStore } from './store.ts'
import { oneLine } from './transcript-meta.ts'
import type { SessionRecord } from './types.ts'

export type SessionServiceOptions = {
  recentDays: number
  maxRecentPerProfile?: number
  /** Minimum interval between disk scans triggered by `sessions.list`. */
  scanCacheMs?: number
}

/** Minimum interval between two `updatedAt` touches from transcript activity, per session. */
export const ACTIVITY_THROTTLE_MS = 5_000

function parseMode(value: unknown): PermissionMode | undefined {
  const parsed = PermissionModeSchema.safeParse(value)
  return parsed.success ? parsed.data : undefined
}

/** Keeps the session registry in sync with hooks, tmux panes and transcripts on disk. */
export class SessionService {
  private lastScan = 0
  /** Last `updatedAt` touch from transcript activity, per session (epoch ms). */
  private readonly lastTouch = new Map<string, number>()

  constructor(
    private readonly store: SessionStore,
    private readonly tmux: TmuxClient,
    private readonly profiles: readonly Profile[],
    private readonly logger: Logger,
    private readonly options: SessionServiceOptions,
  ) {}

  /** The agent of a profile (Claude Code when unknown): stamped on every record the registry creates. */
  private agentOf(profileId: string | null | undefined) {
    return profileAgentId(this.profiles.find((p) => p.id === profileId))
  }

  private adapterFor(profileId: string | null | undefined): AgentAdapter {
    return adapterOf(this.agentOf(profileId))
  }

  /** The transcript's title, folder and mode as the profile's agent writes them; null when unreadable. */
  private async summary(
    profileId: string | null | undefined,
    path: string,
  ): Promise<TranscriptSummary | null> {
    const configDir = this.profiles.find((p) => p.id === profileId)?.configDir ?? ''
    return this.adapterFor(profileId)
      .readSummary(path, configDir)
      .catch(() => null)
  }

  private defaults(id: string, hook: HookEvent): SessionRecord {
    const cwd = hook.payload.cwd ?? ''
    return {
      id,
      profileId: hook.profileId ?? 'unknown',
      agent: this.agentOf(hook.profileId),
      cwd,
      title: cwd ? basename(cwd) : 'Session',
      state: 'idle',
      permissionMode: null,
      approvalPolicy: null,
      controllable: false,
      paneId: null,
      updatedAt: hook.receivedAt,
      subagents: [],
      backgroundTasks: 0,
      checkout: null,
      status: null,
      transcriptPath: hook.payload.transcript_path ?? null,
    }
  }

  async handleHook(hook: HookEvent): Promise<void> {
    const id = hook.payload.session_id
    const patch: Partial<SessionRecord> = {}
    // Codex reports `default` / `bypassPermissions` here too; its mode is the approval policy instead.
    const mode = this.adapterFor(hook.profileId).modes ? parseMode(hook.payload.permission_mode) : undefined
    if (mode) patch.permissionMode = mode
    if (hook.payload.cwd) patch.cwd = hook.payload.cwd
    if (hook.payload.transcript_path) patch.transcriptPath = hook.payload.transcript_path
    if (hook.profileId) patch.profileId = hook.profileId
    // A hook delivered after the session ended (an idle notification, a late Stop) only refreshes
    // metadata: it must not bring the session back as waiting, running or controllable.
    const accepted = acceptsHook(this.store.get(id), hook.event, Boolean(hook.paneId))
    if (hook.paneId && accepted) {
      patch.paneId = hook.paneId
      patch.controllable = true
    }

    const state = accepted ? hookState(hook.event, hook.payload.notification_type) : undefined
    if (state) patch.state = state

    switch (hook.event) {
      case 'SessionStart': {
        if (hook.paneId) this.releasePane(hook.paneId, id)
        const path = hook.payload.transcript_path
        const summary = path ? await this.summary(hook.profileId, path) : null
        if (summary?.title) patch.title = summary.title
        if (summary?.approvalPolicy) patch.approvalPolicy = summary.approvalPolicy
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

  /** A pane hosts one live session; `/clear` or `--resume` replace it with a new id. */
  private releasePane(paneId: string, keepId: string): void {
    for (const other of this.store.findByPane(paneId)) {
      if (other.id !== keepId)
        this.store.upsert(other.id, { paneId: null, controllable: false, state: 'ended' })
    }
  }

  /**
   * Transcript activity (new entries read for the session or one of its subagents) advances
   * `updatedAt`, at most once per `ACTIVITY_THROTTLE_MS` per session so streaming output does
   * not re-sort the list on every token. Unknown sessions are ignored.
   */
  noteActivity(sessionId: string, at: number = Date.now()): void {
    const last = this.lastTouch.get(sessionId) ?? 0
    if (at - last < ACTIVITY_THROTTLE_MS || !this.store.get(sessionId)) return
    this.lastTouch.set(sessionId, at)
    this.store.upsert(sessionId, { updatedAt: new Date(at).toISOString() })
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
      const meta = link.transcriptPath ? await this.summary(link.profileId, link.transcriptPath) : null
      // Last activity survives the restart: the persisted stamp, else the transcript's mtime.
      const updatedAt =
        link.updatedAt ??
        (link.transcriptPath
          ? await stat(link.transcriptPath).then(
              (s) => s.mtime.toISOString(),
              () => null,
            )
          : null) ??
        new Date().toISOString()
      // The stamp goes in the patch: the store only keeps an explicit `updatedAt`.
      this.store.upsert(link.id, { updatedAt }, () => ({
        id: link.id,
        profileId: link.profileId,
        agent: this.agentOf(link.profileId),
        cwd: link.cwd,
        title: meta?.title ?? link.title,
        state: 'idle',
        permissionMode: meta?.permissionMode ?? null,
        approvalPolicy: meta?.approvalPolicy ?? null,
        controllable: true,
        paneId: link.paneId,
        updatedAt,
        subagents: [],
        backgroundTasks: 0,
        checkout: null,
        status: null,
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
      const meta = await this.summary(file.profileId, file.path)
      if (!meta?.cwd) continue
      this.store.upsert(file.sessionId, { updatedAt: file.mtime.toISOString() }, () => ({
        id: file.sessionId,
        profileId: file.profileId,
        agent: this.agentOf(file.profileId),
        cwd: meta.cwd ?? '',
        title: meta.title ?? basename(meta.cwd ?? ''),
        state: 'ended',
        permissionMode: meta.permissionMode,
        approvalPolicy: meta.approvalPolicy,
        controllable: false,
        paneId: null,
        updatedAt: file.mtime.toISOString(),
        subagents: [],
        backgroundTasks: 0,
        checkout: null,
        status: null,
        transcriptPath: file.path,
      }))
    }
  }
}

import type { CloseResult, WorktreeAction, WorktreeInfo } from '@remote-harness/protocol'
import { DaemonError } from '../../core/errors.ts'
import type { KeyedMutex } from '../../core/keyed-mutex.ts'
import type { Logger } from '../../core/logger.ts'
import { type GitClient, WorktreeLockedError } from '../../infra/git.ts'
import type { TmuxClient } from '../../infra/tmux.ts'
import type { SessionStore } from '../sessions/store.ts'

/** How long the daemon waits for the agent to leave after `/exit` before killing the pane. */
export const CLOSE_TIMEOUT_MS = 10_000
/**
 * How long the daemon waits for the process holding a worktree's lock (the agent) to exit before a
 * cleanup, once with the pane alive and once after killing it.
 */
export const LOCK_WAIT_MS = 6_000
export const CLOSE_POLL_MS = 500
export const WIP_COMMIT_MESSAGE = 'WIP from Remote Harness'

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export type CloseDeps = {
  store: SessionStore
  tmux: Pick<TmuxClient, 'sendKeys' | 'sendLiteral' | 'hasPane' | 'killPane'>
  git: Pick<GitClient, 'worktreeInfo' | 'worktreeLock' | 'commitAll' | 'push' | 'removeWorktree'>
  /** Serializes pane interactions per session (shared with the input feature). */
  lock: Pick<KeyedMutex, 'run'>
  /** Denies the session's pending permission requests, so the agent is not left stuck in the hook. */
  denyPending: (sessionId: string) => void
  /** Where failed cleanups are logged, with the worktree path. */
  log?: Pick<Logger, 'warn'>
  sleep?: (ms: number) => Promise<void>
  timeoutMs?: number
  pollMs?: number
  lockWaitMs?: number
}

/** What a cleanup action does given the worktree's git state (pure). Throws when it would lose work. */
export function cleanupPlan(
  info: Pick<WorktreeInfo, 'dirty' | 'unpushed'>,
  action: WorktreeAction,
): { commit: boolean; push: boolean; force: boolean } {
  switch (action) {
    case 'delete':
      if (info.dirty > 0 || info.unpushed > 0) {
        throw new DaemonError(
          'bad_request',
          'the worktree has changes or unpushed commits: choose push-delete or discard-delete',
        )
      }
      return { commit: false, push: false, force: false }
    case 'push-delete':
      return { commit: info.dirty > 0, push: true, force: false }
    case 'discard-delete':
      return { commit: false, push: false, force: true }
  }
}

/** Ends sessions gracefully and cleans up their git worktrees on request. */
export class CloseService {
  constructor(private readonly deps: CloseDeps) {}

  /** The session's linked worktree, or `null` (main checkout, outside git, no folder). */
  async inspect(sessionId: string): Promise<WorktreeInfo | null> {
    const session = this.require(sessionId)
    return session.cwd ? this.deps.git.worktreeInfo(session.cwd) : null
  }

  /** Closes a controllable session; with `worktree`, cleans its worktree up after it ended. */
  async close(sessionId: string, worktree?: WorktreeAction): Promise<CloseResult> {
    const session = this.require(sessionId)
    if (!session.controllable || !session.paneId) {
      throw new DaemonError('not_controllable', 'session has no live tmux pane')
    }
    const paneId = session.paneId
    // Inspect before the agent leaves: the folder is still certainly there.
    const info = worktree ? await this.deps.git.worktreeInfo(session.cwd) : null
    if (worktree && !info) {
      throw new DaemonError('bad_request', 'the session does not run in a linked git worktree')
    }
    if (info && worktree) cleanupPlan(info, worktree)
    const closed = await this.deps.lock.run(sessionId, () => this.end(sessionId, paneId))
    if (!worktree || !info) return { closed }
    await this.releaseAgent(info, sessionId, paneId)
    await this.cleanupWorktree(info, worktree)
    return { closed, worktree: 'deleted' }
  }

  /** Cleans up the worktree of a session that is not running any more. */
  async cleanup(sessionId: string, action: WorktreeAction): Promise<void> {
    const session = this.require(sessionId)
    if (session.controllable) {
      throw new DaemonError('session_busy', 'close the session before cleaning up its worktree')
    }
    const info = session.cwd ? await this.deps.git.worktreeInfo(session.cwd) : null
    if (!info) throw new DaemonError('bad_request', 'the session does not run in a linked git worktree')
    await this.waitForLock(info)
    await this.cleanupWorktree(info, action)
  }

  /**
   * Whether the worktree's lock holder (the agent) has exited, waiting up to `lockWaitMs`. Claude Code
   * keeps the lock while it shows its own "keep or remove the worktree?" dialog after `/exit`, and
   * while it removes a clean worktree by itself.
   */
  private async waitForLock(info: WorktreeInfo): Promise<boolean> {
    const sleep = this.deps.sleep ?? defaultSleep
    const pollMs = this.deps.pollMs ?? CLOSE_POLL_MS
    const attempts = Math.max(1, Math.ceil((this.deps.lockWaitMs ?? LOCK_WAIT_MS) / pollMs))
    for (let i = 0; i < attempts; i++) {
      const lock = await this.deps.git.worktreeLock(info.mainRoot, info.path).catch(() => null)
      if (!lock?.alive) return true
      await sleep(pollMs)
    }
    return false
  }

  /**
   * Before deleting the worktree of a session just closed: let the agent finish leaving, and end its
   * pane when it stays (its exit dialog would hold the lock forever). The user chose the deletion.
   */
  private async releaseAgent(info: WorktreeInfo, sessionId: string, paneId: string): Promise<void> {
    if (await this.waitForLock(info)) return
    const { tmux, store } = this.deps
    const ours = !store.findByPane(paneId).some((s) => s.id !== sessionId)
    if (ours && (await tmux.hasPane(paneId))) await tmux.killPane(paneId)
    await this.waitForLock(info)
  }

  private require(sessionId: string) {
    const session = this.deps.store.get(sessionId)
    if (!session) throw new DaemonError('not_found', `session ${sessionId} not found`)
    return session
  }

  private async cleanupWorktree(info: WorktreeInfo, action: WorktreeAction): Promise<void> {
    const plan = cleanupPlan(info, action)
    try {
      if (plan.commit) await this.deps.git.commitAll(info.path, WIP_COMMIT_MESSAGE)
      if (plan.push) await this.deps.git.push(info.path)
      // git's own "is it clean?" check does not run on removal: look again right before it (the
      // agent may have written while exiting, and a push-delete must have left nothing behind).
      if (!plan.force) {
        const now = await this.deps.git.worktreeInfo(info.path)
        if (now && (now.dirty > 0 || now.unpushed > 0)) {
          throw new DaemonError(
            'bad_request',
            `the worktree changed: ${now.dirty} modified or untracked files, ${now.unpushed} unpushed commits`,
          )
        }
      }
      await this.deps.git.removeWorktree(info, { force: plan.force })
    } catch (error) {
      // A failed push, move or lock check keeps the worktree: nothing is lost, the app shows why.
      const message = error instanceof Error ? error.message : String(error)
      this.deps.log?.warn({ path: info.path, action, reason: message }, 'worktree cleanup failed')
      if (error instanceof DaemonError) throw error
      // Still in use by a running process: the app explains it and offers to retry or keep it.
      if (error instanceof WorktreeLockedError) throw new DaemonError('session_busy', message)
      throw new DaemonError('internal', message)
    }
  }

  /**
   * Graceful end: deny pending requests, Escape (closes a menu), `/exit` + Enter, then wait for the
   * session to end or the pane to go. Only after the timeout is the pane killed, and only if the
   * registry still maps it to this session.
   */
  private async end(sessionId: string, paneId: string): Promise<CloseResult['closed']> {
    const { tmux, store } = this.deps
    const sleep = this.deps.sleep ?? defaultSleep
    const pollMs = this.deps.pollMs ?? CLOSE_POLL_MS
    const attempts = Math.max(1, Math.ceil((this.deps.timeoutMs ?? CLOSE_TIMEOUT_MS) / pollMs))
    this.deps.denyPending(sessionId)
    await tmux.sendKeys(paneId, ['Escape'])
    await sleep(pollMs)
    await tmux.sendLiteral(paneId, '/exit')
    await tmux.sendKeys(paneId, ['Enter'])
    for (let i = 0; i < attempts; i++) {
      await sleep(pollMs)
      const current = store.get(sessionId)
      if (!current || current.state === 'ended' || !current.controllable) return 'exited'
      if (current.paneId !== paneId) return 'already'
      if (!(await tmux.hasPane(paneId))) {
        store.upsert(sessionId, { state: 'ended', controllable: false, paneId: null })
        return 'exited'
      }
    }
    const current = store.get(sessionId)
    if (!current || current.paneId !== paneId || store.findByPane(paneId).some((s) => s.id !== sessionId)) {
      return 'already'
    }
    await tmux.killPane(paneId)
    store.upsert(sessionId, { state: 'ended', controllable: false, paneId: null })
    return 'killed'
  }
}

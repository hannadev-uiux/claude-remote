import { homedir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import type { Checkout, Profile, ProjectItem } from '@remote-harness/protocol'
import { DaemonError } from '../../core/errors.ts'
import type { Executor } from '../../infra/exec.ts'
import { isDirectory } from '../../infra/fs.ts'
import { worktreeName } from '../checkout/resolver.ts'
import type { SessionStore } from '../sessions/store.ts'

export const MAX_PROJECTS = 30
/** How long `start` waits before checking that Claude Code is still running in the new pane. */
export const START_SETTLE_MS = 1_500

/** Accepts only existing directories inside the user's home. */
export async function validateCwd(raw: string, home = homedir()): Promise<string> {
  const trimmed = raw.trim()
  const cwd = resolve(trimmed === '~' || trimmed.startsWith('~/') ? join(home, trimmed.slice(1)) : trimmed)
  const inside = cwd === home || cwd.startsWith(`${home}${sep}`)
  if (!inside || !(await isDirectory(cwd))) throw new DaemonError('invalid_cwd', `invalid directory: ${raw}`)
  return cwd
}

/** Starts and resumes sessions by running the profile launcher without attaching a terminal. */
export class LifecycleService {
  /** Launches by \`resume\` that may not have reported SessionStart yet, by session id. */
  private readonly resuming = new Map<string, Promise<string>>()

  constructor(
    private readonly exec: Executor,
    private readonly store: SessionStore,
    private readonly profiles: readonly Profile[],
    private readonly binDir: string,
    private readonly home = homedir(),
    private readonly hasPane: (paneId: string) => Promise<boolean> = async () => false,
    private readonly checkout: (dir: string) => Promise<Checkout | null> = async () => null,
    private readonly now: () => Date = () => new Date(),
    /** 0 skips the check that the new pane survived its first moments. */
    private readonly settleMs = 0,
  ) {}

  private profile(id: string): Profile {
    const profile = this.profiles.find((p) => p.id === id)
    if (!profile) throw new DaemonError('not_found', `profile ${id} not found`)
    return profile
  }

  private async launch(profile: Profile, cwd: string, args: string[]): Promise<string> {
    const launcher = join(this.binDir, profile.id)
    const result = await this.exec(launcher, args, {
      cwd,
      env: { CLAUDE_REMOTE_NO_ATTACH: '1' },
      timeoutMs: 10_000,
    })
    if (result.exitCode !== 0) {
      const reason = result.stderr.trim() || 'the profile launcher failed (run `remote-harness install`)'
      throw new DaemonError('internal', reason)
    }
    return result.stdout.trim()
  }

  /** `worktree` runs Claude Code with `--worktree <name>`: its own git worktree and branch. */
  async start(
    profileId: string,
    rawCwd: string,
    options: { worktree?: boolean } = {},
  ): Promise<{ paneId: string }> {
    const profile = this.profile(profileId)
    const cwd = await validateCwd(rawCwd, this.home)
    const args: string[] = []
    if (options.worktree) {
      if (!(await this.checkout(cwd))) throw new DaemonError('bad_request', `not a git checkout: ${cwd}`)
      args.push('--worktree', worktreeName(this.now()))
    }
    const paneId = await this.launch(profile, cwd, args)
    // The launcher only reports the window it created; a window whose command exits closes at once.
    if (this.settleMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.settleMs))
      if (!(await this.hasPane(paneId))) {
        throw new DaemonError('internal', `Claude Code exited right after starting (pane ${paneId} closed)`)
      }
    }
    return { paneId }
  }

  async resume(profileId: string, sessionId: string): Promise<{ paneId: string }> {
    const profile = this.profile(profileId)
    const session = this.store.get(sessionId)
    if (!session) throw new DaemonError('not_found', `session ${sessionId} not found`)
    if (session.controllable) {
      // Open in a window this service launched (linked by `link`): a repeated tap gets the same pane
      // while it is alive, and a new window when it closed before the pane reconciliation noticed.
      const launched = await this.resuming.get(sessionId)?.catch(() => null)
      if (!launched || launched !== session.paneId) {
        throw new DaemonError('bad_request', 'the session is already open in tmux')
      }
      if (await this.hasPane(launched)) return { paneId: launched }
      this.store.upsert(sessionId, { paneId: null, controllable: false })
    }
    // A repeated tap while Claude is still booting (or while the launcher is still running)
    // must not open another window; the promise is stored before any await.
    const pending = this.resuming.get(sessionId)
    if (pending) {
      const paneId = await pending.catch(() => null)
      if (paneId && this.resuming.get(sessionId) === pending && (await this.hasPane(paneId))) {
        return { paneId }
      }
      if (this.resuming.get(sessionId) !== pending) return this.resume(profileId, sessionId)
    }
    const launch = validateCwd(session.cwd, this.home).then((cwd) =>
      this.launch(profile, cwd, ['--resume', sessionId]),
    )
    this.resuming.set(sessionId, launch)
    try {
      const paneId = await launch
      this.link(sessionId, paneId)
      return { paneId }
    } catch (error) {
      if (this.resuming.get(sessionId) === launch) this.resuming.delete(sessionId)
      throw error
    }
  }

  /**
   * Links the new window to the session without waiting for its SessionStart hook: a session running
   * in the background (`claude --bg`) turns `--resume` into `claude attach`, whose window fires no
   * hooks. A later SessionStart from the pane (same or new id) still takes over the link.
   */
  private link(sessionId: string, paneId: string): void {
    const current = this.store.get(sessionId)
    if (!current || current.controllable || this.store.findByPane(paneId).length > 0) return
    this.store.upsert(sessionId, {
      paneId,
      controllable: true,
      state: current.state === 'ended' ? 'idle' : current.state,
    })
  }

  /** Recent working directories of a profile, most recent first. */
  /**
   * The profile's directories by most recent use, each with the branch of its latest session and
   * how many sessions were used there in the last 7 days.
   */
  projects(profileId: string): ProjectItem[] {
    this.profile(profileId)
    const weekAgo = new Date(this.now().getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const latest = new Map<string, ProjectItem>()
    for (const s of this.store.all()) {
      if (s.profileId !== profileId || !s.cwd) continue
      const recent = s.updatedAt >= weekAgo ? 1 : 0
      const current = latest.get(s.cwd)
      if (!current) {
        latest.set(s.cwd, {
          cwd: s.cwd,
          lastUsedAt: s.updatedAt,
          branch: s.checkout?.branch ?? null,
          sessions: recent,
        })
        continue
      }
      current.sessions += recent
      if (s.updatedAt > current.lastUsedAt) {
        current.lastUsedAt = s.updatedAt
        current.branch = s.checkout?.branch ?? current.branch
      }
    }
    return [...latest.values()]
      .sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt))
      .slice(0, MAX_PROJECTS)
  }
}

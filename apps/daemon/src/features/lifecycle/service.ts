import { homedir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import type { Profile, ProjectItem } from '@claude-remote/protocol'
import { DaemonError } from '../../core/errors.ts'
import { expandHome } from '../../core/paths.ts'
import type { Executor } from '../../infra/exec.ts'
import { isDirectory } from '../../infra/fs.ts'
import type { SessionStore } from '../sessions/store.ts'

export const MAX_PROJECTS = 30

/** Accepts only existing directories inside the user's home. */
export async function validateCwd(raw: string, home = homedir()): Promise<string> {
  const cwd = resolve(expandHome(raw.trim()))
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
      const reason = result.stderr.trim() || 'launcher falhou (rode `claude-remote install`)'
      throw new DaemonError('internal', reason)
    }
    return result.stdout.trim()
  }

  async start(profileId: string, rawCwd: string): Promise<{ paneId: string }> {
    const profile = this.profile(profileId)
    const cwd = await validateCwd(rawCwd, this.home)
    return { paneId: await this.launch(profile, cwd, []) }
  }

  async resume(profileId: string, sessionId: string): Promise<{ paneId: string }> {
    const profile = this.profile(profileId)
    const session = this.store.get(sessionId)
    if (!session) throw new DaemonError('not_found', `session ${sessionId} not found`)
    if (session.controllable) throw new DaemonError('bad_request', 'the session is already open in tmux')
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
      return { paneId: await launch }
    } catch (error) {
      if (this.resuming.get(sessionId) === launch) this.resuming.delete(sessionId)
      throw error
    }
  }

  /** Recent working directories of a profile, most recent first. */
  projects(profileId: string): ProjectItem[] {
    this.profile(profileId)
    const latest = new Map<string, string>()
    for (const s of this.store.all()) {
      if (s.profileId !== profileId || !s.cwd) continue
      const current = latest.get(s.cwd)
      if (!current || s.updatedAt > current) latest.set(s.cwd, s.updatedAt)
    }
    return [...latest.entries()]
      .map(([cwd, lastUsedAt]) => ({ cwd, lastUsedAt }))
      .sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt))
      .slice(0, MAX_PROJECTS)
  }
}

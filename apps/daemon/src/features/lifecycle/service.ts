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
  if (!inside || !(await isDirectory(cwd))) throw new DaemonError('invalid_cwd', `diretório inválido: ${raw}`)
  return cwd
}

/** Starts and resumes sessions by running the profile launcher without attaching a terminal. */
export class LifecycleService {
  constructor(
    private readonly exec: Executor,
    private readonly store: SessionStore,
    private readonly profiles: readonly Profile[],
    private readonly binDir: string,
    private readonly home = homedir(),
  ) {}

  private profile(id: string): Profile {
    const profile = this.profiles.find((p) => p.id === id)
    if (!profile) throw new DaemonError('not_found', `perfil ${id} não encontrado`)
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
    if (!session) throw new DaemonError('not_found', `sessão ${sessionId} não encontrada`)
    if (session.controllable) throw new DaemonError('bad_request', 'a sessão já está aberta no tmux')
    const cwd = await validateCwd(session.cwd, this.home)
    return { paneId: await this.launch(profile, cwd, ['--resume', sessionId]) }
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

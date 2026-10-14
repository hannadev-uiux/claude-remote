import type { MuteState } from '@claude-remote/protocol'
import { MuteStateSchema } from '@claude-remote/protocol'
import { readJsonFile, writeJsonAtomic } from '../../infra/fs.ts'

/** Profiles and sessions whose events must not generate push notifications. */
export class MuteStore {
  private state: MuteState = { profiles: [], sessions: [] }

  constructor(private readonly path: string) {}

  async load(): Promise<void> {
    const parsed = MuteStateSchema.safeParse(await readJsonFile(this.path).catch(() => undefined))
    this.state = parsed.success ? parsed.data : { profiles: [], sessions: [] }
  }

  get(): MuteState {
    return { profiles: [...this.state.profiles], sessions: [...this.state.sessions] }
  }

  isMuted(profileId: string | null, sessionId: string): boolean {
    return (
      (profileId !== null && this.state.profiles.includes(profileId)) ||
      this.state.sessions.includes(sessionId)
    )
  }

  async set(target: 'profile' | 'session', id: string, muted: boolean): Promise<MuteState> {
    const key = target === 'profile' ? 'profiles' : 'sessions'
    const without = this.state[key].filter((x) => x !== id)
    this.state = { ...this.state, [key]: muted ? [...without, id] : without }
    await writeJsonAtomic(this.path, this.state)
    return this.get()
  }
}

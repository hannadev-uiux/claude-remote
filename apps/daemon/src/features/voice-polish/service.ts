import { tmpdir } from 'node:os'
import type { Profile } from '@remote-harness/protocol'
import type { Logger } from '../../core/logger.ts'
import type { Executor } from '../../infra/exec.ts'
import { agentFor } from '../agents/index.ts'
import { isDefaultConfigDir } from '../hooks/launcher.ts'

const POLISH_TIMEOUT_MS = 9_500

export type VoicePolishResult = { text: string; applied: boolean }

export type VoicePolishServiceDeps = { exec: Executor; logger: Logger }

/** Rewrites a dictated transcript through the profile's own agent CLI; never throws. */
export class VoicePolishService {
  constructor(private readonly deps: VoicePolishServiceDeps) {}

  async polish(profile: Profile, text: string): Promise<VoicePolishResult> {
    const fallback: VoicePolishResult = { text, applied: false }
    if (profile.provider) return fallback
    const adapter = agentFor(profile)
    if (!adapter.polish) return fallback
    const env =
      adapter.configDirEnv && !isDefaultConfigDir(profile.configDir)
        ? { [adapter.configDirEnv]: profile.configDir }
        : undefined
    const result = await this.deps
      .exec(adapter.command, adapter.polish.args(text), { cwd: tmpdir(), env, timeoutMs: POLISH_TIMEOUT_MS })
      .catch((error: Error) => {
        this.deps.logger.warn({ profileId: profile.id, error: error.message }, 'voice polish call failed')
        return null
      })
    if (result?.exitCode !== 0) return fallback
    const rewritten = parseResult(result.stdout)
    if (!rewritten || rewritten.trim() === text.trim()) return fallback
    return { text: rewritten.trim(), applied: true }
  }
}

function parseResult(stdout: string): string | null {
  try {
    const parsed: unknown = JSON.parse(stdout)
    const result = (parsed as { result?: unknown } | null)?.result
    return typeof result === 'string' && result.trim().length > 0 ? result : null
  } catch {
    return null
  }
}

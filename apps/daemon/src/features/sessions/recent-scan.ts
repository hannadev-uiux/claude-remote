import type { Profile } from '@remote-harness/protocol'
import { agentFor } from '../agents/index.ts'

export type TranscriptFile = { profileId: string; sessionId: string; path: string; mtime: Date }

/** Finds each profile's main-session transcripts (where its agent writes them) modified within `days`. */
export async function scanRecentTranscripts(
  profiles: readonly Profile[],
  options: { days: number; maxPerProfile: number; now?: Date },
): Promise<TranscriptFile[]> {
  const cutoff = (options.now ?? new Date()).getTime() - options.days * 86_400_000
  const result: TranscriptFile[] = []
  for (const profile of profiles) {
    const found = await agentFor(profile).findTranscripts(profile.configDir, cutoff)
    const files = found.map((file) => ({ ...file, profileId: profile.id }))
    files.sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
    result.push(...files.slice(0, options.maxPerProfile))
  }
  return result
}

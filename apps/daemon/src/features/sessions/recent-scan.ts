import { readdir, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import type { Profile } from '@remote-harness/protocol'

export type TranscriptFile = { profileId: string; sessionId: string; path: string; mtime: Date }

/** Finds main-session transcripts (`projects/<dir>/<id>.jsonl`) modified within `days`. */
export async function scanRecentTranscripts(
  profiles: readonly Profile[],
  options: { days: number; maxPerProfile: number; now?: Date },
): Promise<TranscriptFile[]> {
  const cutoff = (options.now ?? new Date()).getTime() - options.days * 86_400_000
  const result: TranscriptFile[] = []
  for (const profile of profiles) {
    const projectsDir = join(profile.configDir, 'projects')
    let projectDirs: string[]
    try {
      projectDirs = await readdir(projectsDir)
    } catch {
      continue
    }
    const files: TranscriptFile[] = []
    for (const dir of projectDirs) {
      let names: string[]
      try {
        names = await readdir(join(projectsDir, dir))
      } catch {
        continue
      }
      for (const name of names) {
        if (!name.endsWith('.jsonl')) continue
        const path = join(projectsDir, dir, name)
        try {
          const info = await stat(path)
          if (info.isFile() && info.mtimeMs >= cutoff) {
            files.push({
              profileId: profile.id,
              sessionId: basename(name, '.jsonl'),
              path,
              mtime: info.mtime,
            })
          }
        } catch {
          // removed while scanning
        }
      }
    }
    files.sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
    result.push(...files.slice(0, options.maxPerProfile))
  }
  return result
}

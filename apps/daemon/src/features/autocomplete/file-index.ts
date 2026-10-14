import type { FileItem } from '@claude-remote/protocol'
import fuzzysort from 'fuzzysort'
import type { Executor } from '../../infra/exec.ts'

export const MAX_INDEXED_PATHS = 200_000
const TTL_MS = 30_000

type Entry = { items: FileItem[]; prepared: ReturnType<typeof fuzzysort.prepare>[]; builtAt: number }

/** Collects directories implied by file paths (`a/b/c.ts` → `a/`, `a/b/`). */
export function withDirectories(files: readonly string[]): FileItem[] {
  const dirs = new Set<string>()
  for (const file of files) {
    const parts = file.split('/')
    for (let i = 1; i < parts.length; i++) dirs.add(`${parts.slice(0, i).join('/')}/`)
  }
  return [
    ...[...dirs].map((path) => ({ path, kind: 'dir' as const })),
    ...files.map((path) => ({ path, kind: 'file' as const })),
  ]
}

/** Per-cwd index of project files respecting .gitignore (git ls-files, falling back to rg). */
export class FileIndex {
  private readonly cache = new Map<string, Entry>()
  private readonly building = new Map<string, Promise<Entry>>()

  constructor(
    private readonly exec: Executor,
    private readonly now: () => number = Date.now,
  ) {}

  private async listFiles(cwd: string): Promise<string[]> {
    const git = await this.exec('git', ['-C', cwd, 'ls-files', '-co', '--exclude-standard'], {
      timeoutMs: 15_000,
    })
    if (git.exitCode === 0) return git.stdout.split('\n').filter(Boolean)
    const rg = await this.exec('rg', ['--files', '--hidden', '--glob', '!.git'], { cwd, timeoutMs: 15_000 })
    return rg.stdout.split('\n').filter(Boolean)
  }

  private async entry(cwd: string): Promise<Entry> {
    const cached = this.cache.get(cwd)
    if (cached && this.now() - cached.builtAt < TTL_MS) return cached
    let pending = this.building.get(cwd)
    if (!pending) {
      pending = (async () => {
        const files = (await this.listFiles(cwd)).slice(0, MAX_INDEXED_PATHS)
        const items = withDirectories(files)
        const entry: Entry = {
          items,
          prepared: items.map((i) => fuzzysort.prepare(i.path)),
          builtAt: this.now(),
        }
        this.cache.set(cwd, entry)
        return entry
      })().finally(() => this.building.delete(cwd))
      this.building.set(cwd, pending)
    }
    return pending
  }

  async search(cwd: string, query: string, limit = 20): Promise<FileItem[]> {
    const { items, prepared } = await this.entry(cwd)
    if (!query) {
      // Top-level entries first when nothing was typed yet.
      return items.filter((i) => !i.path.slice(0, -1).includes('/')).slice(0, limit)
    }
    const byPath = new Map(items.map((i) => [i.path, i]))
    const results = fuzzysort.go(query, prepared, { limit, threshold: 0.2 })
    return results.map((r) => byPath.get(r.target) ?? { path: r.target, kind: 'file' as const })
  }
}

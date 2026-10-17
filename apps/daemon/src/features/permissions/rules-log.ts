import { randomUUID } from 'node:crypto'
import { appendFile, mkdir, readFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { RuleScope } from '@remote-harness/protocol'
import { readJsonFile, writeJsonAtomic } from '../../infra/fs.ts'

export type RuleLogEntry = {
  id: string
  rule: string
  scope: RuleScope
  /** settings file the rule was written to by Claude Code. */
  file: string
  sessionId: string
  createdAt: string
}

/** Append-only log of rules created from the phone, so they can be listed and undone. */
export class RulesLog {
  constructor(private readonly path: string) {}

  async add(entry: Omit<RuleLogEntry, 'id' | 'createdAt'>): Promise<RuleLogEntry> {
    const full: RuleLogEntry = { ...entry, id: randomUUID().slice(0, 8), createdAt: new Date().toISOString() }
    await mkdir(dirname(this.path), { recursive: true })
    await appendFile(this.path, `${JSON.stringify(full)}\n`)
    return full
  }

  async list(): Promise<RuleLogEntry[]> {
    let text: string
    try {
      text = await readFile(this.path, 'utf8')
    } catch {
      return []
    }
    return text
      .split('\n')
      .filter(Boolean)
      .flatMap((line) => {
        try {
          return [JSON.parse(line) as RuleLogEntry]
        } catch {
          return []
        }
      })
  }

  /** Removes the rule from the settings file it was written to. Returns false if it was not there. */
  async undo(id: string): Promise<{ entry: RuleLogEntry; removed: boolean } | null> {
    const entry = (await this.list()).find((e) => e.id === id)
    if (!entry) return null
    const settings = ((await readJsonFile(entry.file)) ?? {}) as Record<string, unknown>
    const permissions = (settings.permissions ?? {}) as Record<string, unknown>
    const allow = Array.isArray(permissions.allow) ? (permissions.allow as unknown[]) : []
    const next = allow.filter((r) => r !== entry.rule)
    if (next.length === allow.length) return { entry, removed: false }
    await writeJsonAtomic(entry.file, { ...settings, permissions: { ...permissions, allow: next } })
    return { entry, removed: true }
  }
}

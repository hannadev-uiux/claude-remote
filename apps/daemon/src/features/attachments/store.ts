import { randomUUID } from 'node:crypto'
import { chmod, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { type AttachmentMimeType, MAX_ATTACHMENT_BYTES } from '@remote-harness/protocol'
import { DaemonError } from '../../core/errors.ts'
import type { Logger } from '../../core/logger.ts'
import { ATTACHMENT_EXTENSIONS, base64DecodedBytes, decodeBase64, detectImageType } from './detect.ts'

/** Attachments live long enough for Claude to read them during the turn, then are pruned. */
export const ATTACHMENT_TTL_MS = 24 * 60 * 60 * 1000

type Entry = { sessionId: string; path: string }

/**
 * Images uploaded from the app, saved in the daemon's private directory. Ids are server-generated
 * and only resolve for the session they were uploaded to, so a client never supplies a path.
 */
export class AttachmentStore {
  private readonly entries = new Map<string, Entry>()

  constructor(
    private readonly dir: string,
    private readonly logger: Logger,
    private readonly now: () => number = Date.now,
  ) {}

  async save(sessionId: string, mimeType: AttachmentMimeType, data: string): Promise<string> {
    // Checked before decoding so an oversized upload never allocates its full buffer.
    if (base64DecodedBytes(data) > MAX_ATTACHMENT_BYTES)
      throw new DaemonError('too_large', 'image exceeds 5 MB')
    const bytes = decodeBase64(data)
    if (!bytes) throw new DaemonError('bad_request', 'attachment data is not valid base64')
    if (detectImageType(bytes) !== mimeType)
      throw new DaemonError('unsupported_media', `data is not a valid ${mimeType}`)
    await mkdir(this.dir, { recursive: true, mode: 0o700 })
    await chmod(this.dir, 0o700)
    const id = randomUUID()
    const path = join(this.dir, `${id}.${ATTACHMENT_EXTENSIONS[mimeType]}`)
    await writeFile(path, bytes, { mode: 0o600, flag: 'wx' })
    this.entries.set(id, { sessionId, path })
    return id
  }

  /** Paths for ids issued to this session, in order; any other id is `not_found`. */
  resolve(sessionId: string, ids: readonly string[]): string[] {
    return ids.map((id) => {
      const entry = this.entries.get(id)
      if (!entry || entry.sessionId !== sessionId)
        throw new DaemonError('not_found', `attachment ${id} not found or expired`)
      return entry.path
    })
  }

  /** Deletes files older than the TTL (including ones left by a previous run) and forgets them. */
  async prune(): Promise<void> {
    let names: string[]
    try {
      names = await readdir(this.dir)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
      throw error
    }
    const cutoff = this.now() - ATTACHMENT_TTL_MS
    for (const name of names) {
      const path = join(this.dir, name)
      try {
        if ((await stat(path)).mtimeMs >= cutoff) continue
        await rm(path, { force: true })
        this.entries.delete(name.replace(/\.[^.]+$/, ''))
      } catch (error) {
        this.logger.warn({ err: error, name }, 'could not prune attachment')
      }
    }
  }
}

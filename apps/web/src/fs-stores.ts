/**
 * The site's storage on the server: plain files under the data directory, in the same layout the R2
 * buckets had (`updates/…` and `app/<token>/…`). Writes go to a temporary file next to the target
 * and are renamed, so a reader never sees half a file.
 */
import { randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve, sep } from 'node:path'
import { Readable } from 'node:stream'
import type { BuildsStore, StoredFile } from './app.ts'
import type { Platform } from './updates/protocol.ts'
import {
  keys,
  parseStored,
  type StoredAsset,
  type StoredManifest,
  type UpdatesStore,
} from './updates/store.ts'

/** `key` under `root`, or null when it would resolve outside of it (the callers validate keys too). */
export function pathIn(root: string, key: string): string | null {
  const base = resolve(root)
  const path = resolve(base, key)
  return path.startsWith(base + sep) ? path : null
}

async function sizeOf(path: string): Promise<{ size: number; mtimeMs: number } | null> {
  try {
    const info = await stat(path)
    return info.isFile() ? info : null
  } catch {
    return null
  }
}

function openStream(path: string): ReadableStream<Uint8Array> {
  return Readable.toWeb(createReadStream(path)) as ReadableStream<Uint8Array>
}

/** Writes through a temporary file in the same directory, then renames it into place. */
export async function writeAtomic(path: string, data: string | Uint8Array): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const temp = `${path}.${randomUUID()}.tmp`
  try {
    await writeFile(temp, data)
    await rename(temp, path)
  } catch (error) {
    await rm(temp, { force: true })
    throw error
  }
}

/** Updates under `<data>/updates`; an asset's content type is kept next to it in `<hash>.type`. */
export class FsUpdatesStore implements UpdatesStore {
  constructor(private readonly root: string) {}

  /** Reads treat a key outside the folder as missing; writes refuse it. */
  private writable(key: string): string {
    const path = pathIn(this.root, key)
    if (!path) throw new Error(`key outside the updates folder: ${key}`)
    return path
  }

  async hasAsset(hash: string): Promise<boolean> {
    const path = pathIn(this.root, keys.asset(hash))
    return path !== null && (await sizeOf(path)) !== null
  }

  async getAsset(hash: string): Promise<StoredAsset | null> {
    const path = pathIn(this.root, keys.asset(hash))
    const info = path && (await sizeOf(path))
    if (!path || !info) return null
    if (!info) return null
    const contentType = await readFile(`${path}.type`, 'utf8').catch(() => 'application/octet-stream')
    return { body: openStream(path), contentType: contentType.trim(), size: info.size }
  }

  async putAsset(hash: string, data: Uint8Array, contentType: string): Promise<void> {
    const path = this.writable(keys.asset(hash))
    // The type first: an asset that exists always has its type next to it.
    await writeAtomic(`${path}.type`, contentType)
    await writeAtomic(path, data)
  }

  async putManifest(
    channel: string,
    platform: Platform,
    runtimeVersion: string,
    meta: { id: string; createdAt: string },
    stored: StoredManifest,
  ): Promise<void> {
    const body = JSON.stringify(stored)
    await writeAtomic(this.writable(keys.history(channel, platform, runtimeVersion, meta)), body)
    await writeAtomic(this.writable(keys.latest(channel, platform, runtimeVersion)), body)
  }

  async latestManifest(
    channel: string,
    platform: Platform,
    runtimeVersion: string,
  ): Promise<StoredManifest | null> {
    const path = pathIn(this.root, keys.latest(channel, platform, runtimeVersion))
    const text = path && (await readFile(path, 'utf8').catch(() => null))
    return text ? parseStored(text) : null
  }
}

/** Install-link folders under `<data>/app`, uploaded by the publishers over SSH. */
export class FsBuildsStore implements BuildsStore {
  constructor(private readonly root: string) {}

  async get(key: string): Promise<StoredFile | null> {
    const path = pathIn(this.root, key)
    if (!path) return null
    const info = await sizeOf(path)
    if (!info) return null
    return {
      size: info.size,
      etag: `"${info.size.toString(16)}-${Math.trunc(info.mtimeMs).toString(16)}"`,
      stream: () => openStream(path),
      text: () => readFile(path, 'utf8'),
    }
  }
}

/** Both stores under one data directory. */
export function fsStores(dataDir: string): { updates: FsUpdatesStore; builds: FsBuildsStore } {
  return {
    updates: new FsUpdatesStore(join(dataDir, 'updates')),
    builds: new FsBuildsStore(join(dataDir, 'app')),
  }
}

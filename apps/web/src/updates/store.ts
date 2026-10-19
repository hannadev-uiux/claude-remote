import type { Platform } from './protocol.ts'

/** What a publish stores and the manifest endpoint replays: the exact signed string and its signature. */
export type StoredManifest = { manifest: string; signature: string }
export type StoredAsset = { body: ReadableStream | Uint8Array; contentType: string; size: number }

/** Where updates live; R2 in the Worker, a Map in the tests. */
export interface UpdatesStore {
  hasAsset(hash: string): Promise<boolean>
  getAsset(hash: string): Promise<StoredAsset | null>
  /** Callers check the hash first; storing the same hash again is harmless. */
  putAsset(hash: string, data: Uint8Array, contentType: string): Promise<void>
  putManifest(
    channel: string,
    platform: Platform,
    runtimeVersion: string,
    meta: { id: string; createdAt: string },
    stored: StoredManifest,
  ): Promise<void>
  latestManifest(channel: string, platform: Platform, runtimeVersion: string): Promise<StoredManifest | null>
}

/** Storage keys; channel, platform, runtime and hash are validated before they get here. */
export const keys = {
  asset: (hash: string) => `assets/${hash}`,
  /** Compact UTC stamp first, so a channel's history lists in publish order. */
  history: (channel: string, platform: Platform, runtime: string, meta: { id: string; createdAt: string }) =>
    `manifests/${channel}/${platform}/${runtime}/${new Date(meta.createdAt).toISOString().replace(/[-:.]/g, '')}-${meta.id}.json`,
  latest: (channel: string, platform: Platform, runtime: string) =>
    `latest/${channel}/${platform}/${runtime}.json`,
}

function parseStored(text: string): StoredManifest | null {
  try {
    const value = JSON.parse(text) as Partial<StoredManifest>
    return typeof value.manifest === 'string' && typeof value.signature === 'string'
      ? { manifest: value.manifest, signature: value.signature }
      : null
  } catch {
    return null
  }
}

/**
 * R2 layout: `assets/<hash>` (content type in the HTTP metadata), every publish under
 * `manifests/…` and the newest one per channel, platform and runtime under `latest/…`, written
 * after the history entry so a reader never sees a pointer without its history.
 */
export class R2UpdatesStore implements UpdatesStore {
  constructor(private readonly bucket: R2Bucket) {}

  async hasAsset(hash: string): Promise<boolean> {
    return (await this.bucket.head(keys.asset(hash))) !== null
  }

  async getAsset(hash: string): Promise<StoredAsset | null> {
    const object = await this.bucket.get(keys.asset(hash))
    if (!object) return null
    return {
      body: object.body,
      contentType: object.httpMetadata?.contentType ?? 'application/octet-stream',
      size: object.size,
    }
  }

  async putAsset(hash: string, data: Uint8Array, contentType: string): Promise<void> {
    await this.bucket.put(keys.asset(hash), data, { httpMetadata: { contentType } })
  }

  async putManifest(
    channel: string,
    platform: Platform,
    runtimeVersion: string,
    meta: { id: string; createdAt: string },
    stored: StoredManifest,
  ): Promise<void> {
    const body = JSON.stringify(stored)
    const httpMetadata = { contentType: 'application/json' }
    await this.bucket.put(keys.history(channel, platform, runtimeVersion, meta), body, { httpMetadata })
    await this.bucket.put(keys.latest(channel, platform, runtimeVersion), body, { httpMetadata })
  }

  async latestManifest(
    channel: string,
    platform: Platform,
    runtimeVersion: string,
  ): Promise<StoredManifest | null> {
    const object = await this.bucket.get(keys.latest(channel, platform, runtimeVersion))
    return object ? parseStored(await object.text()) : null
  }
}

import type { Platform } from './protocol.ts'

/** What a publish stores and the manifest endpoint replays: the exact signed string and its signature. */
export type StoredManifest = { manifest: string; signature: string }
export type StoredAsset = { body: ReadableStream | Uint8Array; contentType: string; size: number }

/** Where updates live; files in the server's data directory, a Map in the tests. */
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

/** The stored `{ manifest, signature }`, or null when the file is not one. */
export function parseStored(text: string): StoredManifest | null {
  try {
    const value = JSON.parse(text) as Partial<StoredManifest>
    return typeof value.manifest === 'string' && typeof value.signature === 'string'
      ? { manifest: value.manifest, signature: value.signature }
      : null
  } catch {
    return null
  }
}

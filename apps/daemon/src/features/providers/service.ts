import {
  type ModelInfo,
  ModelInfoSchema,
  type Profile,
  type Provider,
  type ProviderCredits,
} from '@remote-harness/protocol'
import { z } from 'zod'
import { DaemonError } from '../../core/errors.ts'
import type { Logger } from '../../core/logger.ts'
import { readJsonFile, writeJsonAtomic } from '../../infra/fs.ts'
import { parseCredits, parseModels, providerBaseUrl } from './openrouter.ts'

/** How long a fetched catalog is served without asking the provider again. */
export const MODELS_TTL_MS = 60 * 60 * 1000

/** The subset of `fetch` the service uses; injected in tests. */
export type ProviderFetch = (
  url: string,
  init?: { headers?: Record<string, string> },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>

export type ModelsResult = { profileId: string; models: ModelInfo[]; fetchedAt: string; stale: boolean }
export type ProviderStatus = { profileId: string; hasKey: boolean; credits: ProviderCredits | null }

const CacheEntrySchema = z.object({
  baseUrl: z.string(),
  fetchedAt: z.string(),
  models: z.array(ModelInfoSchema),
})
const CacheFileSchema = z.object({ entries: z.array(CacheEntrySchema) })
type CacheEntry = z.infer<typeof CacheEntrySchema>

export type ProviderServiceDeps = {
  profiles: readonly Profile[]
  fetch: ProviderFetch
  /** The profile's provider key from the OS store, `null` when none is stored. Only ever sent to the provider. */
  key: (profileId: string) => Promise<string | null>
  cachePath: string
  logger: Logger
  now?: () => number
}

/** Model catalogs and credits of the profiles' providers; one catalog per base URL. */
export class ProviderService {
  private readonly cache = new Map<string, CacheEntry>()
  private loading: Promise<void> | null = null

  constructor(private readonly deps: ProviderServiceDeps) {}

  private resolve(profileId: string): Provider {
    const profile = this.deps.profiles.find((p) => p.id === profileId)
    if (!profile) throw new DaemonError('not_found', `profile ${profileId} not found`)
    if (!profile.provider) throw new DaemonError('bad_request', `profile ${profileId} has no provider`)
    return profile.provider
  }

  private now(): number {
    return (this.deps.now ?? Date.now)()
  }

  /** The on-disk cache, read once; a missing or unreadable file is an empty cache. */
  private load(): Promise<void> {
    this.loading ??= readJsonFile(this.deps.cachePath)
      .then((raw) => {
        const parsed = CacheFileSchema.safeParse(raw)
        if (!parsed.success) return
        for (const entry of parsed.data.entries) this.cache.set(entry.baseUrl, entry)
      })
      .catch(() => undefined)
    return this.loading
  }

  private async persist(): Promise<void> {
    await writeJsonAtomic(this.deps.cachePath, { entries: [...this.cache.values()] }).catch((error: Error) =>
      this.deps.logger.warn({ error: error.message }, 'could not save the models cache'),
    )
  }

  /** Fresh within the TTL, else fetched; the cached list (stale) when the provider cannot be reached. */
  async models(profileId: string): Promise<ModelsResult> {
    const provider = this.resolve(profileId)
    await this.load()
    const baseUrl = providerBaseUrl(provider)
    const cached = this.cache.get(baseUrl)
    const now = this.now()
    if (cached && now - Date.parse(cached.fetchedAt) < MODELS_TTL_MS) {
      return { profileId, models: cached.models, fetchedAt: cached.fetchedAt, stale: false }
    }
    try {
      const response = await this.deps.fetch(`${baseUrl}/v1/models`, {
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const entry: CacheEntry = {
        baseUrl,
        fetchedAt: new Date(now).toISOString(),
        models: parseModels(await response.json()),
      }
      this.cache.set(baseUrl, entry)
      await this.persist()
      return { profileId, models: entry.models, fetchedAt: entry.fetchedAt, stale: false }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      if (cached) {
        this.deps.logger.warn({ baseUrl, reason }, 'models fetch failed, serving the cached list')
        return { profileId, models: cached.models, fetchedAt: cached.fetchedAt, stale: true }
      }
      throw new DaemonError('internal', `could not list the provider's models: ${reason}`)
    }
  }

  /** Whether a key is stored and, with one, the account's credits (`null` when the call fails). */
  async status(profileId: string): Promise<ProviderStatus> {
    const provider = this.resolve(profileId)
    const key = await this.deps.key(profileId).catch(() => null)
    if (!key) return { profileId, hasKey: false, credits: null }
    try {
      const response = await this.deps.fetch(`${providerBaseUrl(provider)}/v1/credits`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${key}` },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return { profileId, hasKey: true, credits: parseCredits(await response.json()) }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      this.deps.logger.warn({ profileId, reason }, 'provider credits unavailable')
      return { profileId, hasKey: true, credits: null }
    }
  }
}

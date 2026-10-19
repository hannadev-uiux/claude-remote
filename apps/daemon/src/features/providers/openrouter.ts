import type { ModelInfo, Provider, ProviderCredits } from '@remote-harness/protocol'
import { z } from 'zod'

export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api'

/** The gateway's base URL without a trailing slash (`/v1/…` is appended to it). */
export function providerBaseUrl(provider: Pick<Provider, 'baseUrl'>): string {
  return (provider.baseUrl ?? OPENROUTER_BASE_URL).replace(/\/+$/, '')
}

/**
 * Environment that points Claude Code at the gateway. The key is not here: the launcher reads it
 * from the OS secret store inside the tmux window (`ANTHROPIC_AUTH_TOKEN`).
 */
export function providerEnv(provider: Provider): Record<string, string> {
  const env: Record<string, string> = { ANTHROPIC_BASE_URL: providerBaseUrl(provider) }
  if (provider.model) env.ANTHROPIC_MODEL = provider.model
  if (provider.smallFastModel) env.ANTHROPIC_SMALL_FAST_MODEL = provider.smallFastModel
  return env
}

const ModelEntry = z.looseObject({
  id: z.string().min(1),
  name: z.string().optional(),
  context_length: z.number().nullable().optional(),
  pricing: z.record(z.string(), z.unknown()).nullable().optional(),
  supported_parameters: z.array(z.string()).nullable().optional(),
  architecture: z
    .looseObject({
      input_modalities: z.array(z.string()).optional(),
      output_modalities: z.array(z.string()).optional(),
    })
    .nullable()
    .optional(),
})
const ModelsResponse = z.object({ data: z.array(z.unknown()) })

/** `"0.000003"` per token → 3 per million tokens; `null` for missing or unparsable prices. */
export function perMillion(price: unknown): number | null {
  const value = typeof price === 'number' ? price : typeof price === 'string' ? Number(price) : Number.NaN
  if (!Number.isFinite(value) || value < 0) return null
  return Math.round(value * 1_000_000 * 1_000) / 1_000
}

/**
 * Text-in/text-out models of `GET /v1/models`, sorted by id. Entries that do not parse are skipped,
 * not fatal: the catalog is large and its shape is the provider's to change.
 */
export function parseModels(body: unknown): ModelInfo[] {
  const parsed = ModelsResponse.safeParse(body)
  if (!parsed.success) throw new Error('unexpected models response')
  const models: ModelInfo[] = []
  for (const raw of parsed.data.data) {
    const entry = ModelEntry.safeParse(raw)
    if (!entry.success) continue
    const m = entry.data
    const inputs = m.architecture?.input_modalities
    const outputs = m.architecture?.output_modalities
    if ((inputs && !inputs.includes('text')) || (outputs && !outputs.includes('text'))) continue
    const params = m.supported_parameters ?? []
    const pricing = m.pricing ?? {}
    const contextLength =
      typeof m.context_length === 'number' && m.context_length > 0 ? Math.round(m.context_length) : null
    models.push({
      id: m.id,
      name: m.name?.trim() || m.id,
      contextLength,
      promptPrice: perMillion(pricing.prompt),
      completionPrice: perMillion(pricing.completion),
      tools: params.includes('tools'),
      reasoning: params.includes('reasoning') || params.includes('include_reasoning'),
      caching: perMillion(pricing.input_cache_read) !== null,
    })
  }
  return models.sort((a, b) => a.id.localeCompare(b.id))
}

const CreditsResponse = z.object({
  data: z.object({ total_credits: z.number(), total_usage: z.number() }),
})

/** `GET /v1/credits` → credits bought and used, or `null` when the shape is not the known one. */
export function parseCredits(body: unknown): ProviderCredits | null {
  const parsed = CreditsResponse.safeParse(body)
  return parsed.success ? { total: parsed.data.data.total_credits, used: parsed.data.data.total_usage } : null
}

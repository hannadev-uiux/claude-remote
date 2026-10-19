import { type ModelInfo, PROVIDER_NAMES, type Profile, type ProviderCredits } from '@remote-harness/protocol'
import type { TFunction } from '@/core/i18n/create'
import { formatTokens } from '@/features/session-status/logic'

/** The provider's product name (`OpenRouter`), or `null` for the Anthropic account. */
export function providerName(profile: Pick<Profile, 'provider'> | null | undefined): string | null {
  return profile?.provider ? PROVIDER_NAMES[profile.provider.kind] : null
}

/** Models whose id or name contains every word of `query` (case-insensitive); all of them for an empty query. */
export function filterModels(models: readonly ModelInfo[], query: string): ModelInfo[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return [...models]
  return models.filter((model) => {
    const haystack = `${model.id} ${model.name}`.toLowerCase()
    return words.every((word) => haystack.includes(word))
  })
}

/** `$3`, `$0.25`, `$1.25`, `$0.075`: two decimals, three when the price has a thousandth, no trailing zeros. */
export function formatPrice(usdPerMillion: number): string {
  const cents = usdPerMillion * 100
  const decimals = Math.abs(cents - Math.round(cents)) < 1e-9 ? 2 : 3
  return `$${usdPerMillion.toFixed(decimals).replace(/\.?0+$/, '')}`
}

/** `200k context · $3 / $15`; parts the provider did not give are left out; `null` when nothing is known. */
export function modelDetail(model: ModelInfo, t: TFunction): string | null {
  const parts: string[] = []
  if (model.contextLength) parts.push(t('modelPicker.context', { tokens: formatTokens(model.contextLength) }))
  if (model.promptPrice !== null && model.completionPrice !== null) {
    parts.push(`${formatPrice(model.promptPrice)} / ${formatPrice(model.completionPrice)}`)
  }
  return parts.length > 0 ? parts.join(' · ') : null
}

/** `tools ✓ thinking ✓ cache ✓`, only the capabilities the model has; `null` with none. */
export function modelCapabilities(model: ModelInfo, t: TFunction): string | null {
  const parts = [
    model.tools ? t('modelPicker.tools') : null,
    model.reasoning ? t('modelPicker.thinking') : null,
    model.caching ? t('modelPicker.cache') : null,
  ].filter((part): part is string => part !== null)
  return parts.length > 0 ? parts.join(' ') : null
}

/** Warnings in the warning color: Claude Code needs tool use; without caching every turn is billed in full. */
export function modelWarnings(model: ModelInfo, t: TFunction): string[] {
  const warnings: string[] = []
  if (!model.tools) warnings.push(t('modelPicker.noTools'))
  if (!model.caching) warnings.push(t('modelPicker.noCaching'))
  return warnings
}

/** Credits still available (never negative), or `null` when unknown. */
export function creditsLeft(credits: ProviderCredits | null | undefined): number | null {
  return credits ? Math.max(0, credits.total - credits.used) : null
}

/** `$42.10`. */
export function formatCredits(amount: number): string {
  return `$${amount.toFixed(2)}`
}

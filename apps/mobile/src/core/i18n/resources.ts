import type { Locale } from '@claude-remote/protocol'
import enUS, { type Messages } from './locales/en-US'
import esES from './locales/es-ES'
import ptBR from './locales/pt-BR'

export type { Messages }

/**
 * Portuguese and Spanish use the `many` plural category for millions ("1 000 000 de líneas"); the
 * catalogs only write `_one`/`_other`, so `_many` reuses `_other` instead of falling back to en-US.
 */
export function withManyPlurals<T>(messages: T): T {
  if (!messages || typeof messages !== 'object') return messages
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(messages)) {
    out[key] = withManyPlurals(value)
    const base = key.endsWith('_other') ? key.slice(0, -'_other'.length) : null
    if (base !== null && !(`${base}_many` in messages)) out[`${base}_many`] = value
  }
  return out as T
}

/** Catalogs of every supported locale, in the single `translation` namespace. */
export const resources: Record<Locale, { translation: Messages }> = {
  'en-US': { translation: enUS },
  'pt-BR': { translation: withManyPlurals(ptBR) },
  'es-ES': { translation: withManyPlurals(esES) },
}

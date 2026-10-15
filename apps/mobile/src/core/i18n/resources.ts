import type { Locale } from '@claude-remote/protocol'
import enUS, { type Messages } from './locales/en-US'
import esES from './locales/es-ES'
import ptBR from './locales/pt-BR'

export type { Messages }

/** Catalogs of every supported locale, in the single `translation` namespace. */
export const resources: Record<Locale, { translation: Messages }> = {
  'en-US': { translation: enUS },
  'pt-BR': { translation: ptBR },
  'es-ES': { translation: esES },
}

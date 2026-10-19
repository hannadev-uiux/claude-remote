import { enUS, type WebMessages } from './en-US.ts'
import { esES } from './es-ES.ts'
import type { Locale } from './locale.ts'
import { ptBR } from './pt-BR.ts'

export type { WebMessages } from './en-US.ts'
export {
  DEFAULT_LOCALE,
  LOCALE_PATHS,
  type Locale,
  localeFromPath,
  pickLocale,
  WEB_LOCALES,
} from './locale.ts'

export const CATALOGS: Record<Locale, WebMessages> = { 'en-US': enUS, 'pt-BR': ptBR, 'es-ES': esES }

export function messagesFor(locale: Locale): WebMessages {
  return CATALOGS[locale]
}

import { type Locale, resolveLocale } from '@remote-harness/protocol'
import { envVar } from '../env.ts'
import { enUS, type Messages } from './en-US.ts'
import { esES } from './es-ES.ts'
import { ptBR } from './pt-BR.ts'

export type { Messages } from './en-US.ts'

export const CATALOGS: Record<Locale, Messages> = {
  'en-US': enUS,
  'pt-BR': ptBR,
  'es-ES': esES,
}

/** The catalog of a locale. The active one is injected (setup, CLI, push), never global. */
export function messagesFor(locale: Locale): Messages {
  return CATALOGS[locale]
}

export type I18n = { locale: Locale; m: Messages }

export function createI18n(locale: Locale): I18n {
  return { locale, m: messagesFor(locale) }
}

/**
 * Locale of the environment: `REMOTE_HARNESS_LANG` (set by install.sh), then the POSIX order
 * `LC_ALL`, `LC_MESSAGES`, `LANG`; the first non-empty one wins. Unknown or unset → en-US.
 */
export function systemLocale(env: NodeJS.ProcessEnv = process.env): Locale {
  const tag = [envVar('LANG', env), env.LC_ALL, env.LC_MESSAGES, env.LANG].find((v) => v?.trim())
  return resolveLocale(tag)
}

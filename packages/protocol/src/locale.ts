import { z } from 'zod'

/** Languages of the UI (CLI, setup, push and app). `en-US` is the fallback. */
export const LOCALES = ['pt-BR', 'en-US', 'es-ES'] as const
export const LocaleSchema = z.enum(LOCALES)
export type Locale = z.infer<typeof LocaleSchema>
export const DEFAULT_LOCALE: Locale = 'en-US'

/** Native name of each language, for pickers. */
export const LOCALE_NAMES: Record<Locale, string> = {
  'pt-BR': 'Português (Brasil)',
  'en-US': 'English (US)',
  'es-ES': 'Español',
}

/**
 * Maps a system or device language tag to a supported locale: POSIX (`pt_BR.UTF-8`) or BCP 47
 * (`es-419`). `pt*` → pt-BR, `es*` → es-ES, anything else (or nothing) → en-US.
 */
export function resolveLocale(tag: string | null | undefined): Locale {
  const lang = (tag ?? '')
    .trim()
    .toLowerCase()
    .split(/[-_.@]/)[0]
  if (lang === 'pt') return 'pt-BR'
  if (lang === 'es') return 'es-ES'
  return DEFAULT_LOCALE
}

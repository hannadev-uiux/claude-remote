import { DEFAULT_LOCALE, LOCALES, type Locale } from '@remote-harness/protocol'
import i18next, { type i18n, type Module, type TFunction } from 'i18next'
import { machineName } from './machine'
import { resources } from './resources'

export type { TFunction }

/**
 * Creates an initialized, synchronous i18next instance for `locale`. Free of React Native so pure
 * helpers can be tested with a real catalog; the app adds `initReactI18next` through `plugins`.
 */
export function createI18n(locale: Locale, plugins: readonly Module[] = []): i18n {
  const instance = i18next.createInstance()
  for (const plugin of plugins) instance.use(plugin)
  void instance.init({
    lng: locale,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: LOCALES,
    load: 'currentOnly',
    resources,
    compatibilityJSON: 'v4',
    interpolation: { escapeValue: false },
    // `{{machine}}` / `{{Machine}}` name the paired computer without every call site passing it:
    // the registered name, else the catalog's generic form. An explicit variable still wins.
    missingInterpolationHandler: (text: string, match: unknown) => {
      const variable = Array.isArray(match) ? String(match[1]).trim() : ''
      if (variable === 'machine') return machineName() ?? instance.t('machine.generic')
      if (variable === 'Machine') return machineName() ?? instance.t('machine.genericSentence')
      // Any other missing variable stays as its placeholder (what i18next does by itself): returning
      // the whole text would re-insert every placeholder and grow without bound.
      return Array.isArray(match) ? String(match[0]) : text
    },
    returnNull: false,
    initAsync: false,
  })
  return instance
}

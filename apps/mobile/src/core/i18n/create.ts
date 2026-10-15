import { DEFAULT_LOCALE, LOCALES, type Locale } from '@claude-remote/protocol'
import i18next, { type i18n, type Module, type TFunction } from 'i18next'
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
    returnNull: false,
    initAsync: false,
  })
  return instance
}

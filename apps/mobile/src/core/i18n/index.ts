import type { Locale } from '@claude-remote/protocol'
import { getLocales } from 'expo-localization'
import { initReactI18next } from 'react-i18next'
import { AppState } from 'react-native'
import { createI18n } from './create'
import { deviceLocale } from './device'

export type { TFunction } from './create'

/** App-wide instance, following the phone language (per-app language included). */
export const i18n = createI18n(deviceLocale(getLocales()), [initReactI18next])

// The language can change while the app is in the background; pick it up on return.
AppState.addEventListener('change', (state) => {
  if (state !== 'active') return
  const next = deviceLocale(getLocales())
  if (next !== i18n.language) void i18n.changeLanguage(next)
})

/** Active locale, e.g. for `Intl` formatting. */
export function currentLocale(): Locale {
  return i18n.language as Locale
}

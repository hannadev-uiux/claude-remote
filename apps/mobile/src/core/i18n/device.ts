import { type Locale, resolveLocale } from '@remote-harness/protocol'

/** Locale for the device's preferred languages (`expo-localization` `getLocales()`), first one wins. */
export function deviceLocale(locales: readonly { languageTag: string }[]): Locale {
  return resolveLocale(locales[0]?.languageTag)
}

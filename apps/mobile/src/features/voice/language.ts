import { LOCALES, type Locale } from '@remote-harness/protocol'

/** `'app'` follows the app's current UI language; otherwise a fixed transcription language. */
export type VoiceLanguage = 'app' | Locale

export function isVoiceLanguage(value: unknown): value is VoiceLanguage {
  return value === 'app' || LOCALES.includes(value as Locale)
}

/** The `lang` tag to pass to the speech recognizer; `appLocale` is the caller's `currentLocale()`. */
export function resolveVoiceLanguage(language: VoiceLanguage, appLocale: Locale): Locale {
  return language === 'app' ? appLocale : language
}

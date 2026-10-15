import { describe, expect, test } from 'vitest'
import { LOCALE_NAMES, LOCALES, LocaleSchema, resolveLocale } from '../src/index.ts'

describe('locale', () => {
  test('resolves POSIX and BCP 47 tags to a supported locale', () => {
    expect(resolveLocale('pt_BR.UTF-8')).toBe('pt-BR')
    expect(resolveLocale('pt-PT')).toBe('pt-BR')
    expect(resolveLocale('es-419')).toBe('es-ES')
    expect(resolveLocale('es_MX')).toBe('es-ES')
    expect(resolveLocale('en_GB.UTF-8')).toBe('en-US')
    expect(resolveLocale('fr-FR')).toBe('en-US')
    expect(resolveLocale('C')).toBe('en-US')
    expect(resolveLocale(undefined)).toBe('en-US')
  })

  test('every locale has a name and parses', () => {
    for (const locale of LOCALES) {
      expect(LOCALE_NAMES[locale]).toBeTruthy()
      expect(LocaleSchema.parse(locale)).toBe(locale)
    }
    expect(LocaleSchema.safeParse('fr-FR').success).toBe(false)
  })
})

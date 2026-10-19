import { describe, expect, test } from 'vitest'
import { localeFromPath, pickLocale } from '../src/i18n/locale.ts'

describe('pickLocale', () => {
  test('honours q-values and maps regions to our three languages', () => {
    expect(pickLocale('pt-BR,pt;q=0.9,en;q=0.8')).toBe('pt-BR')
    expect(pickLocale('pt-PT')).toBe('pt-BR')
    expect(pickLocale('es-MX,es;q=0.9')).toBe('es-ES')
    expect(pickLocale('en-GB,en;q=0.9,pt;q=0.8')).toBe('en-US')
    expect(pickLocale('fr-FR,fr;q=0.9,es;q=0.5,en;q=0.4')).toBe('es-ES')
    expect(pickLocale('en;q=0.5, pt;q=0.9')).toBe('pt-BR')
  })

  test('falls back to en-US for unknown, wildcard, empty or malformed headers', () => {
    expect(pickLocale('fr')).toBe('en-US')
    expect(pickLocale('*')).toBe('en-US')
    expect(pickLocale('de, *;q=0.5, pt;q=0.4')).toBe('en-US')
    expect(pickLocale('')).toBe('en-US')
    expect(pickLocale(null)).toBe('en-US')
    expect(pickLocale('pt;q=abc')).toBe('en-US')
    expect(pickLocale('pt;q=0')).toBe('en-US')
  })
})

describe('localeFromPath', () => {
  test('one segment, case-insensitive, with or without the trailing slash', () => {
    expect(localeFromPath('/en/')).toBe('en-US')
    expect(localeFromPath('/en-US')).toBe('en-US')
    expect(localeFromPath('/pt-br/')).toBe('pt-BR')
    expect(localeFromPath('/pt')).toBe('pt-BR')
    expect(localeFromPath('/ES/')).toBe('es-ES')
    expect(localeFromPath('/')).toBeNull()
    expect(localeFromPath('/es/docs')).toBeNull()
    expect(localeFromPath('/english')).toBeNull()
  })
})

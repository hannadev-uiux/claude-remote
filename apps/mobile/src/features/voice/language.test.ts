import { describe, expect, test } from 'vitest'
import { isVoiceLanguage, resolveVoiceLanguage } from './language'

describe('isVoiceLanguage', () => {
  test('accepts "app"', () => {
    expect(isVoiceLanguage('app')).toBe(true)
  })

  test('accepts every catalog locale', () => {
    expect(isVoiceLanguage('pt-BR')).toBe(true)
    expect(isVoiceLanguage('en-US')).toBe(true)
    expect(isVoiceLanguage('es-ES')).toBe(true)
  })

  test('rejects anything else', () => {
    expect(isVoiceLanguage('fr-FR')).toBe(false)
    expect(isVoiceLanguage(null)).toBe(false)
    expect(isVoiceLanguage(undefined)).toBe(false)
    expect(isVoiceLanguage(42)).toBe(false)
  })
})

describe('resolveVoiceLanguage', () => {
  test('a fixed language is returned as-is, ignoring the app locale', () => {
    expect(resolveVoiceLanguage('pt-BR', 'en-US')).toBe('pt-BR')
    expect(resolveVoiceLanguage('es-ES', 'pt-BR')).toBe('es-ES')
  })

  test('"app" follows the given app locale', () => {
    expect(resolveVoiceLanguage('app', 'en-US')).toBe('en-US')
    expect(resolveVoiceLanguage('app', 'pt-BR')).toBe('pt-BR')
  })
})

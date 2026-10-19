import { describe, expect, test } from 'vitest'
import { THEME_NAMES } from './palettes'
import { isThemePreference, resolveThemeName, THEME_PREFERENCES } from './resolve'

describe('resolveThemeName', () => {
  test('system follows the phone: dark mode gets dark, light mode gets light', () => {
    expect(resolveThemeName('system', 'dark')).toBe('dark')
    expect(resolveThemeName('system', 'light')).toBe('light')
  })

  test.each(THEME_NAMES)('an explicit %s ignores the system scheme', (name) => {
    expect(resolveThemeName(name, 'dark')).toBe(name)
    expect(resolveThemeName(name, 'light')).toBe(name)
  })
})

describe('isThemePreference', () => {
  test('accepts system and every theme name', () => {
    expect(THEME_PREFERENCES).toEqual(['system', ...THEME_NAMES])
    for (const value of THEME_PREFERENCES) expect(isThemePreference(value)).toBe(true)
  })

  test('rejects anything else (older or corrupted saved values)', () => {
    expect(isThemePreference(null)).toBe(false)
    expect(isThemePreference('')).toBe(false)
    expect(isThemePreference('solarized')).toBe(false)
    expect(isThemePreference(1)).toBe(false)
  })
})

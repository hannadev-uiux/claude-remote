import { describe, expect, test } from 'vitest'
import { isAppIconPreference, resolveAppIconName } from './app-icon'

describe('resolveAppIconName', () => {
  test('original is always the default icon, whatever the theme', () => {
    expect(resolveAppIconName('original', 'dracula')).toBeNull()
    expect(resolveAppIconName('original', 'dark')).toBeNull()
  })

  test('matchTheme resolves to the current theme', () => {
    expect(resolveAppIconName('matchTheme', 'mocha')).toBe('Mocha')
    expect(resolveAppIconName('matchTheme', 'latte')).toBe('Latte')
  })

  test('a specific theme choice ignores the current theme', () => {
    expect(resolveAppIconName('dracula', 'light')).toBe('Dracula')
  })
})

describe('isAppIconPreference', () => {
  test('accepts matchTheme, original and every theme name', () => {
    expect(isAppIconPreference('matchTheme')).toBe(true)
    expect(isAppIconPreference('original')).toBe(true)
    expect(isAppIconPreference('dark')).toBe(true)
    expect(isAppIconPreference('latte')).toBe(true)
  })

  test('rejects anything else', () => {
    expect(isAppIconPreference('Dark')).toBe(false)
    expect(isAppIconPreference('')).toBe(false)
    expect(isAppIconPreference(null)).toBe(false)
    expect(isAppIconPreference(42)).toBe(false)
  })
})

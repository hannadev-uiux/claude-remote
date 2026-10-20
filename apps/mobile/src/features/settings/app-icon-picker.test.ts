import { describe, expect, test } from 'vitest'
import { createI18n } from '@/core/i18n/create'
import { appIconPreviewKey, appIconRowLabel, appIconRows } from './app-icon-picker'

const en = createI18n('en-US').t

describe('appIconPreviewKey', () => {
  test('matchTheme previews the resolved theme', () => {
    expect(appIconPreviewKey('matchTheme', 'dracula')).toBe('dracula')
  })

  test('every other choice previews itself', () => {
    expect(appIconPreviewKey('original', 'dracula')).toBe('original')
    expect(appIconPreviewKey('mocha', 'dracula')).toBe('mocha')
  })
})

describe('appIconRows', () => {
  test('Match theme leads the list', () => {
    const rows = appIconRows('matchTheme', en)
    expect(rows.map((r) => r.choice)).toEqual([
      'matchTheme',
      'original',
      'dark',
      'light',
      'dracula',
      'mocha',
      'latte',
    ])
    expect(rows[0]).toEqual({ choice: 'matchTheme', label: 'Match theme', selected: true })
  })

  test('marks the explicit preference as selected, not Match theme', () => {
    const rows = appIconRows('dracula', en)
    expect(rows.find((r) => r.choice === 'matchTheme')?.selected).toBe(false)
    expect(rows.find((r) => r.choice === 'dracula')).toEqual({
      choice: 'dracula',
      label: 'Dracula',
      selected: true,
    })
  })
})

describe('appIconRowLabel', () => {
  test('names the preference', () => {
    expect(appIconRowLabel('mocha', en)).toBe('App icon · Catppuccin Mocha')
    expect(appIconRowLabel('matchTheme', en)).toBe('App icon · Match theme')
    expect(appIconRowLabel('original', en)).toBe('App icon · Original')
  })
})

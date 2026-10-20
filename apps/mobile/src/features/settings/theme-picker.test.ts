import { describe, expect, test } from 'vitest'
import { createI18n } from '@/core/i18n/create'
import { themeRowLabel, themeRows } from './theme-picker'

const en = createI18n('en-US').t

describe('themeRows', () => {
  test('System resolves its tag from the system scheme and leads the list', () => {
    const rows = themeRows('system', 'light', en)
    expect(rows[0]).toEqual({ choice: 'system', label: 'System', tag: 'Light', selected: true })
    expect(rows.map((r) => r.choice)).toEqual(['system', 'dark', 'light', 'dracula', 'mocha', 'latte'])
  })

  test('System resolves to Dark in dark mode', () => {
    expect(themeRows('system', 'dark', en)[0]).toMatchObject({ tag: 'Dark' })
  })

  test('marks the explicit preference as selected, not System', () => {
    const rows = themeRows('dracula', 'light', en)
    expect(rows.find((r) => r.choice === 'system')?.selected).toBe(false)
    expect(rows.find((r) => r.choice === 'dracula')).toMatchObject({
      label: 'Dracula',
      tag: 'Dark',
      selected: true,
    })
  })
})

describe('themeRowLabel', () => {
  test('names the resolved theme', () => {
    expect(themeRowLabel('mocha', 'light', en)).toBe('Theme · Catppuccin Mocha')
    expect(themeRowLabel('system', 'dark', en)).toBe('Theme · Dark')
  })
})

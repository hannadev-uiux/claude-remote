import { describe, expect, test } from 'vitest'
import { ANSI_NAMES, dark } from '../../core/theme/palettes'
import { xtermTheme } from './xterm-theme'

describe('xtermTheme', () => {
  test('maps the app theme to the xterm.js theme keys', () => {
    const theme = xtermTheme(dark)
    expect(Object.keys(theme).sort()).toEqual(
      ['background', 'foreground', 'cursor', 'selectionBackground', ...ANSI_NAMES].sort(),
    )
    expect(theme.background).toBe(dark.colors.background)
    expect(theme.foreground).toBe(dark.colors.text)
    expect(theme.cursor).toBe(dark.colors.accent)
    expect(theme.selectionBackground).toBe(dark.colors.accentSoft)
    expect(theme.brightWhite).toBe(dark.ansi.brightWhite)
  })
})

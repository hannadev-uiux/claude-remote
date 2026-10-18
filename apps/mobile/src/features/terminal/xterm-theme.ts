import type { AnsiColors, Theme } from '../../core/theme/palettes'

/** xterm.js `ITheme` built from the app theme (the 16 ANSI colors plus the page colors). */
export type XtermTheme = AnsiColors & {
  background: string
  foreground: string
  cursor: string
  selectionBackground: string
}

export function xtermTheme(theme: Theme): XtermTheme {
  return {
    background: theme.colors.background,
    foreground: theme.colors.text,
    cursor: theme.colors.accent,
    selectionBackground: theme.colors.accentSoft,
    ...theme.ansi,
  }
}

import { type ColorScheme, THEME_NAMES, type ThemeName } from './palettes'

/** What the user picked in Settings: a theme, or `system` to follow the phone's light/dark mode. */
export type ThemePreference = 'system' | ThemeName

export const THEME_PREFERENCES: readonly ThemePreference[] = ['system', ...THEME_NAMES]

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value)
}

/** Theme used for each system scheme when the preference is `system` (no light theme yet). */
const SYSTEM_THEME: Record<ColorScheme, ThemeName> = { dark: 'dark', light: 'dark' }

export function resolveThemeName(preference: ThemePreference, system: ColorScheme): ThemeName {
  return preference === 'system' ? SYSTEM_THEME[system] : preference
}

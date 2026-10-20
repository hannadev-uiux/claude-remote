import type { TFunction } from '@/core/i18n/create'
import { type ColorScheme, THEME_NAMES, THEMES } from '@/core/theme/palettes'
import { resolveThemeName, type ThemePreference } from '@/core/theme/resolve'

/** One row of the theme picker modal, in display order (System first). */
export type ThemeRow = {
  choice: ThemePreference
  label: string
  tag: string
  selected: boolean
}

const PICKER_CHOICES: readonly ThemePreference[] = ['system', ...THEME_NAMES]

/** Rows for the picker modal: label, light/dark tag of the resolved theme, and the selected one. */
export function themeRows(preference: ThemePreference, system: ColorScheme, t: TFunction): ThemeRow[] {
  return PICKER_CHOICES.map((choice) => {
    const resolved = resolveThemeName(choice, system)
    return {
      choice,
      label: t(`settings.themes.${choice}`),
      tag: t(`settings.themeTag.${THEMES[resolved].scheme}`),
      selected: choice === preference,
    }
  })
}

/** "Theme · Dracula": the Appearance card's select row label and accessibility label. */
export function themeRowLabel(preference: ThemePreference, system: ColorScheme, t: TFunction): string {
  const resolved = resolveThemeName(preference, system)
  return t('settings.theme', { theme: t(`settings.themes.${resolved}`) })
}

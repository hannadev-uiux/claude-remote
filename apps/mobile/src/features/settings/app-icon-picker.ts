import type { TFunction } from '@/core/i18n/create'
import type { ThemeName } from '@/core/theme/palettes'
import { APP_ICON_PREFERENCES, type AppIconPreference } from './app-icon'

/** Which preview PNG a choice shows: itself, or (for `matchTheme`) the resolved theme's. */
export function appIconPreviewKey(
  choice: AppIconPreference,
  resolvedTheme: ThemeName,
): Exclude<AppIconPreference, 'matchTheme'> {
  return choice === 'matchTheme' ? resolvedTheme : choice
}

function appIconChoiceLabel(choice: AppIconPreference, t: TFunction): string {
  if (choice === 'matchTheme') return t('settings.appIcon.matchTheme')
  if (choice === 'original') return t('settings.appIcon.original')
  return t(`settings.themes.${choice}`)
}

export type AppIconRow = { choice: AppIconPreference; label: string; selected: boolean }

/** Rows for the picker modal, in display order (Match theme first). */
export function appIconRows(preference: AppIconPreference, t: TFunction): AppIconRow[] {
  return APP_ICON_PREFERENCES.map((choice) => ({
    choice,
    label: appIconChoiceLabel(choice, t),
    selected: choice === preference,
  }))
}

/** "App icon · Dracula": the card's select row label and accessibility label. */
export function appIconRowLabel(preference: AppIconPreference, t: TFunction): string {
  return t('settings.appIcon.row', { icon: appIconChoiceLabel(preference, t) })
}

import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'
import { type ColorScheme, THEMES, type Theme } from './palettes'
import { isThemePreference, resolveThemeName, type ThemePreference } from './resolve'

const THEME_KEY = 'remote-harness.theme'

export type ThemeState = {
  /** Saved on the device; `system` by default. */
  preference: ThemePreference
  /** The phone's light/dark mode, mirrored by `ThemeProvider`. */
  system: ColorScheme
}

export const useThemeStore = create<ThemeState>(() => ({ preference: 'system', system: 'dark' }))

/** The theme the preference and the system scheme resolve to (a stable module constant). */
export function selectTheme(state: ThemeState): Theme {
  return THEMES[resolveThemeName(state.preference, state.system)]
}

/** Current theme for code outside React (e.g. props built in effects). */
export function currentTheme(): Theme {
  return selectTheme(useThemeStore.getState())
}

/** Loads the persisted choice; called once at app start. */
export async function restoreThemePreference(): Promise<void> {
  const saved = await SecureStore.getItemAsync(THEME_KEY).catch(() => null)
  if (isThemePreference(saved)) useThemeStore.setState({ preference: saved })
}

export async function setThemePreference(preference: ThemePreference): Promise<void> {
  useThemeStore.setState({ preference })
  await SecureStore.setItemAsync(THEME_KEY, preference).catch(() => undefined)
}

export function setSystemScheme(system: ColorScheme): void {
  if (useThemeStore.getState().system !== system) useThemeStore.setState({ system })
}

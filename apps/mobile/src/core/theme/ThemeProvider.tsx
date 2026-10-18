import { StatusBar } from 'expo-status-bar'
import * as SystemUI from 'expo-system-ui'
import { type ReactNode, useEffect } from 'react'
import { Appearance, useColorScheme } from 'react-native'
import { setSystemScheme, useThemeStore } from './store'
import { useTheme } from './use-theme'

/**
 * Mirrors the phone's light/dark mode into the theme store, paints the root view with the theme
 * background (what shows behind transitions and the keyboard), styles the status bar for it and,
 * with an explicit theme, makes the native surfaces (alerts, action sheets, keyboard) follow its
 * scheme; with "System" the phone keeps deciding.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme()
  const preference = useThemeStore((s) => s.preference)
  const theme = useTheme()

  useEffect(() => {
    setSystemScheme(system === 'light' ? 'light' : 'dark')
  }, [system])

  useEffect(() => {
    // `unspecified` hands the scheme back to the phone.
    Appearance.setColorScheme(preference === 'system' ? 'unspecified' : theme.scheme)
  }, [preference, theme.scheme])

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.colors.background).catch(() => undefined)
  }, [theme])

  return (
    <>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      {children}
    </>
  )
}

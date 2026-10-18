import { StatusBar } from 'expo-status-bar'
import * as SystemUI from 'expo-system-ui'
import { type ReactNode, useEffect } from 'react'
import { useColorScheme } from 'react-native'
import { setSystemScheme } from './store'
import { useTheme } from './use-theme'

/**
 * Mirrors the phone's light/dark mode into the theme store, paints the root view with the theme
 * background (what shows behind transitions and the keyboard) and styles the status bar for it.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme()
  const theme = useTheme()

  useEffect(() => {
    setSystemScheme(system === 'light' ? 'light' : 'dark')
  }, [system])

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

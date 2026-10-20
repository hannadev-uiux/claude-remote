import {
  getAppIconName,
  resetAppIcon,
  setAlternateAppIcon,
  supportsAlternateIcons,
} from 'expo-alternate-app-icons'
import * as SecureStore from 'expo-secure-store'
import { useEffect, useRef } from 'react'
import { AppState, Platform } from 'react-native'
import { create } from 'zustand'
import { resolveThemeName, useThemeStore } from '@/core/theme'
import { type AppIconPreference, isAppIconPreference, resolveAppIconName } from './app-icon'

const KEY = 'remote-harness.app-icon'

export const useAppIconStore = create<{ preference: AppIconPreference }>(() => ({
  preference: 'matchTheme',
}))

/** Loads the saved preference; called once at app start. */
export async function restoreAppIconPreference(): Promise<void> {
  const saved = await SecureStore.getItemAsync(KEY).catch(() => null)
  if (isAppIconPreference(saved)) useAppIconStore.setState({ preference: saved })
}

export async function setAppIconPreference(preference: AppIconPreference): Promise<void> {
  useAppIconStore.setState({ preference })
  await SecureStore.setItemAsync(KEY, preference).catch(() => undefined)
}

async function applyIcon(name: string | null): Promise<void> {
  try {
    if (name === null) await resetAppIcon()
    else await setAlternateAppIcon(name)
  } catch {
    // Unsupported device/OS version, or the user dismissed iOS's confirmation — nothing to recover.
  }
}

/**
 * Applies the preference to the real app icon (root layout, once). iOS shows a system alert on
 * every change, so it only ever applies right when the preference or the resolved theme changes —
 * never on a timer or in the background. Android instead waits for the app to background, since the
 * launcher can take a moment and may close the app on some devices (#233).
 */
export function useApplyAppIcon(): void {
  const preference = useAppIconStore((s) => s.preference)
  const resolvedTheme = useThemeStore((s) => resolveThemeName(s.preference, s.system))
  const pendingAndroid = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    if (!supportsAlternateIcons) return
    const target = resolveAppIconName(preference, resolvedTheme)
    if (target === getAppIconName()) return
    if (Platform.OS === 'android') {
      pendingAndroid.current = target
      return
    }
    void applyIcon(target)
  }, [preference, resolvedTheme])

  useEffect(() => {
    if (Platform.OS !== 'android') return
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'background') return
      const target = pendingAndroid.current
      if (target === undefined || target === getAppIconName()) return
      pendingAndroid.current = undefined
      void applyIcon(target)
    })
    return () => subscription.remove()
  }, [])
}

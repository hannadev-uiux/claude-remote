import {
  JetBrainsMono_400Regular,
  JetBrainsMono_400Regular_Italic,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
  useFonts,
} from '@expo-google-fonts/jetbrains-mono'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ConnectionProvider, useConnectionStore } from '@/core/connection'
import '@/core/i18n'
import { restoreThemePreference, ThemeProvider, useTheme } from '@/core/theme'
import { useBackgroundUpdates } from '@/core/updates'
import { restoreFollow } from '@/features/conversation/follow-store'
import { restoreKeyBar } from '@/features/conversation/key-bar-store'
import { restoreKeyboardToolbar } from '@/features/conversation/keyboard-toolbar-store'
import { restoreToolTabs } from '@/features/conversation/tool-tab-store'
import { restoreLiveStatusSetting } from '@/features/live-status/settings-store'
import { restoreMachineAlias, useMachineNameSync } from '@/features/settings/machine-store'
import { stackScreenOptions } from '@/ui'

void SplashScreen.preventAutoHideAsync()

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 10_000 } },
})

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    JetBrainsMono_400Regular,
    JetBrainsMono_400Regular_Italic,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  })
  const credentialsLoaded = useConnectionStore((s) => s.credentialsLoaded)
  const ready = fontsLoaded && credentialsLoaded
  useBackgroundUpdates()

  useEffect(() => {
    void restoreThemePreference()
    void restoreMachineAlias()
    void restoreKeyBar()
    void restoreKeyboardToolbar()
    void restoreFollow()
    void restoreToolTabs()
    void restoreLiveStatusSetting()
  }, [])

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync()
  }, [ready])

  return (
    <ThemeProvider>
      <Shell ready={ready} />
    </ThemeProvider>
  )
}

/** Providers and the root navigator, painted with the current theme. */
function Shell({ ready }: { ready: boolean }) {
  const { t } = useTranslation()
  const theme = useTheme()
  useMachineNameSync()
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ConnectionProvider>
            {ready ? (
              <Stack screenOptions={stackScreenOptions(theme)}>
                <Stack.Screen name="(main)" options={{ headerShown: false }} />
                <Stack.Screen name="pair" options={{ title: t('nav.pair'), presentation: 'modal' }} />
                <Stack.Screen
                  name="setup-guide"
                  options={{ title: t('nav.setupGuide'), presentation: 'modal' }}
                />
              </Stack>
            ) : null}
          </ConnectionProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

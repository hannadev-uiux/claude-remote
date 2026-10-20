import {
  JetBrainsMono_400Regular,
  JetBrainsMono_400Regular_Italic,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
  useFonts,
} from '@expo-google-fonts/jetbrains-mono'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ErrorBoundaryProps, Stack, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ConnectionProvider, useConnectionStore } from '@/core/connection'
import '@/core/i18n'
import { restoreThemePreference, ThemeProvider, useTheme } from '@/core/theme'
import { useBackgroundUpdates } from '@/core/updates'
import { restoreCommandRecents } from '@/features/autocomplete/recents-store'
import { restoreAutocorrectSetting } from '@/features/conversation/autocorrect-store'
import { restoreFollow } from '@/features/conversation/follow-store'
import { restoreKeyBar } from '@/features/conversation/key-bar-store'
import { restoreKeyboardToolbar } from '@/features/conversation/keyboard-toolbar-store'
import { restoreReturnKeySettings } from '@/features/conversation/return-key-store'
import { restoreToolTabs } from '@/features/conversation/tool-tab-store'
import { bindDrafts } from '@/features/drafts/persistence'
import { installErrorCapture, setRoute } from '@/features/error-reports/capture'
import { CrashPromptSheet } from '@/features/error-reports/components/CrashPromptSheet'
import { ErrorFallback } from '@/features/error-reports/components/ErrorFallback'
import { restoreOpenAfterCreateSettings } from '@/features/lifecycle/open-after-create-store'
import { restoreLiveStatusSetting } from '@/features/live-status/settings-store'
import { restorePerformanceSetting } from '@/features/performance/store'
import { usePerformanceMonitoring } from '@/features/performance/use-performance'
import { restorePushSettings } from '@/features/push/push-settings-store'
import { restoreSessionPrefs } from '@/features/sessions/prefs-store'
import { restoreSessionSort } from '@/features/sessions/sort-store'
import { restoreAppIconPreference, useApplyAppIcon } from '@/features/settings/app-icon-store'
import { restoreMachineAlias, useMachineNameSync } from '@/features/settings/machine-store'
import { stackScreenOptions } from '@/ui'

void SplashScreen.preventAutoHideAsync()
// Before anything renders, so a crash at start-up is recorded too.
installErrorCapture()

/** Render errors anywhere in the app (Expo Router error boundary of the root route). */
export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <ErrorFallback {...props} />
}

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
  usePerformanceMonitoring()

  useEffect(() => {
    void restorePerformanceSetting()
    void restoreThemePreference()
    void restoreAppIconPreference()
    void restoreMachineAlias()
    void restoreSessionSort()
    void restoreSessionPrefs()
    void restorePushSettings()
    void restoreOpenAfterCreateSettings()
    void restoreReturnKeySettings()
    void restoreAutocorrectSetting()
    void restoreKeyBar()
    void restoreKeyboardToolbar()
    void restoreFollow()
    void restoreToolTabs()
    void restoreLiveStatusSetting()
    void restoreCommandRecents()
  }, [])

  // Restores the unsent prompts saved on this device and keeps saving them.
  useEffect(() => bindDrafts(), [])

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
  const segments = useSegments()
  useMachineNameSync()
  useApplyAppIcon()
  useEffect(() => setRoute(segments), [segments])
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
            <CrashPromptSheet />
          </ConnectionProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

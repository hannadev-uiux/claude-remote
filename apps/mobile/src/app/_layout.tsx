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
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ConnectionProvider, useConnectionStore } from '@/core/connection'
import { colors, fonts } from '@/core/theme'

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

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync()
  }, [ready])

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ConnectionProvider>
            <StatusBar style="light" />
            {ready ? (
              <Stack
                screenOptions={{
                  headerStyle: { backgroundColor: colors.background },
                  headerTintColor: colors.text,
                  headerTitleStyle: { fontFamily: fonts.bold, fontSize: 16 },
                  headerShadowVisible: false,
                  contentStyle: { backgroundColor: colors.background },
                  headerBackButtonDisplayMode: 'minimal',
                }}
              >
                <Stack.Screen name="(main)" options={{ headerShown: false }} />
                <Stack.Screen name="pair" options={{ title: 'Parear', presentation: 'modal' }} />
                <Stack.Screen
                  name="setup-guide"
                  options={{ title: 'Primeira configuração', presentation: 'modal' }}
                />
              </Stack>
            ) : null}
          </ConnectionProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

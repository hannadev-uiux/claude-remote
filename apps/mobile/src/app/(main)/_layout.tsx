import { Redirect, Stack } from 'expo-router'
import { useConnectionStore } from '@/core/connection'
import { colors, fonts } from '@/core/theme'
import { usePush } from '@/features/push/use-push'
import { useDaemonSync } from '@/features/sync/use-daemon-sync'

/** Everything under (main) requires a paired daemon. */
export default function MainLayout() {
  const credentials = useConnectionStore((s) => s.credentials)
  useDaemonSync()
  usePush()
  if (!credentials) return <Redirect href="/pair" />
  return (
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
      <Stack.Screen name="index" options={{ title: 'Claude Remote' }} />
      <Stack.Screen name="settings" options={{ title: 'Configurações' }} />
      <Stack.Screen name="new" options={{ title: 'Nova sessão', presentation: 'modal' }} />
      <Stack.Screen name="session/[id]/index" options={{ title: '' }} />
      <Stack.Screen name="session/[id]/terminal" options={{ title: 'Terminal' }} />
      <Stack.Screen name="session/[id]/agent/[agentId]" options={{ title: 'Subagente' }} />
    </Stack>
  )
}

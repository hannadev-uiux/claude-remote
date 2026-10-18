import { Redirect, router, Stack, usePathname } from 'expo-router'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TextInput, View } from 'react-native'
import { addListener, constants } from 'react-native-key-command'
import { useShallow } from 'zustand/react/shallow'
import { useConnectionStore } from '@/core/connection'
import { useWidthClass, type WidthClass } from '@/core/layout'
import { space, useTheme } from '@/core/theme'
import { useLiveStatus } from '@/features/live-status/use-live-status'
import { selectPendingCounts, usePermissionsStore } from '@/features/permissions/store'
import { usePush } from '@/features/push/use-push'
import { extractSessionIdFromPathname } from '@/features/sessions/active-session'
import { SessionListActions } from '@/features/sessions/components/SessionListActions'
import { SessionsScreen } from '@/features/sessions/SessionsScreen'
import { useDaemonSync } from '@/features/sync/use-daemon-sync'
import { MasterDetailLayout, stackScreenOptions, Text } from '@/ui'

/** Cmd+N, Cmd+, and Esc outside a text field (closes the detail pane). */
function useShellKeyCommands(widthClass: WidthClass) {
  const widthClassRef = useRef(widthClass)
  widthClassRef.current = widthClass

  useEffect(() => {
    const unsubscribers = [
      addListener({ input: 'n', modifierFlags: constants.keyModifierCommand }, () => router.push('/new')),
      addListener({ input: ',', modifierFlags: constants.keyModifierCommand }, () =>
        router.push('/settings'),
      ),
      addListener({ input: constants.keyInputEscape }, () => {
        if (widthClassRef.current === 'regular' && !TextInput.State.currentlyFocusedInput()) {
          router.navigate('/')
        }
      }),
    ]
    return () => {
      unsubscribers.forEach((unsubscribe) => {
        unsubscribe()
      })
    }
  }, [])
}

/** Everything under (main) requires a paired daemon. */
export default function MainLayout() {
  const { t } = useTranslation()
  const credentials = useConnectionStore((s) => s.credentials)
  useDaemonSync()
  usePush()
  useLiveStatus()
  const widthClass = useWidthClass()
  const pathname = usePathname()
  const pending = usePermissionsStore(useShallow(selectPendingCounts))
  const theme = useTheme()
  useShellKeyCommands(widthClass)
  if (!credentials) return <Redirect href="/pair" />

  const selectedSessionId = extractSessionIdFromPathname(pathname)

  return (
    <MasterDetailLayout
      sidebar={
        widthClass === 'regular' ? (
          <>
            <View style={styles.sidebarHeader}>
              <Text weight="bold" size="lg">
                Remote Harness
              </Text>
              <SessionListActions />
            </View>
            <SessionsScreen pendingBySession={pending} selectedSessionId={selectedSessionId} interactive />
          </>
        ) : null
      }
    >
      <Stack screenOptions={stackScreenOptions(theme)}>
        <Stack.Screen name="index" options={{ title: 'Remote Harness' }} />
        <Stack.Screen name="settings" options={{ title: t('nav.settings') }} />
        <Stack.Screen name="new" options={{ title: t('nav.newSession'), presentation: 'modal' }} />
        <Stack.Screen name="session/[id]/index" options={{ title: '' }} />
        <Stack.Screen name="session/[id]/terminal" options={{ title: t('nav.terminal') }} />
        <Stack.Screen name="session/[id]/agent/[agentId]" options={{ title: t('nav.subagent') }} />
      </Stack>
    </MasterDetailLayout>
  )
}

const styles = StyleSheet.create({
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.sm,
  },
})

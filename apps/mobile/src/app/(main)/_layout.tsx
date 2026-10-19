import { Redirect, router, Stack, usePathname } from 'expo-router'
import { Menu } from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TextInput, View } from 'react-native'
import { addListener, constants } from 'react-native-key-command'
import { useShallow } from 'zustand/react/shallow'
import { useConnectionStore } from '@/core/connection'
import { inspectorMode, type LayoutClass, sidebarMode, useLayout } from '@/core/layout'
import { space, useTheme } from '@/core/theme'
import { InspectorPane } from '@/features/inspector/InspectorPane'
import { setInspectorOpen, useInspectorStore } from '@/features/inspector/store'
import { useLiveStatus } from '@/features/live-status/use-live-status'
import { selectPendingCounts, usePermissionsStore } from '@/features/permissions/store'
import { usePush } from '@/features/push/use-push'
import { extractSessionIdFromPathname } from '@/features/sessions/active-session'
import { ListTitle } from '@/features/sessions/components/ListTitle'
import { SessionListActions } from '@/features/sessions/components/SessionListActions'
import { SessionsScreen } from '@/features/sessions/SessionsScreen'
import { useSessionShortcuts } from '@/features/shortcuts/use-session-shortcuts'
import { useDaemonSync } from '@/features/sync/use-daemon-sync'
import { IconButton, MasterDetailLayout, stackScreenOptions } from '@/ui'

/** Cmd+N, Cmd+, and Esc outside a text field (closes the detail pane on tablets). */
function useShellKeyCommands(layout: LayoutClass) {
  const layoutRef = useRef(layout)
  layoutRef.current = layout

  useEffect(() => {
    const unsubscribers = [
      addListener({ input: 'n', modifierFlags: constants.keyModifierCommand }, () => router.push('/new')),
      addListener({ input: ',', modifierFlags: constants.keyModifierCommand }, () =>
        router.push('/settings'),
      ),
      addListener({ input: constants.keyInputEscape }, () => {
        if (layoutRef.current !== 'compact' && !TextInput.State.currentlyFocusedInput()) {
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
  const { layout, portrait } = useLayout()
  const pathname = usePathname()
  const pending = usePermissionsStore(useShallow(selectPendingCounts))
  const theme = useTheme()
  const selectedSessionId = extractSessionIdFromPathname(pathname)
  const sidebar = sidebarMode(layout, portrait)
  const inspector = inspectorMode(layout)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const inspectorOpen = useInspectorStore((s) => s.open)
  const inspectorWidth = useInspectorStore((s) => s.width)
  useShellKeyCommands(layout)
  useSessionShortcuts(selectedSessionId, layout)

  // Portrait tablets: the list slides over the conversation; it opens on its own while no session
  // is open and closes when one is picked.
  useEffect(() => {
    if (sidebar === 'overlay') setSidebarOpen(pathname === '/')
  }, [sidebar, pathname])

  if (!credentials) return <Redirect href="/pair" />

  const sidebarContent = (
    <>
      <View style={styles.sidebarHeader}>
        <ListTitle />
        <SessionListActions />
      </View>
      <SessionsScreen pendingBySession={pending} selectedSessionId={selectedSessionId} interactive />
    </>
  )
  const menuButton =
    sidebar === 'overlay'
      ? () => <IconButton icon={Menu} label={t('tablet.sidebar')} onPress={() => setSidebarOpen(true)} />
      : undefined

  return (
    <MasterDetailLayout
      sidebar={sidebar === 'none' ? null : sidebarContent}
      sidebarMode={sidebar}
      sidebarOpen={sidebarOpen}
      onCloseSidebar={() => setSidebarOpen(false)}
      inspector={
        inspector !== 'none' && selectedSessionId ? (
          <InspectorPane sessionId={selectedSessionId} mode={inspector} />
        ) : null
      }
      inspectorMode={inspector}
      inspectorOpen={inspector === 'inline' || inspectorOpen}
      inspectorWidth={inspectorWidth}
      onCloseInspector={() => setInspectorOpen(false)}
    >
      <Stack
        screenOptions={{ ...stackScreenOptions(theme), ...(menuButton ? { headerLeft: menuButton } : {}) }}
      >
        <Stack.Screen name="index" options={{ headerTitle: () => <ListTitle /> }} />
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

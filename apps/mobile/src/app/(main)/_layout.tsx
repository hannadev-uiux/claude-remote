import { Redirect, router, Stack, usePathname } from 'expo-router'
import { Menu } from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TextInput, View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'
import { useConnectionStore } from '@/core/connection'
import { keys, onKeyCommand } from '@/core/keyboard/key-commands'
import { edgeSwipeEnabled, inspectorMode, sidebarMode, useLayout } from '@/core/layout'
import { space, useTheme } from '@/core/theme'
import { InspectorPane } from '@/features/inspector/InspectorPane'
import { setInspectorOpen, useInspectorStore } from '@/features/inspector/store'
import { useLiveFollow } from '@/features/live-status/use-live-follow'
import { useLiveStatus } from '@/features/live-status/use-live-status'
import { selectPendingCounts, usePermissionsStore } from '@/features/permissions/store'
import { usePush } from '@/features/push/use-push'
import { extractSessionIdFromPathname } from '@/features/sessions/active-session'
import { ListTitle } from '@/features/sessions/components/ListTitle'
import { SessionListActions } from '@/features/sessions/components/SessionListActions'
import { trackPathname } from '@/features/sessions/open-session'
import { SessionsScreen } from '@/features/sessions/SessionsScreen'
import { KeyboardShortcutsSheet } from '@/features/shortcuts/KeyboardShortcutsSheet'
import { backAction } from '@/features/shortcuts/logic'
import { setShortcutsSheetOpen, useShortcutsStore } from '@/features/shortcuts/store'
import { useSessionShortcuts } from '@/features/shortcuts/use-session-shortcuts'
import { useDaemonSync } from '@/features/sync/use-daemon-sync'
import { IconButton, MasterDetailLayout, stackScreenOptions } from '@/ui'

/**
 * The list is always the bottom of the stack, also when a link (Live Activity, notification) opens
 * a session at start-up: the session then has a back button, and going "home" never stacks the list
 * on top of it.
 */
export const unstable_settings = { anchor: 'index' }

/**
 * ⌘N, ⌘, and ⌘/ (the shortcuts sheet); Esc leaves a focused field, then goes back (a session to the
 * list, other screens one step); ⌘[ goes back even from a field and from the terminal, which keeps
 * Esc for tmux. Registered first, so sheets and menus mounted later take Esc before it.
 */
function useShellKeyCommands(pathname: string) {
  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname

  useEffect(() => {
    const cmd = keys.keyModifierCommand
    const back = (key: 'escape' | 'bracket') => () => {
      const focused = TextInput.State.currentlyFocusedInput()
      const action = backAction(pathnameRef.current, key, focused != null)
      if (action === 'blur' && focused) TextInput.State.blurTextInput(focused)
      if (action === 'list') router.dismissTo('/')
      if (action === 'back' && router.canGoBack()) router.back()
    }
    const unsubscribers = [
      onKeyCommand({ input: 'n', modifierFlags: cmd }, () => router.push('/new')),
      onKeyCommand({ input: ',', modifierFlags: cmd }, () => router.push('/settings')),
      onKeyCommand({ input: '/', modifierFlags: cmd }, () =>
        setShortcutsSheetOpen(!useShortcutsStore.getState().sheetOpen),
      ),
      onKeyCommand({ input: keys.keyInputEscape }, back('escape')),
      onKeyCommand({ input: '[', modifierFlags: cmd }, back('bracket')),
    ]
    return () => {
      for (const unsubscribe of unsubscribers) unsubscribe()
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
  useLiveFollow()
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
  useShellKeyCommands(pathname)
  useSessionShortcuts(selectedSessionId, layout)
  trackPathname(pathname)

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
  // On the list and a session's conversation, ☰ replaces the back button and the swipe from the
  // left edge opens the list instead of going back. Deeper screens keep both.
  const overlayEdge = sidebar === 'overlay'
  const menuButton = overlayEdge
    ? {
        headerLeft: () => (
          <IconButton icon={Menu} label={t('tablet.sidebar')} onPress={() => setSidebarOpen(true)} />
        ),
      }
    : {}

  return (
    <MasterDetailLayout
      sidebar={sidebar === 'none' ? null : sidebarContent}
      sidebarMode={sidebar}
      sidebarOpen={sidebarOpen}
      sidebarEdgeSwipe={edgeSwipeEnabled(sidebar, sidebarOpen, pathname)}
      onOpenSidebar={() => setSidebarOpen(true)}
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
      <Stack screenOptions={stackScreenOptions(theme)}>
        <Stack.Screen
          name="index"
          // The list is the root: never a back button there.
          options={{
            headerTitle: () => <ListTitle />,
            headerBackVisible: false,
            gestureEnabled: !overlayEdge,
            ...menuButton,
          }}
        />
        <Stack.Screen name="settings" options={{ title: t('nav.settings') }} />
        <Stack.Screen name="new" options={{ title: t('nav.newSession'), presentation: 'modal' }} />
        <Stack.Screen name="report" options={{ title: t('errorReports.problem.title') }} />
        <Stack.Screen name="permissions" options={{ title: t('systemPermissions.title') }} />
        <Stack.Screen
          name="session/[id]/index"
          options={{ title: '', gestureEnabled: !overlayEdge, ...menuButton }}
        />
        <Stack.Screen name="session/[id]/terminal" options={{ title: t('nav.terminal') }} />
        <Stack.Screen name="session/[id]/agent/[agentId]" options={{ title: t('nav.subagent') }} />
      </Stack>
      <KeyboardShortcutsSheet />
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

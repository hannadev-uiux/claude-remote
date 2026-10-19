import type { ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { PaneMode } from '@/core/layout'
import { useTheme } from '@/core/theme'

export const SIDEBAR_WIDTH = 340

/**
 * Columns of the shell: the session list (inline beside the detail, or sliding over it in tablet
 * portrait), the detail navigator in `children`, and the inspector (a third column when it fits, a
 * side sheet on two columns). The sidebar slot stays in the same place in the tree, so the
 * navigator never unmounts when crossing a breakpoint. The detail pane does not need `SafeAreaView`
 * here: its own `Stack` (native header) and screens (`Screen`) already handle the safe area.
 */
export function MasterDetailLayout({
  sidebar,
  sidebarMode,
  sidebarOpen = false,
  onCloseSidebar,
  inspector,
  inspectorMode = 'none',
  inspectorOpen = false,
  inspectorWidth = 320,
  onCloseInspector,
  children,
}: {
  sidebar: ReactNode | null
  sidebarMode: PaneMode
  sidebarOpen?: boolean
  onCloseSidebar?: () => void
  inspector?: ReactNode | null
  inspectorMode?: PaneMode
  inspectorOpen?: boolean
  inspectorWidth?: number
  onCloseInspector?: () => void
  children: ReactNode
}) {
  const { colors } = useTheme()
  const showInlineSidebar = sidebarMode === 'inline' && sidebar
  const showOverlaySidebar = sidebarMode === 'overlay' && sidebar && sidebarOpen
  const showInlineInspector = inspectorMode === 'inline' && inspector
  const showOverlayInspector = inspectorMode === 'overlay' && inspector && inspectorOpen
  return (
    <View style={styles.row}>
      {showInlineSidebar ? (
        <SafeAreaView edges={['top', 'left']} style={[styles.sidebar, { borderRightColor: colors.border }]}>
          {sidebar}
        </SafeAreaView>
      ) : null}
      <View style={styles.detail}>{children}</View>
      {showInlineInspector ? (
        <SafeAreaView
          edges={['top', 'right']}
          style={[styles.inspector, { width: inspectorWidth, borderLeftColor: colors.border }]}
        >
          {inspector}
        </SafeAreaView>
      ) : null}
      {showOverlaySidebar ? (
        <>
          <Pressable
            accessibilityRole="button"
            onPress={onCloseSidebar}
            style={[styles.backdrop, { backgroundColor: colors.backdrop }]}
          />
          <SafeAreaView
            edges={['top', 'left', 'bottom']}
            style={[
              styles.overlayLeft,
              { backgroundColor: colors.background, borderRightColor: colors.border },
            ]}
          >
            {sidebar}
          </SafeAreaView>
        </>
      ) : null}
      {showOverlayInspector ? (
        <>
          <Pressable
            accessibilityRole="button"
            onPress={onCloseInspector}
            style={[styles.backdrop, { backgroundColor: colors.backdrop }]}
          />
          <SafeAreaView
            edges={['top', 'right', 'bottom']}
            style={[
              styles.overlayRight,
              { width: inspectorWidth, backgroundColor: colors.background, borderLeftColor: colors.border },
            ]}
          >
            {inspector}
          </SafeAreaView>
        </>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row' },
  sidebar: { width: SIDEBAR_WIDTH, borderRightWidth: 1 },
  detail: { flex: 1 },
  inspector: { borderLeftWidth: 1 },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  overlayLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: SIDEBAR_WIDTH,
    borderRightWidth: 1,
  },
  overlayRight: { position: 'absolute', top: 0, bottom: 0, right: 0, borderLeftWidth: 1 },
})

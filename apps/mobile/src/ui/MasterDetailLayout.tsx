import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '@/core/theme'

const SIDEBAR_WIDTH = 340

/**
 * `sidebar` is `null` in compact width (iPhone): the slot stays in the same place in the tree, so
 * the navigator in `children` never unmounts when crossing the breakpoint. The detail pane does
 * not need `SafeAreaView` here: its own `Stack` (native header) and screens (`Screen`) already
 * handle the safe area. The master pane does, since its header is not native.
 */
export function MasterDetailLayout({
  sidebar,
  children,
}: {
  sidebar: ReactNode | null
  children: ReactNode
}) {
  return (
    <View style={styles.row}>
      {sidebar ? (
        <SafeAreaView edges={['top', 'left']} style={styles.sidebar}>
          {sidebar}
        </SafeAreaView>
      ) : null}
      <View style={styles.detail}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row' },
  sidebar: { width: SIDEBAR_WIDTH, borderRightWidth: 1, borderRightColor: colors.border },
  detail: { flex: 1 },
})

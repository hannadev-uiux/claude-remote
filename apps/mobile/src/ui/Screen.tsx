import type { ReactNode } from 'react'
import { StyleSheet, View, type ViewStyle } from 'react-native'
import { type Edge, SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '@/core/theme'

export function Screen({
  children,
  edges = ['bottom'],
  style,
}: {
  children: ReactNode
  edges?: Edge[]
  style?: ViewStyle
}) {
  return (
    <SafeAreaView edges={edges} style={styles.safe}>
      <View style={[styles.body, style]}>{children}</View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1 },
})

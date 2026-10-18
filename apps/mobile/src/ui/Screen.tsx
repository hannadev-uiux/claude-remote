import type { ReactNode } from 'react'
import { StyleSheet, View, type ViewStyle } from 'react-native'
import { type Edge, SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/core/theme'

export function Screen({
  children,
  edges = ['bottom'],
  style,
}: {
  children: ReactNode
  edges?: Edge[]
  style?: ViewStyle
}) {
  const { colors } = useTheme()
  return (
    <SafeAreaView edges={edges} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.body, style]}>{children}</View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1 },
})

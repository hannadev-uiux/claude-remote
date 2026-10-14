import type { ReactNode } from 'react'
import { StyleSheet, View, type ViewStyle } from 'react-native'
import { colors, radius, space } from '@/core/theme'

export function Card({
  children,
  style,
  accent,
}: {
  children: ReactNode
  style?: ViewStyle
  accent?: string
}) {
  return <View style={[styles.base, accent ? { borderColor: accent } : null, style]}>{children}</View>
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.md,
  },
})

import type { ReactNode } from 'react'
import { View, type ViewStyle } from 'react-native'
import { makeStyles, radius, space } from '@/core/theme'

export function Card({
  children,
  style,
  accent,
}: {
  children: ReactNode
  style?: ViewStyle
  accent?: string
}) {
  const styles = useStyles()
  return <View style={[styles.base, accent ? { borderColor: accent } : null, style]}>{children}</View>
}

const useStyles = makeStyles((theme) => ({
  base: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.md,
  },
}))

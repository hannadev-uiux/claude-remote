import * as Haptics from 'expo-haptics'
import type { ReactNode } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'
import { colors, radius, space } from '@/core/theme'
import { Text } from './Text'

type Variant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'

const VARIANTS: Record<Variant, { bg: string; border: string; text: keyof typeof colors }> = {
  primary: { bg: colors.accent, border: colors.accent, text: 'background' },
  secondary: { bg: colors.surfaceRaised, border: colors.borderStrong, text: 'text' },
  danger: { bg: colors.dangerMuted, border: colors.danger, text: 'danger' },
  success: { bg: colors.successMuted, border: colors.success, text: 'success' },
  ghost: { bg: 'transparent', border: 'transparent', text: 'textMuted' },
}

export type ButtonProps = {
  label: string
  onPress: () => void
  variant?: Variant
  icon?: ReactNode
  loading?: boolean
  disabled?: boolean
  compact?: boolean
  flex?: boolean
}

export function Button({
  label,
  onPress,
  variant = 'secondary',
  icon,
  loading,
  disabled,
  compact,
  flex,
}: ButtonProps) {
  const v = VARIANTS[variant]
  const inactive = disabled || loading
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={inactive}
      onPress={() => {
        void Haptics.selectionAsync()
        onPress()
      }}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        flex && styles.flex,
        { backgroundColor: v.bg, borderColor: v.border, opacity: inactive ? 0.5 : pressed ? 0.75 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors[v.text]} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text size={compact ? 'sm' : 'md'} weight="medium" color={v.text}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: { minHeight: 34, paddingHorizontal: space.md },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
})

import type { LucideIcon } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, StyleSheet } from 'react-native'
import { type ColorName, radius, useTheme } from '@/core/theme'

export function IconButton({
  icon: Icon,
  onPress,
  onPressIn,
  onPressOut,
  label,
  color = 'textMuted',
  size = 20,
  disabled,
}: {
  icon: LucideIcon
  /** Omit when using `onPressIn`/`onPressOut` for a press-and-hold interaction instead. */
  onPress?: () => void
  onPressIn?: () => void
  onPressOut?: () => void
  label: string
  color?: ColorName
  size?: number
  disabled?: boolean
}) {
  const { colors } = useTheme()
  const [hovered, setHovered] = useState(false)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      disabled={disabled}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        styles.base,
        hovered && !disabled && { backgroundColor: colors.surfaceRaised },
        { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 },
      ]}
    >
      <Icon size={size} color={colors[color]} strokeWidth={2} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: { padding: 6, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
})

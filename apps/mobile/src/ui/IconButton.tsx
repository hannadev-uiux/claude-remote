import type { LucideIcon } from 'lucide-react-native'
import { Pressable, StyleSheet } from 'react-native'
import { type ColorName, colors, radius } from '@/core/theme'

export function IconButton({
  icon: Icon,
  onPress,
  label,
  color = 'textMuted',
  size = 20,
  disabled,
}: {
  icon: LucideIcon
  onPress: () => void
  label: string
  color?: ColorName
  size?: number
  disabled?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.base, { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }]}
    >
      <Icon size={size} color={colors[color]} strokeWidth={2} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: { padding: 6, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
})

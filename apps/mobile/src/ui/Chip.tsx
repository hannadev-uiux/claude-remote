import { Pressable } from 'react-native'
import { makeStyles, radius, space } from '@/core/theme'
import { Text } from './Text'

/**
 * Filter chip: outlined on the surface, filled with the accent when selected; `ghost` is the
 * dashed, muted variant for secondary controls (sort).
 */
export function Chip({
  label,
  selected = false,
  ghost = false,
  onPress,
}: {
  label: string
  selected?: boolean
  ghost?: boolean
  onPress: () => void
}) {
  const styles = useStyles()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.selected,
        ghost && !selected && styles.ghost,
        pressed && styles.pressed,
      ]}
    >
      <Text
        size="sm"
        weight={selected ? 'bold' : 'regular'}
        color={selected ? 'accentInk' : ghost ? 'textMuted' : 'text'}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  )
}

const useStyles = makeStyles((theme) => ({
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md + 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginRight: space.xxs,
  },
  selected: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  ghost: { borderStyle: 'dashed' },
  pressed: { opacity: 0.7 },
}))

import type { Profile } from '@remote-harness/protocol'
import { StyleSheet, View } from 'react-native'
import { space, useTheme } from '@/core/theme'
import { Text } from '@/ui'

export function ProfileHeader({ profile, count }: { profile: Profile; count: number }) {
  const { colors } = useTheme()
  // Unknown profiles (not in the daemon's list) have no color of their own.
  const color = profile.color || colors.textMuted
  return (
    <View style={[styles.base, { backgroundColor: colors.background }]}>
      <View style={[styles.bar, { backgroundColor: color }]} />
      <Text size="sm" weight="bold" style={{ color }}>
        {profile.name.toUpperCase()}
      </Text>
      <Text size="xs" color="textDim">
        {profile.id} · {count}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.sm,
  },
  bar: { width: 3, height: 14, borderRadius: 2 },
})

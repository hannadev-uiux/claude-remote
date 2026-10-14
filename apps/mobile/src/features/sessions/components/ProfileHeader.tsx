import type { Profile } from '@claude-remote/protocol'
import { StyleSheet, View } from 'react-native'
import { colors, space } from '@/core/theme'
import { Text } from '@/ui'

export function ProfileHeader({ profile, count }: { profile: Profile; count: number }) {
  return (
    <View style={styles.base}>
      <View style={[styles.bar, { backgroundColor: profile.color }]} />
      <Text size="sm" weight="bold" style={{ color: profile.color }}>
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
    backgroundColor: colors.background,
  },
  bar: { width: 3, height: 14, borderRadius: 2 },
})

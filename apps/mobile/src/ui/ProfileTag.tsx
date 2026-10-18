import type { Profile } from '@remote-harness/protocol'
import { useTheme } from '@/core/theme'
import { Text } from './Text'

/** The profile's name in its own color (muted when the profile has none). */
export function ProfileTag({ profile }: { profile: Pick<Profile, 'name' | 'color'> }) {
  const { colors } = useTheme()
  return (
    <Text size="xs" weight="bold" numberOfLines={1} style={{ color: profile.color || colors.textMuted }}>
      {profile.name}
    </Text>
  )
}

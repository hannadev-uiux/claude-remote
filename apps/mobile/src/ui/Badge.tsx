import { StyleSheet, View } from 'react-native'
import { colors, radius, space } from '@/core/theme'
import { Text } from './Text'

export type BadgeTone = 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'muted'

const TONES: Record<BadgeTone, { bg: string; fg: keyof typeof colors }> = {
  accent: { bg: colors.accentMuted, fg: 'accent' },
  success: { bg: colors.successMuted, fg: 'success' },
  warning: { bg: colors.warningMuted, fg: 'warning' },
  danger: { bg: colors.dangerMuted, fg: 'danger' },
  info: { bg: colors.infoMuted, fg: 'info' },
  muted: { bg: colors.surfaceRaised, fg: 'textMuted' },
}

export function Badge({ label, tone = 'muted', dot }: { label: string; tone?: BadgeTone; dot?: boolean }) {
  const t = TONES[tone]
  return (
    <View style={[styles.base, { backgroundColor: t.bg }]}>
      {dot ? <View style={[styles.dot, { backgroundColor: colors[t.fg] }]} /> : null}
      <Text size="xs" weight="medium" color={t.fg}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm,
    paddingVertical: space.xxs,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
})

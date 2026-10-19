import { StyleSheet, View } from 'react-native'
import { type ColorName, radius, space, useTheme } from '@/core/theme'
import { Text } from './Text'

export type BadgeTone = 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'muted'

const TONES: Record<BadgeTone, { bg: ColorName; fg: ColorName; dot: ColorName }> = {
  accent: { bg: 'accentSoft', fg: 'accentText', dot: 'accent' },
  success: { bg: 'successSoft', fg: 'success', dot: 'success' },
  warning: { bg: 'warningSoft', fg: 'warning', dot: 'warning' },
  danger: { bg: 'dangerSoft', fg: 'danger', dot: 'danger' },
  info: { bg: 'infoSoft', fg: 'info', dot: 'info' },
  muted: { bg: 'surfaceRaised', fg: 'textMuted', dot: 'textMuted' },
}

export function Badge({ label, tone = 'muted', dot }: { label: string; tone?: BadgeTone; dot?: boolean }) {
  const { colors } = useTheme()
  const t = TONES[tone]
  return (
    <View style={[styles.base, { backgroundColor: colors[t.bg] }]}>
      {dot ? <View style={[styles.dot, { backgroundColor: colors[t.dot] }]} /> : null}
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

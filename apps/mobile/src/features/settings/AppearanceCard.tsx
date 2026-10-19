import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import {
  dark,
  light,
  makeStyles,
  radius,
  setThemePreference,
  space,
  THEME_NAMES,
  THEMES,
  type ThemePreference,
  useTheme,
  useThemeStore,
} from '@/core/theme'
import { Card, Text } from '@/ui'

const CHOICES: readonly ThemePreference[] = ['system', ...THEME_NAMES]

/** Settings → Appearance: one swatch per theme (plus System); the current one wears the accent. */
export function AppearanceCard() {
  const { t } = useTranslation()
  const preference = useThemeStore((s) => s.preference)
  return (
    <Card>
      <View style={layout.gap}>
        <Text weight="bold">{t('settings.appearance')}</Text>
        <View style={layout.row}>
          {CHOICES.map((choice) => (
            <ThemeSwatch
              key={choice}
              choice={choice}
              selected={choice === preference}
              label={t(`settings.themes.${choice}`)}
              onPress={() => void setThemePreference(choice)}
            />
          ))}
        </View>
      </View>
    </Card>
  )
}

/** Preview of a theme: its background with bars in the accent, text and border colors. */
function ThemeSwatch({
  choice,
  selected,
  label,
  onPress,
}: {
  choice: ThemePreference
  selected: boolean
  label: string
  onPress: () => void
}) {
  const { colors } = useTheme()
  const styles = useStyles()
  // "System" previews both themes it can resolve to.
  const previews = choice === 'system' ? [dark, light] : [THEMES[choice]]
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.swatch,
        selected && { borderColor: colors.accent },
        pressed && layout.pressed,
      ]}
    >
      <View style={layout.preview}>
        {previews.map((theme) => (
          <View key={theme.name} style={[layout.half, { backgroundColor: theme.colors.background }]}>
            <View style={[layout.bar, layout.accentBar, { backgroundColor: theme.colors.accent }]} />
            <View style={[layout.bar, layout.textBar, { backgroundColor: theme.colors.text }]} />
            <View style={[layout.bar, layout.borderBar, { backgroundColor: theme.colors.borderStrong }]} />
          </View>
        ))}
      </View>
      <Text
        size="xs"
        weight={selected ? 'bold' : 'regular'}
        color={selected ? 'accentText' : 'textMuted'}
        numberOfLines={1}
        style={layout.label}
      >
        {label}
      </Text>
    </Pressable>
  )
}

const layout = StyleSheet.create({
  gap: { gap: space.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  pressed: { opacity: 0.7 },
  preview: { height: 40, flexDirection: 'row' },
  half: { flex: 1, paddingHorizontal: 6, gap: 3, justifyContent: 'center' },
  bar: { height: 5, borderRadius: 2 },
  accentBar: { width: '40%' },
  textBar: { width: '70%' },
  borderBar: { width: '55%' },
  label: { paddingHorizontal: space.sm, paddingVertical: space.xs, textAlign: 'center' },
})

const useStyles = makeStyles((theme) => ({
  swatch: {
    minWidth: 72,
    borderRadius: radius.md + 2,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
}))

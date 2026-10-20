import { Check, ChevronRight } from 'lucide-react-native'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  dark,
  light,
  makeStyles,
  radius,
  setThemePreference,
  space,
  THEMES,
  useTheme,
  useThemeStore,
} from '@/core/theme'
import { Button, Card, Text } from '@/ui'
import { type ThemeRow, themeRowLabel, themeRows } from './theme-picker'

/** Settings → Appearance: a select row opening a modal with the scrollable theme list. */
export function AppearanceCard() {
  const { t } = useTranslation()
  const preference = useThemeStore((s) => s.preference)
  const system = useThemeStore((s) => s.system)
  const [open, setOpen] = useState(false)
  const rowLabel = themeRowLabel(preference, system, t)
  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={rowLabel}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [layout.row, pressed && layout.pressed]}
      >
        <Text weight="bold" style={layout.flex}>
          {rowLabel}
        </Text>
        <ThemeRowChevron />
      </Pressable>
      <ThemePickerSheet visible={open} onClose={() => setOpen(false)} />
    </Card>
  )
}

function ThemeRowChevron() {
  const { colors } = useTheme()
  return <ChevronRight size={16} color={colors.textDim} />
}

function ThemePickerSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const styles = useStyles()
  const insets = useSafeAreaInsets()
  const preference = useThemeStore((s) => s.preference)
  const system = useThemeStore((s) => s.system)
  const rows = themeRows(preference, system, t)
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}>
          <Text weight="bold">{t('settings.themeTitle')}</Text>
          <ScrollView style={layout.list} contentContainerStyle={layout.listContent}>
            {rows.map((row) => (
              <ThemeOptionRow
                key={row.choice}
                row={row}
                onPress={() => void setThemePreference(row.choice)}
              />
            ))}
          </ScrollView>
          <Button label={t('settings.themeDone')} variant="ghost" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function ThemeOptionRow({ row, onPress }: { row: ThemeRow; onPress: () => void }) {
  const { colors } = useTheme()
  const styles = useStyles()
  const previews = row.choice === 'system' ? [dark, light] : [THEMES[row.choice]]
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: row.selected }}
      accessibilityLabel={row.label}
      onPress={onPress}
      style={({ pressed }) => [styles.optionRow, pressed && layout.pressed]}
    >
      <View style={styles.swatch}>
        <View style={layout.preview}>
          {previews.map((theme) => (
            <View key={theme.name} style={[layout.half, { backgroundColor: theme.colors.background }]}>
              <View style={[layout.bar, layout.accentBar, { backgroundColor: theme.colors.accent }]} />
              <View style={[layout.bar, layout.textBar, { backgroundColor: theme.colors.text }]} />
              <View style={[layout.bar, layout.borderBar, { backgroundColor: theme.colors.borderStrong }]} />
            </View>
          ))}
        </View>
      </View>
      <View style={layout.flex}>
        <Text weight={row.selected ? 'bold' : 'regular'}>{row.label}</Text>
        <Text size="xs" color="textMuted">
          {row.tag}
        </Text>
      </View>
      {row.selected ? <Check size={18} color={colors.accentText} /> : null}
    </Pressable>
  )
}

const layout = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  pressed: { opacity: 0.7 },
  list: { maxHeight: 420 },
  listContent: { gap: space.xs },
  preview: { height: 40, flexDirection: 'row' },
  half: { flex: 1, paddingHorizontal: 6, gap: 3, justifyContent: 'center' },
  bar: { height: 5, borderRadius: 2 },
  accentBar: { width: '40%' },
  textBar: { width: '70%' },
  borderBar: { width: '55%' },
})

const useStyles = makeStyles((theme) => ({
  backdrop: { flex: 1, backgroundColor: theme.colors.backdrop, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: space.xl,
    gap: space.md,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.xs,
    borderRadius: radius.md,
  },
  swatch: {
    width: 72,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
}))

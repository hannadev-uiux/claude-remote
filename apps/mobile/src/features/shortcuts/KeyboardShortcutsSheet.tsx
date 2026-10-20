import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { keys, useKeyCommand } from '@/core/keyboard/key-commands'
import { makeStyles, radius, space } from '@/core/theme'
import { Button, Text } from '@/ui'
import { shortcutSheet } from './logic'
import { setShortcutsSheetOpen, useShortcutsStore } from './store'

/** The ⌘/ sheet: every keyboard shortcut, by group. Esc (or ⌘/ again) closes it. */
export function KeyboardShortcutsSheet() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const styles = useStyles()
  const open = useShortcutsStore((s) => s.sheetOpen)
  const groups = useMemo(() => shortcutSheet(t), [t])
  const close = () => setShortcutsSheetOpen(false)
  // Newer than the shell's Esc, so it closes the sheet instead of going back.
  useKeyCommand({ input: keys.keyInputEscape }, () => close(), open)

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
      <Pressable
        style={styles.backdrop}
        onPress={close}
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
      >
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}>
          <Text weight="bold">{t('shortcuts.title')}</Text>
          <Text size="xs" color="textMuted">
            {t('shortcuts.hint')}
          </Text>
          <ScrollView style={styles.list} contentContainerStyle={styles.content}>
            {groups.map((group) => (
              <View key={group.title} style={styles.group}>
                <Text size="xs" weight="bold" color="textMuted">
                  {group.title.toUpperCase()}
                </Text>
                {group.items.map((item) => (
                  <View
                    key={item.keys}
                    style={styles.row}
                    accessible
                    accessibilityLabel={`${item.keys}, ${item.label}`}
                  >
                    <Text size="sm" weight="bold" color="accentText" style={styles.keys}>
                      {item.keys}
                    </Text>
                    <Text size="sm" style={styles.label}>
                      {item.label}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
          <Button label={t('common.close')} variant="ghost" onPress={close} />
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const useStyles = makeStyles((theme) => ({
  backdrop: { flex: 1, backgroundColor: theme.colors.backdrop, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '85%',
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    gap: space.sm,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  list: { flexGrow: 0 },
  content: { gap: space.lg, paddingVertical: space.sm },
  group: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: space.md },
  keys: { width: 96 },
  label: { flex: 1 },
}))

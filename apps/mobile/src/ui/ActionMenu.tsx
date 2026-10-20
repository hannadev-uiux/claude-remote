import type { LucideIcon } from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionSheetIOS, findNodeHandle, Modal, Platform, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { keys, useKeyCommand } from '@/core/keyboard/key-commands'
import { makeStyles, radius, space, useTheme } from '@/core/theme'
import { IconButton } from './IconButton'
import { nextEnabled } from './menu-nav'
import { Text } from './Text'

export type ActionMenuItem = { key: string; label: string; disabled?: boolean; onPress: () => void }

/**
 * Header button that opens a menu: the native action sheet on iOS (anchored to the button on iPad)
 * and an overflow menu under the header's right edge on Android. `disabledReason` explains the
 * disabled items (sheet message on iOS, footer line on Android). Each change of `openRequests` opens
 * it (⌘⇧O); the Android menu then moves with ↑ / ↓, chooses with Enter and closes with Esc, while
 * the iOS sheet keeps its system keyboard handling.
 */
export function ActionMenu({
  icon,
  label,
  items,
  disabledReason,
  attention = false,
  openRequests = 0,
}: {
  icon: LucideIcon
  label: string
  items: ActionMenuItem[]
  disabledReason?: string
  /** Accent dot over the button: something behind the menu deserves a look (running subagents). */
  attention?: boolean
  /** Opens the menu whenever it changes (a keyboard shortcut); 0 never opens it. */
  openRequests?: number
}) {
  const { t } = useTranslation()
  const theme = useTheme()
  const styles = useStyles()
  const insets = useSafeAreaInsets()
  const anchor = useRef<View>(null)
  const [open, setOpen] = useState(false)
  // Keyboard highlight in the Android menu; -1 until an arrow is pressed.
  const [highlight, setHighlight] = useState(-1)

  const show = () => {
    if (Platform.OS !== 'ios') {
      setHighlight(-1)
      return setOpen(true)
    }
    const disabled = items.flatMap((item, index) => (item.disabled ? [index] : []))
    const handle = anchor.current ? findNodeHandle(anchor.current) : null
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [...items.map((item) => item.label), t('common.cancel')],
        cancelButtonIndex: items.length,
        disabledButtonIndices: disabled,
        ...(disabledReason ? { message: disabledReason } : {}),
        ...(handle ? { anchor: handle } : {}),
        userInterfaceStyle: theme.scheme,
        tintColor: theme.colors.accentText,
      },
      (index) => items[index]?.onPress(),
    )
  }

  const choose = (item: ActionMenuItem) => {
    setOpen(false)
    item.onPress()
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: only a new request opens the menu.
  useEffect(() => {
    if (openRequests > 0) show()
  }, [openRequests])

  const keyboard = open && Platform.OS !== 'ios'
  const move = (delta: 1 | -1) => setHighlight((current) => nextEnabled(items, current, delta))
  useKeyCommand({ input: keys.keyInputDownArrow }, () => move(1), keyboard)
  useKeyCommand({ input: keys.keyInputUpArrow }, () => move(-1), keyboard)
  useKeyCommand(
    { input: keys.keyInputEnter },
    () => {
      const item = items[highlight]
      if (item && !item.disabled) choose(item)
    },
    keyboard,
  )
  useKeyCommand({ input: keys.keyInputEscape }, () => setOpen(false), keyboard)

  return (
    <>
      <View ref={anchor} collapsable={false}>
        <IconButton icon={icon} label={label} onPress={show} />
        {attention ? <View pointerEvents="none" style={styles.dot} /> : null}
      </View>
      {Platform.OS === 'ios' ? null : (
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable style={layout.backdrop} onPress={() => setOpen(false)}>
            <View style={[styles.menu, { top: insets.top + space.xs }]}>
              {items.map((item, index) => (
                <Pressable
                  key={item.key}
                  accessibilityRole="menuitem"
                  accessibilityState={{ disabled: !!item.disabled }}
                  disabled={item.disabled}
                  onPress={() => choose(item)}
                  style={({ pressed }) => [layout.item, (pressed || index === highlight) && styles.pressed]}
                >
                  <Text color={item.disabled ? 'textDim' : 'text'}>{item.label}</Text>
                </Pressable>
              ))}
              {disabledReason ? (
                <Text size="xs" color="textMuted" style={layout.reason}>
                  {disabledReason}
                </Text>
              ) : null}
            </View>
          </Pressable>
        </Modal>
      )}
    </>
  )
}

const layout = StyleSheet.create({
  backdrop: { flex: 1 },
  item: { paddingHorizontal: space.lg, paddingVertical: space.md },
  reason: { paddingHorizontal: space.lg, paddingTop: space.xs, paddingBottom: space.sm },
})

const useStyles = makeStyles((theme) => ({
  menu: {
    position: 'absolute',
    right: space.sm,
    minWidth: 220,
    maxWidth: 300,
    paddingVertical: space.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceRaised,
    elevation: 8,
  },
  pressed: { backgroundColor: theme.colors.surface },
  dot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 9,
    height: 9,
    borderRadius: radius.pill,
    backgroundColor: theme.colors.accent,
    borderWidth: 1.5,
    borderColor: theme.colors.background,
  },
}))

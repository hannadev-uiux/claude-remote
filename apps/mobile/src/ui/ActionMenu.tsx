import type { LucideIcon } from 'lucide-react-native'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionSheetIOS, findNodeHandle, Modal, Platform, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { makeStyles, radius, space, useTheme } from '@/core/theme'
import { IconButton } from './IconButton'
import { Text } from './Text'

export type ActionMenuItem = { key: string; label: string; disabled?: boolean; onPress: () => void }

/**
 * Header button that opens a menu: the native action sheet on iOS (anchored to the button on iPad)
 * and an overflow menu under the header's right edge on Android. `disabledReason` explains the
 * disabled items (sheet message on iOS, footer line on Android).
 */
export function ActionMenu({
  icon,
  label,
  items,
  disabledReason,
  attention = false,
}: {
  icon: LucideIcon
  label: string
  items: ActionMenuItem[]
  disabledReason?: string
  /** Accent dot over the button: something behind the menu deserves a look (running subagents). */
  attention?: boolean
}) {
  const { t } = useTranslation()
  const theme = useTheme()
  const styles = useStyles()
  const insets = useSafeAreaInsets()
  const anchor = useRef<View>(null)
  const [open, setOpen] = useState(false)

  const show = () => {
    if (Platform.OS !== 'ios') return setOpen(true)
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
              {items.map((item) => (
                <Pressable
                  key={item.key}
                  accessibilityRole="menuitem"
                  accessibilityState={{ disabled: !!item.disabled }}
                  disabled={item.disabled}
                  onPress={() => choose(item)}
                  style={({ pressed }) => [layout.item, pressed && styles.pressed]}
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

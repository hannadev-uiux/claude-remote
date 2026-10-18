import type { Key } from '@remote-harness/protocol'
import { Command, KeyboardOff } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { Keyboard, Pressable, StyleSheet, View } from 'react-native'
import { colors, space } from '@/core/theme'
import { IconButton } from '@/ui'
import { setKeyboardToolbarExpanded, useKeyboardToolbarStore } from '../keyboard-toolbar-store'
import { KeyBar } from './KeyBar'

/**
 * Row attached to the top of the keyboard while the prompt field is focused: special keys (expanded
 * in the same row, so the height never changes) and a button to hide the keyboard. None of these
 * taps blur the field: the buttons sit outside any scroll view and `KeyBar` persists taps.
 */
export function KeyboardToolbar({
  onKey,
  keysDisabled,
  canDismiss,
}: {
  onKey: (key: Key) => void
  keysDisabled?: boolean
  /** False with a hardware keyboard: only the system shortcut bar is up. */
  canDismiss: boolean
}) {
  const { t } = useTranslation()
  const expanded = useKeyboardToolbarStore((s) => s.expanded)
  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={expanded ? t('conversation.hideSpecialKeys') : t('conversation.showSpecialKeys')}
        accessibilityState={{ expanded }}
        hitSlop={6}
        onPress={() => void setKeyboardToolbarExpanded(!expanded)}
        style={({ pressed }) => [styles.toggle, expanded && styles.toggleOn, pressed && styles.pressed]}
      >
        <Command size={16} color={expanded ? colors.accent : colors.textMuted} strokeWidth={2} />
      </Pressable>
      <View style={styles.keys}>{expanded ? <KeyBar onKey={onKey} disabled={keysDisabled} /> : null}</View>
      {canDismiss ? (
        <IconButton
          icon={KeyboardOff}
          size={18}
          label={t('conversation.hideKeyboard')}
          onPress={Keyboard.dismiss}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  // Fixed height: expanding the keys must not move the conversation.
  bar: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  toggle: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  toggleOn: { backgroundColor: colors.surfaceRaised },
  pressed: { opacity: 0.6 },
  keys: { flex: 1 },
})

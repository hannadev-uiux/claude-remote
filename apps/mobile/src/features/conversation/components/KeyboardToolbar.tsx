import type { Key } from '@remote-harness/protocol'
import { Command, KeyboardOff } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { Keyboard, Pressable, StyleSheet, View } from 'react-native'
import { makeStyles, radius, space, useTheme } from '@/core/theme'
import { IconButton, Text } from '@/ui'
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
  onTrigger,
  commandEnabled = true,
}: {
  onKey: (key: Key) => void
  keysDisabled?: boolean
  /** False with a hardware keyboard: only the system shortcut bar is up. */
  canDismiss: boolean
  /** Inserts `@` or `/` in the prompt; the buttons show while the keys are collapsed. */
  onTrigger?: (trigger: '@' | '/') => void
  /** `/` only starts a blank prompt. */
  commandEnabled?: boolean
}) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
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
        <Command size={16} color={expanded ? colors.accentText : colors.textMuted} strokeWidth={2} />
      </Pressable>
      <View style={styles.keys}>
        {expanded ? (
          <KeyBar onKey={onKey} disabled={keysDisabled} />
        ) : onTrigger ? (
          <View style={styles.triggers}>
            <TriggerButton label={t('conversation.insertTrigger.file')} onPress={() => onTrigger('@')}>
              @
            </TriggerButton>
            <TriggerButton
              label={t('conversation.insertTrigger.command')}
              disabled={!commandEnabled}
              onPress={() => onTrigger('/')}
            >
              /
            </TriggerButton>
          </View>
        ) : null}
      </View>
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

function TriggerButton({
  label,
  disabled,
  onPress,
  children,
}: {
  label: string
  disabled?: boolean
  onPress: () => void
  children: string
}) {
  const styles = useStyles()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={4}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.trigger, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Text color="textMuted" weight="medium">
        {children}
      </Text>
    </Pressable>
  )
}

const useStyles = makeStyles((theme) => ({
  // Fixed height: expanding the keys must not move the conversation.
  bar: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  toggle: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  toggleOn: { backgroundColor: theme.colors.surfaceRaised },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.35 },
  keys: { flex: 1 },
  triggers: { flexDirection: 'row', gap: space.xs, paddingHorizontal: space.xs },
  trigger: {
    minWidth: 36,
    height: 30,
    paddingHorizontal: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: theme.colors.surfaceRaised,
  },
}))

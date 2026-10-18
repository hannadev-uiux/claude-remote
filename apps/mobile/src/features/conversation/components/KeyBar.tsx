import type { Key } from '@remote-harness/protocol'
import * as Haptics from 'expo-haptics'
import { useTranslation } from 'react-i18next'
import { Alert, Pressable, ScrollView } from 'react-native'
import { makeStyles, radius, space } from '@/core/theme'
import { Text } from '@/ui'

/** `confirm` asks before sending (texts in the catalogs). */
export type KeySpec = { key: Key; label: string; confirm?: 'ctrlC' }

export const DEFAULT_KEYS: KeySpec[] = [
  { key: 'Escape', label: 'esc' },
  { key: 'C-c', label: '^C', confirm: 'ctrlC' },
  { key: 'Up', label: '↑' },
  { key: 'Down', label: '↓' },
  { key: 'Left', label: '←' },
  { key: 'Right', label: '→' },
  { key: 'Enter', label: '⏎' },
  { key: 'Tab', label: 'tab' },
  { key: 'BTab', label: '⇧tab' },
  { key: '1', label: '1' },
  { key: '2', label: '2' },
  { key: '3', label: '3' },
]

export function KeyBar({
  onKey,
  disabled,
  keys = DEFAULT_KEYS,
}: {
  onKey: (key: Key) => void
  disabled?: boolean
  keys?: KeySpec[]
}) {
  const { t } = useTranslation()
  const styles = useStyles()
  const press = (spec: KeySpec) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (!spec.confirm) return onKey(spec.key)
    Alert.alert(t('conversation.confirmCtrlC'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.send'), style: 'destructive', onPress: () => onKey(spec.key) },
    ])
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="always"
      style={styles.bar}
      contentContainerStyle={styles.row}
    >
      {keys.map((spec) => (
        <Pressable
          key={spec.key}
          disabled={disabled}
          onPress={() => press(spec)}
          style={({ pressed }) => [
            styles.key,
            spec.key === 'Escape' && styles.esc,
            { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 },
          ]}
        >
          <Text
            size="sm"
            weight="medium"
            color={spec.key === 'Escape' || spec.key === 'C-c' ? 'accentText' : 'text'}
          >
            {spec.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  )
}

const useStyles = makeStyles((theme) => ({
  bar: { flexGrow: 0 },
  row: { gap: space.xs, paddingHorizontal: space.sm, paddingVertical: space.xs },
  key: {
    minWidth: 40,
    height: 32,
    paddingHorizontal: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceRaised,
  },
  esc: { borderColor: theme.colors.accent },
}))

import type { Key } from '@claude-remote/protocol'
import * as Haptics from 'expo-haptics'
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native'
import { colors, radius, space } from '@/core/theme'
import { Text } from '@/ui'

type KeySpec = { key: Key; label: string; confirm?: string }

export const DEFAULT_KEYS: KeySpec[] = [
  { key: 'Escape', label: 'esc' },
  { key: 'C-c', label: '^C', confirm: 'Enviar Ctrl+C para a sessão?' },
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
  const press = (spec: KeySpec) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (!spec.confirm) return onKey(spec.key)
    Alert.alert(spec.confirm, undefined, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Enviar', style: 'destructive', onPress: () => onKey(spec.key) },
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
            color={spec.key === 'Escape' || spec.key === 'C-c' ? 'accent' : 'text'}
          >
            {spec.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
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
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  esc: { borderColor: colors.accent },
})

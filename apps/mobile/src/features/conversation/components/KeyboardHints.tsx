import { StyleSheet, View } from 'react-native'
import { space } from '@/core/theme'
import { Text } from '@/ui'
import type { KeyboardHint } from '../keyboard-hints'

/** Row of `keys label` pairs under the composer while a hardware keyboard is attached on a tablet. */
export function KeyboardHints({ hints }: { hints: KeyboardHint[] }) {
  return (
    <View style={styles.row} accessibilityRole="text">
      {hints.map((hint) => (
        <View key={hint.keys} style={styles.hint}>
          <Text size="xs" weight="bold" color="textMuted">
            {hint.keys}
          </Text>
          <Text size="xs" color="textDim">
            {hint.label}
          </Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingBottom: space.xs,
  },
  hint: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
})

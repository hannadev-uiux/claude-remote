import { StyleSheet, View } from 'react-native'
import { colors, space } from '@/core/theme'
import { Text } from '@/ui'
import type { DiffLine } from '../diff'

const PREFIX = { add: '+', remove: '-', context: ' ' } as const

export function DiffView({ lines }: { lines: DiffLine[] }) {
  return (
    <View style={styles.base}>
      {lines.map((line, i) => (
        <View
          // biome-ignore lint/suspicious/noArrayIndexKey: diff lines are positional
          key={i}
          style={[styles.line, line.kind === 'add' && styles.add, line.kind === 'remove' && styles.remove]}
        >
          <Text
            size="xs"
            color={line.kind === 'add' ? 'success' : line.kind === 'remove' ? 'danger' : 'textMuted'}
          >
            {PREFIX[line.kind]} {line.text}
          </Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  base: { borderRadius: 6, overflow: 'hidden', marginTop: space.xs },
  line: { paddingHorizontal: space.sm, paddingVertical: 1 },
  add: { backgroundColor: colors.diffAdd },
  remove: { backgroundColor: colors.diffRemove },
})

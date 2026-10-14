import type { CommandItem, FileItem } from '@claude-remote/protocol'
import { File, Folder, Terminal } from 'lucide-react-native'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { colors, space } from '@/core/theme'
import { Text } from '@/ui'
import type { Suggestions } from './use-suggestions'

const SOURCE_LABEL: Record<CommandItem['source'], string> = {
  builtin: 'nativo',
  profile: 'perfil',
  project: 'projeto',
  plugin: 'plugin',
}

type Props = {
  suggestions: Suggestions
  onPickFile: (item: FileItem) => void
  onPickCommand: (item: CommandItem) => void
}

export function SuggestionList({ suggestions, onPickFile, onPickCommand }: Props) {
  if (!suggestions) return null
  const empty = suggestions.items.length === 0
  return (
    <View style={styles.wrap}>
      {suggestions.loading && empty ? <ActivityIndicator color={colors.accent} style={styles.pad} /> : null}
      {!suggestions.loading && empty ? (
        <Text size="xs" color="textDim" style={styles.pad}>
          nenhuma sugestão
        </Text>
      ) : null}
      <ScrollView keyboardShouldPersistTaps="always" style={styles.list}>
        {suggestions.kind === 'file'
          ? suggestions.items.map((item) => (
              <Pressable
                key={item.path}
                onPress={() => onPickFile(item)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                {item.kind === 'dir' ? (
                  <Folder size={14} color={colors.info} />
                ) : (
                  <File size={14} color={colors.textMuted} />
                )}
                <Text size="sm" numberOfLines={1} style={styles.flex}>
                  {item.path}
                </Text>
              </Pressable>
            ))
          : suggestions.items.map((item) => (
              <Pressable
                key={item.name}
                onPress={() => onPickCommand(item)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <Terminal size={14} color={colors.accent} />
                <View style={styles.flex}>
                  <Text size="sm" weight="medium">
                    /{item.name}
                  </Text>
                  {item.description ? (
                    <Text size="xs" color="textMuted" numberOfLines={1}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>
                <Text size="xs" color="textDim">
                  {SOURCE_LABEL[item.source]}
                </Text>
              </Pressable>
            ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  list: { maxHeight: 220 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  pressed: { backgroundColor: colors.surfaceRaised },
  flex: { flex: 1 },
  pad: { padding: space.md },
})

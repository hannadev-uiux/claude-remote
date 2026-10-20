import type { CommandItem, FileItem } from '@remote-harness/protocol'
import { AppWindow, File, Folder, Terminal } from 'lucide-react-native'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  SectionList,
  useWindowDimensions,
  View,
} from 'react-native'
import { useKeyboardHeight } from '@/core/platform/use-keyboard-height'
import { makeStyles, space, useTheme } from '@/core/theme'
import { Text } from '@/ui'
import { commandDescription } from './describe-command'
import type { PickableRow } from './keyboard'
import { suggestionListHeight } from './list-height'
import { type CommandRow, type CommandSection, highlightRuns } from './ranking'
import type { Suggestions } from './use-suggestions'

type Props = {
  suggestions: Suggestions
  onPickFile: (item: FileItem) => void
  onPickCommand: (item: CommandItem) => void
  /** Row Return / Tab would accept, drawn like a pressed row and kept in view. */
  highlighted?: PickableRow
}

export function SuggestionList({ suggestions, onPickFile, onPickCommand, highlighted }: Props) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const { height } = useWindowDimensions()
  const keyboardHeight = useKeyboardHeight()
  const fileList = useRef<ScrollView>(null)
  const fileRowY = useRef(new Map<string, number>())
  const commandList = useRef<SectionList<CommandRow, CommandSection>>(null)
  const highlightedFile = highlighted?.kind === 'file' ? highlighted.item.path : null
  const highlightedCommand = highlighted?.kind === 'command' ? highlighted.item.name : null
  useEffect(() => {
    if (highlightedFile === null) return
    const y = fileRowY.current.get(highlightedFile)
    if (y !== undefined) fileList.current?.scrollTo({ y: Math.max(0, y - 44), animated: true })
  }, [highlightedFile])
  // biome-ignore lint/correctness/useExhaustiveDependencies: only a new highlighted row scrolls.
  useEffect(() => {
    if (highlightedCommand === null || suggestions?.kind !== 'command') return
    suggestions.sections.forEach((section, sectionIndex) => {
      const itemIndex = section.data.findIndex((row) => row.item.name === highlightedCommand)
      if (itemIndex !== -1) {
        commandList.current?.scrollToLocation({ sectionIndex, itemIndex, viewPosition: 0.5 })
      }
    })
  }, [highlightedCommand])
  if (!suggestions) return null
  const maxHeight = suggestionListHeight(height, keyboardHeight)
  const empty =
    suggestions.kind === 'file' ? suggestions.items.length === 0 : suggestions.sections.length === 0
  const emptyText = suggestions.kind === 'command' ? t('autocomplete.noCommands') : t('autocomplete.empty')
  return (
    <View style={styles.wrap}>
      {suggestions.loading && empty ? (
        <ActivityIndicator color={colors.accentText} style={styles.pad} />
      ) : null}
      {!suggestions.loading && empty ? (
        <Text size="xs" color="textDim" style={styles.pad}>
          {emptyText}
        </Text>
      ) : null}
      {suggestions.kind === 'file' ? (
        <ScrollView ref={fileList} keyboardShouldPersistTaps="always" style={{ maxHeight }}>
          {suggestions.items.map((item) => (
            <Pressable
              key={item.path}
              onPress={() => onPickFile(item)}
              onLayout={(e) => fileRowY.current.set(item.path, e.nativeEvent.layout.y)}
              style={({ pressed }) => [
                styles.row,
                (pressed || item.path === highlightedFile) && styles.pressed,
              ]}
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
          ))}
        </ScrollView>
      ) : (
        <SectionList
          ref={commandList}
          sections={suggestions.sections}
          // Rows past the rendered window cannot be scrolled to yet; the highlight is still drawn.
          onScrollToIndexFailed={() => undefined}
          keyExtractor={(row) => row.item.name}
          keyboardShouldPersistTaps="always"
          stickySectionHeadersEnabled={false}
          initialNumToRender={12}
          style={{ maxHeight }}
          renderSectionHeader={({ section }) =>
            section.key === 'results' ? null : (
              <Text size="xs" color="textDim" weight="medium" style={styles.header}>
                {t(`autocomplete.section.${section.key}`)}
              </Text>
            )
          }
          renderItem={({ item: row }) => (
            <CommandRowView
              row={row}
              onPick={onPickCommand}
              highlighted={row.item.name === highlightedCommand}
            />
          )}
        />
      )}
    </View>
  )
}

function CommandRowView({
  row,
  onPick,
  highlighted,
}: {
  row: CommandRow
  onPick: (item: CommandItem) => void
  highlighted: boolean
}) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const { item } = row
  const description = commandDescription(item, t)
  return (
    <Pressable
      onPress={() => onPick(item)}
      accessibilityRole="button"
      accessibilityLabel={`/${item.name}${description ? `, ${description}` : ''}`}
      accessibilityHint={item.interactive ? t('autocomplete.interactive') : undefined}
      style={({ pressed }) => [styles.row, styles.commandRow, (pressed || highlighted) && styles.pressed]}
    >
      <Terminal size={14} color={colors.accentText} />
      <View style={styles.flex}>
        <Text size="sm" weight="medium" numberOfLines={1}>
          /
          {highlightRuns(item.name, row.indices).map((run, i) =>
            run.hit ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: runs are positional and never reorder
              <Text key={i} size="sm" weight="bold" color="accentText">
                {run.text}
              </Text>
            ) : (
              run.text
            ),
          )}
        </Text>
        {description ? (
          <Text size="xs" color="textMuted" numberOfLines={1}>
            {description}
          </Text>
        ) : null}
      </View>
      {item.interactive ? <AppWindow size={13} color={colors.textDim} /> : null}
      <Text size="xs" color="textDim">
        {t(`autocomplete.source.${item.source}`)}
      </Text>
    </Pressable>
  )
}

const useStyles = makeStyles((theme) => ({
  wrap: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  commandRow: { minHeight: 44 },
  header: {
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    paddingBottom: space.xxs,
    textTransform: 'uppercase',
  },
  pressed: { backgroundColor: theme.colors.surfaceRaised },
  flex: { flex: 1 },
  pad: { padding: space.md },
}))

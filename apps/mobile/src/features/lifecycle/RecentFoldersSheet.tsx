import type { ProjectItem } from '@remote-harness/protocol'
import { Folder, FolderGit2 } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, Modal, Pressable, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { fontSize, fonts, makeStyles, radius, space, useTheme } from '@/core/theme'
import { relativeTime, shortPath } from '@/core/utils/time'
import { Button, Text } from '@/ui'
import { recentDetail } from './new-session'
import { filterRecent, worktreeRoot } from './recent'

/** Every recent directory of the profile (worktrees one row each), with a search box. */
export function RecentFoldersSheet({
  visible,
  items,
  selected,
  onChoose,
  onClose,
}: {
  visible: boolean
  items: readonly ProjectItem[]
  selected: string
  onChoose: (cwd: string) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const insets = useSafeAreaInsets()
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (visible) setQuery('')
  }, [visible])

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}>
          <Text weight="bold">{t('newSession.recentSheet.title')}</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('newSession.recentSheet.search')}
            placeholderTextColor={colors.textDim}
            accessibilityLabel={t('newSession.recentSheet.search')}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={styles.input}
          />
          <FlatList
            data={filterRecent(items, query)}
            keyExtractor={(item) => item.cwd}
            style={styles.list}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const detail = recentDetail(item, t)
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={shortPath(item.cwd)}
                  onPress={() => onChoose(item.cwd)}
                  style={({ pressed }) => [
                    styles.row,
                    pressed && styles.pressed,
                    item.cwd === selected && styles.selected,
                  ]}
                >
                  {worktreeRoot(item.cwd) ? (
                    <FolderGit2 size={16} color={colors.accentText} />
                  ) : (
                    <Folder size={16} color={colors.info} />
                  )}
                  <View style={styles.flex}>
                    <Text size="sm" numberOfLines={1} ellipsizeMode="head">
                      {shortPath(item.cwd)}
                    </Text>
                    {detail ? (
                      <Text size="xs" color="textMuted" numberOfLines={1}>
                        {detail}
                      </Text>
                    ) : null}
                  </View>
                  <Text size="xs" color="textDim">
                    {relativeTime(item.lastUsedAt, t)}
                  </Text>
                </Pressable>
              )
            }}
            ListEmptyComponent={
              <Text size="sm" color="textDim" style={styles.centerText}>
                {t('newSession.recentSheet.empty')}
              </Text>
            }
          />
          <Button label={t('common.cancel')} variant="ghost" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const useStyles = makeStyles((theme) => ({
  backdrop: { flex: 1, backgroundColor: theme.colors.backdrop, justifyContent: 'flex-end' },
  sheet: {
    height: '80%',
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    gap: space.sm,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    color: theme.colors.text,
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
  },
  list: { flex: 1 },
  content: { gap: space.xs, paddingVertical: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  centerText: { textAlign: 'center' },
  pressed: { opacity: 0.7 },
  selected: { borderColor: theme.colors.accent },
  flex: { flex: 1 },
}))

import { ChevronRight, CornerLeftUp, Folder, FolderGit2 } from 'lucide-react-native'
import { type ReactNode, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, FlatList, Modal, Pressable, Switch, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { makeStyles, radius, space, useTheme } from '@/core/theme'
import { Button, Text } from '@/ui'
import { tildify } from './directory-input'
import { useDirectories } from './use-directories'

/**
 * Folder browser for the new-session directory: opens at `initialPath` (the home folder when it
 * cannot be listed), enters folders, goes up to the home folder at most, and chooses as `~/…`.
 */
export function DirectoryPickerSheet({
  visible,
  initialPath,
  onChoose,
  onClose,
}: {
  visible: boolean
  initialPath: string
  onChoose: (path: string) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const insets = useSafeAreaInsets()
  const [path, setPath] = useState(initialPath)
  // Folders visited before the current one, for "go back" when a folder cannot be opened.
  const [trail, setTrail] = useState<string[]>([])
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (!visible) return
    setPath(initialPath)
    setTrail([])
  }, [visible, initialPath])

  const listing = useDirectories(visible ? { path, hidden } : null)
  const data = listing.data

  // The typed directory may not exist (yet): start at the home folder instead.
  useEffect(() => {
    if (listing.isError && trail.length === 0 && path !== '~') setPath('~')
  }, [listing.isError, trail.length, path])

  const open = (next: string) => {
    setTrail((previous) => [...previous, path])
    setPath(next)
  }
  const back = () => {
    setPath(trail.at(-1) ?? '~')
    setTrail((previous) => previous.slice(0, -1))
  }

  const title = data ? tildify(data.path, data.home) : path

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}>
          <Text weight="bold">{t('newSession.picker.title')}</Text>
          <Text size="sm" color="textMuted" numberOfLines={1} ellipsizeMode="head">
            {title}
          </Text>

          {listing.isError ? (
            <View style={styles.center}>
              <Text size="sm" color="danger" style={styles.centerText}>
                {t('newSession.picker.error')}
              </Text>
              {trail.length > 0 ? (
                <Button label={t('newSession.picker.back')} variant="secondary" compact onPress={back} />
              ) : null}
            </View>
          ) : !data ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.textMuted} />
            </View>
          ) : (
            <FlatList
              data={data.items}
              keyExtractor={(item) => item.path}
              style={styles.list}
              contentContainerStyle={styles.content}
              ListHeaderComponent={
                data.parent ? (
                  <Row
                    icon={<CornerLeftUp size={16} color={colors.textMuted} />}
                    label={t('newSession.picker.up')}
                    muted
                    onPress={() => open(data.parent!)}
                  />
                ) : null
              }
              renderItem={({ item }) => (
                <Row
                  icon={
                    item.git ? (
                      <FolderGit2 size={16} color={colors.accentText} />
                    ) : (
                      <Folder size={16} color={colors.info} />
                    )
                  }
                  label={item.name}
                  onPress={() => open(item.path)}
                />
              )}
              ListEmptyComponent={
                <Text size="sm" color="textDim" style={styles.centerText}>
                  {t('newSession.picker.empty')}
                </Text>
              }
              ListFooterComponent={
                data.truncated ? (
                  <Text size="xs" color="textDim" style={styles.centerText}>
                    {t('newSession.picker.truncated', { count: data.items.length })}
                  </Text>
                ) : null
              }
            />
          )}

          <View style={styles.option}>
            <Text size="sm" style={styles.flex}>
              {t('newSession.picker.showHidden')}
            </Text>
            <Switch
              value={hidden}
              onValueChange={setHidden}
              accessibilityLabel={t('newSession.picker.showHidden')}
              trackColor={{ true: colors.accent, false: colors.borderStrong }}
            />
          </View>
          <Button
            label={t('newSession.picker.choose')}
            variant="primary"
            disabled={!data}
            onPress={() => data && onChoose(tildify(data.path, data.home))}
          />
          <Button label={t('common.cancel')} variant="ghost" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function Row({
  icon,
  label,
  muted,
  onPress,
}: {
  icon: ReactNode
  label: string
  muted?: boolean
  onPress: () => void
}) {
  const { colors } = useTheme()
  const styles = useStyles()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {icon}
      <Text size="sm" color={muted ? 'textMuted' : 'text'} numberOfLines={1} style={styles.flex}>
        {label}
      </Text>
      {muted ? null : <ChevronRight size={16} color={colors.textDim} />}
    </Pressable>
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
    backgroundColor: theme.colors.surfaceRaised,
  },
  pressed: { borderColor: theme.colors.accent },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
  centerText: { textAlign: 'center', padding: space.md },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.xs },
  flex: { flex: 1 },
}))

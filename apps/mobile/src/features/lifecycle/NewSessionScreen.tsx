import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Folder, FolderGit2, FolderSearch, GitBranch } from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native'
import { selectProfiles, useConnectionStore, useDaemonClient, useIsConnected } from '@/core/connection'
import { fontSize, fonts, makeStyles, radius, space, useTheme } from '@/core/theme'
import { relativeTime, shortPath } from '@/core/utils/time'
import { useDebounced } from '@/core/utils/use-debounced'
import { Button, Card, Screen, Text } from '@/ui'
import { DirectoryPickerSheet } from './DirectoryPickerSheet'
import {
  completeDirectory,
  directoryToBrowse,
  matchingSuggestions,
  splitDirectoryInput,
} from './directory-input'
import { INSPECT_BEFORE_START_MS, planStart, startErrorMessage, withTimeout } from './start-plan'
import { useDirectories, useDirectoriesSupported } from './use-directories'

/** Folder suggestions shown under the directory field. */
const MAX_SUGGESTIONS = 8

export function NewSessionScreen() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const client = useDaemonClient()
  const connected = useIsConnected()
  const profiles = useConnectionStore(selectProfiles)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [cwd, setCwd] = useState('')
  const [worktree, setWorktree] = useState(false)
  const [busy, setBusy] = useState(false)
  // Set synchronously so a second tap during the inspection or the launch is ignored.
  const starting = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profileId && profiles[0]) setProfileId(profiles[0].id)
  }, [profileId, profiles])

  const projects = useQuery({
    queryKey: ['projects', profileId],
    enabled: Boolean(client && connected && profileId),
    queryFn: async () => {
      const reply = await client!.request({ type: 'projects.list', profileId: profileId! })
      return reply.type === 'projects.results' ? reply.items : []
    },
  })

  // Which git checkout the directory belongs to and who already works in it. Older daemons answer
  // with an error: no warning and no worktree option (they would ignore `worktree`).
  const inspectedCwd = useDebounced(cwd.trim(), 400)
  const inspect = async (dir: string) => {
    const reply = await client!.request({ type: 'checkout.inspect', profileId: profileId!, cwd: dir })
    return reply.type === 'checkout.info' ? reply : null
  }
  const inspection = useQuery({
    queryKey: ['checkout', profileId, inspectedCwd],
    enabled: Boolean(client && connected && profileId && inspectedCwd),
    retry: false,
    queryFn: () => inspect(inspectedCwd),
  })
  const current = inspectedCwd === cwd.trim() ? inspection.data : undefined
  const checkout = current?.checkout ?? null
  const peers = current?.peers ?? []

  // Folder autocomplete: the listing may lag the text, so it is narrowed to what is typed now.
  const directoriesSupported = useDirectoriesSupported()
  // Cheap probe so an older daemon hides "Browse" before it is tapped.
  useDirectories({ path: '~', limit: 1 })
  const [focused, setFocused] = useState(false)
  const [picking, setPicking] = useState(false)
  const typed = splitDirectoryInput(cwd)
  const debouncedQuery = splitDirectoryInput(useDebounced(cwd, 250))
  const listing = useDirectories(
    focused && debouncedQuery
      ? {
          path: debouncedQuery.dir,
          prefix: debouncedQuery.prefix,
          hidden: debouncedQuery.prefix.startsWith('.'),
          limit: MAX_SUGGESTIONS,
        }
      : null,
    { keepPrevious: true },
  ).data
  const suggestions =
    focused && listing
      ? matchingSuggestions(
          {
            query: { dir: listing.request.path, prefix: listing.request.prefix ?? '' },
            items: listing.items,
          },
          typed,
          MAX_SUGGESTIONS,
        )
      : []

  const finish = () => {
    starting.current = false
    setBusy(false)
  }

  const launch = async (inWorktree: boolean) => {
    if (!client || !profileId || !cwd.trim()) return finish()
    setBusy(true)
    setError(null)
    try {
      await client.request({
        type: 'session.start',
        profileId,
        cwd: cwd.trim(),
        ...(inWorktree ? { worktree: true } : {}),
      })
      router.back()
    } catch (e) {
      setError(startErrorMessage(e, t))
    } finally {
      finish()
    }
  }

  const start = async () => {
    if (starting.current) return
    starting.current = true
    setBusy(true)
    setError(null)
    // Tapped before the debounced inspection of this directory came back: ask now, but never wait
    // long (an older or busy daemon must not leave the button looking dead).
    const info =
      current !== undefined ? current : await withTimeout(inspect(cwd.trim()), INSPECT_BEFORE_START_MS, null)
    const plan = planStart({ worktree, inCheckout: info?.checkout != null, peers: info?.peers.length ?? 0 })
    if (plan.action === 'launch') return void launch(plan.worktree)
    Alert.alert(
      t('newSession.confirmTitle'),
      t('newSession.confirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel', onPress: finish },
        { text: t('newSession.confirmWorktree'), onPress: () => void launch(true) },
        { text: t('newSession.confirmStart'), style: 'destructive', onPress: () => void launch(false) },
      ],
      { cancelable: true, onDismiss: finish },
    )
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text size="xs" color="textMuted">
          {t('newSession.profile')}
        </Text>
        <View style={styles.row}>
          {profiles.map((p) => (
            <Button
              key={p.id}
              label={p.name}
              compact
              variant={p.id === profileId ? 'primary' : 'secondary'}
              onPress={() => setProfileId(p.id)}
            />
          ))}
        </View>

        <Text size="xs" color="textMuted">
          {t('newSession.directory')}
        </Text>
        <View style={styles.inputRow}>
          <TextInput
            value={cwd}
            onChangeText={setCwd}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={t('newSession.placeholder')}
            placeholderTextColor={colors.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, styles.flex]}
          />
          {directoriesSupported ? (
            <Button
              label={t('newSession.browse')}
              compact
              variant="secondary"
              icon={<FolderSearch size={16} color={colors.text} />}
              onPress={() => setPicking(true)}
            />
          ) : null}
        </View>
        {typed && suggestions.length > 0 ? (
          <View style={styles.suggestions}>
            {suggestions.map((item) => (
              <Pressable
                key={item.path}
                accessibilityRole="button"
                accessibilityLabel={item.name}
                onPress={() => setCwd(completeDirectory(typed.dir, item.name))}
                style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}
              >
                {item.git ? (
                  <FolderGit2 size={14} color={colors.accentText} />
                ) : (
                  <Folder size={14} color={colors.info} />
                )}
                <Text size="sm" numberOfLines={1} style={styles.flex}>
                  {item.name}/
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {checkout ? (
          <View style={styles.branch}>
            <GitBranch size={14} color={colors.textMuted} />
            <Text size="xs" color="textMuted" numberOfLines={1} style={styles.flex}>
              {checkout.branch ?? t('newSession.detached')}
            </Text>
          </View>
        ) : null}
        {peers.length > 0 ? (
          <Card accent={colors.warning}>
            <Text color="warning" size="sm">
              {t('newSession.busy', { count: peers.length })}
            </Text>
            {peers.map((p) => (
              <Text key={p.id} size="sm" numberOfLines={1}>
                • {p.title || t('common.session')}
              </Text>
            ))}
          </Card>
        ) : null}
        {checkout ? (
          <View style={styles.option}>
            <View style={styles.flex}>
              <Text size="sm">{t('newSession.worktree')}</Text>
              <Text size="xs" color="textDim">
                {t('newSession.worktreeHint')}
              </Text>
            </View>
            <Switch
              value={worktree}
              onValueChange={setWorktree}
              accessibilityLabel={t('newSession.worktree')}
              trackColor={{ true: colors.accent, false: colors.borderStrong }}
            />
          </View>
        ) : null}
        <Button
          label={t('newSession.start')}
          variant="primary"
          loading={busy}
          disabled={!cwd.trim() || !profileId}
          onPress={() => void start()}
        />
        {error ? (
          <Card accent={colors.danger}>
            <Text color="danger" size="sm">
              {error}
            </Text>
          </Card>
        ) : null}

        <Text size="xs" color="textMuted" style={styles.section}>
          {t('newSession.recent')}
        </Text>
        {(projects.data ?? []).map((p) => (
          <Pressable
            key={p.cwd}
            onPress={() => setCwd(p.cwd)}
            style={({ pressed }) => [
              styles.project,
              pressed && styles.pressed,
              p.cwd === cwd && styles.selected,
            ]}
          >
            <Folder size={16} color={colors.info} />
            <Text size="sm" style={styles.flex} numberOfLines={1}>
              {shortPath(p.cwd)}
            </Text>
            <Text size="xs" color="textDim">
              {relativeTime(p.lastUsedAt, t)}
            </Text>
          </Pressable>
        ))}
        {projects.data?.length === 0 ? (
          <Text size="sm" color="textDim">
            {t('newSession.noRecent')}
          </Text>
        ) : null}
      </ScrollView>
      {directoriesSupported ? (
        <DirectoryPickerSheet
          visible={picking}
          initialPath={directoryToBrowse(cwd)}
          onChoose={(path) => {
            setCwd(path)
            setPicking(false)
          }}
          onClose={() => setPicking(false)}
        />
      ) : null}
    </Screen>
  )
}

const useStyles = makeStyles((theme) => ({
  content: { padding: space.lg, gap: space.sm },
  row: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  suggestions: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: radius.md,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    color: theme.colors.text,
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
  },
  section: { marginTop: space.lg },
  branch: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.xs },
  project: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  pressed: { opacity: 0.7 },
  selected: { borderColor: theme.colors.accent },
  flex: { flex: 1 },
}))

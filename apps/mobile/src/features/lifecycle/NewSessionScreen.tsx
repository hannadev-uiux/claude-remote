import { SESSION_NAME_MAX } from '@remote-harness/protocol'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { ChevronRight, Folder, FolderGit2, FolderSearch, GitBranch } from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native'
import { selectProfiles, useConnectionStore, useDaemonClient, useIsConnected } from '@/core/connection'
import { keyboardBehavior } from '@/core/platform/platform'
import { fontSize, fonts, makeStyles, radius, space, useTheme } from '@/core/theme'
import { AGENT_NAMES } from '@/core/theme/agents'
import { relativeTime, shortPath } from '@/core/utils/time'
import { useDebounced } from '@/core/utils/use-debounced'
import { keyboardOffset } from '@/features/conversation/autocorrect'
import { providerName } from '@/features/providers/logic'
import { ModelPickerSheet } from '@/features/providers/ModelPickerSheet'
import { ProfileProviderChip } from '@/features/providers/ProfileProviderChip'
import { useSessionsStore } from '@/features/sessions/store'
import { AgentBadge, Button, Card, Chip, Screen, Text } from '@/ui'
import { DirectoryPickerSheet } from './DirectoryPickerSheet'
import {
  completeDirectory,
  directoryToBrowse,
  matchingSuggestions,
  splitDirectoryInput,
} from './directory-input'
import {
  canStartInWorktree,
  cleanSessionName,
  nameSuggestions,
  profileAgent,
  profileDetail,
  recentDetail,
  worktreeCarryOver,
} from './new-session'
import { useOpenAfterCreateSettings } from './open-after-create-store'
import { RecentFoldersSheet } from './RecentFoldersSheet'
import { inlineRecent } from './recent'
import { INSPECT_BEFORE_START_MS, planStart, startErrorMessage, withTimeout } from './start-plan'
import { useDirectories, useDirectoriesSupported } from './use-directories'

/** Folder suggestions shown under the directory field. */
const MAX_SUGGESTIONS = 8

/**
 * Agent & profile (radio list with the agent badge) → Model (only when the provider lists models,
 * #109) → Directory (field, Browse, suggestions, branch) → Recent (three rows, worktrees folded into
 * their repository, and "See all", #221) → worktree toggle; Start sits in a footer above the keyboard.
 */
export function NewSessionScreen() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const client = useDaemonClient()
  const connected = useIsConnected()
  const profiles = useConnectionStore(selectProfiles)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [cwd, setCwd] = useState('')
  const [name, setName] = useState('')
  const [worktree, setWorktree] = useState(false)
  const [busy, setBusy] = useState(false)
  // Set synchronously so a second tap during the inspection or the launch is ignored.
  const starting = useRef(false)
  const [error, setError] = useState<string | null>(null)
  // Model picked for a profile with a provider; cleared when the profile changes.
  const [model, setModel] = useState<string | null>(null)
  const [modelPicking, setModelPicking] = useState(false)
  const selectedProfile = profiles.find((p) => p.id === profileId) ?? null
  const provider = providerName(selectedProfile)
  const openAfterCreate = useOpenAfterCreateSettings((s) => s.enabled)
  // Set once `session.started` came back with no `sessionId` yet: the pane whose session we're
  // waiting to register, so we can navigate in as soon as it appears in the sessions store.
  const [startingPane, setStartingPane] = useState<string | null>(null)
  const sessions = useSessionsStore((s) => s.sessions)

  // biome-ignore lint/correctness/useExhaustiveDependencies: `finish` only resets setters/refs.
  useEffect(() => {
    if (!startingPane) return
    const started = Object.values(sessions).find((s) => s.paneId === startingPane)
    if (!started) return
    setStartingPane(null)
    finish()
    router.replace({ pathname: '/session/[id]', params: { id: started.id, autofocus: '1' } })
  }, [startingPane, sessions])

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
  const worktreeAllowed = selectedProfile ? canStartInWorktree(profileAgent(selectedProfile)) : false
  const peers = current?.peers ?? []
  const carryOver = worktreeCarryOver(current?.worktreeCopy, t)
  const nameChips = cwd.trim()
    ? nameSuggestions(checkout?.branch ?? null, Object.values(sessions), cwd.trim())
    : []

  // Folder autocomplete: the listing may lag the text, so it is narrowed to what is typed now.
  const directoriesSupported = useDirectoriesSupported()
  // Cheap probe so an older daemon hides "Browse" before it is tapped.
  useDirectories({ path: '~', limit: 1 })
  const [focused, setFocused] = useState(false)
  const [picking, setPicking] = useState(false)
  const [allRecent, setAllRecent] = useState(false)
  // Where the form starts in the window: the keyboard offset that keeps the Start footer above it.
  const anchor = useRef<View>(null)
  const [windowY, setWindowY] = useState<number | null>(null)
  const recent = projects.data ?? []
  const { rows: recentRows, more: hiddenRecent } = inlineRecent(recent)
  const chooseRecent = (dir: string) => {
    setCwd(dir)
    setAllRecent(false)
    Keyboard.dismiss()
  }
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
    const sessionName = cleanSessionName(name)
    try {
      const reply = await client.request({
        type: 'session.start',
        profileId,
        cwd: cwd.trim(),
        ...(inWorktree ? { worktree: true } : {}),
        ...(model ? { model } : {}),
        ...(sessionName ? { name: sessionName } : {}),
      })
      const started = reply.type === 'session.started' ? reply : null
      if (openAfterCreate && started && !started.sessionId) {
        // Not registered yet: keep the busy state and wait for it in the effect above, instead
        // of `finish()`-ing here (a `finally` would run even on this early return).
        setStartingPane(started.paneId)
        return
      }
      if (openAfterCreate && started?.sessionId) {
        router.replace({ pathname: '/session/[id]', params: { id: started.sessionId, autofocus: '1' } })
      } else {
        router.back()
      }
      finish()
    } catch (e) {
      setError(startErrorMessage(e, t))
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
    const plan = planStart({
      worktree: worktree && worktreeAllowed,
      inCheckout: info?.checkout != null,
      peers: info?.peers.length ?? 0,
    })
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
      <View
        ref={anchor}
        style={styles.flex}
        onLayout={() => anchor.current?.measureInWindow((_x, y) => setWindowY(y))}
      >
        <KeyboardAvoidingView
          behavior={keyboardBehavior(Platform.OS)}
          keyboardVerticalOffset={keyboardOffset(windowY)}
          style={styles.flex}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text size="xs" color="textMuted">
              {t('newSession.profile')}
            </Text>
            <View style={styles.list}>
              {profiles.map((p) => {
                const selected = p.id === profileId
                return (
                  <Pressable
                    key={p.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      if (p.id !== profileId) setModel(null)
                      setProfileId(p.id)
                    }}
                    style={({ pressed }) => [
                      styles.profile,
                      selected && styles.selected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <AgentBadge agent={profileAgent(p)} />
                    <View style={styles.flex}>
                      <View style={styles.nameRow}>
                        <Text
                          weight="medium"
                          numberOfLines={1}
                          style={[styles.shrink, { color: p.color || colors.text }]}
                        >
                          {p.name}
                        </Text>
                        <ProfileProviderChip profile={p} />
                      </View>
                      <Text size="xs" color="textMuted" numberOfLines={1}>
                        {profileDetail(p)}
                      </Text>
                    </View>
                    <Text color={selected ? 'accentText' : 'textDim'}>{selected ? '●' : '○'}</Text>
                  </Pressable>
                )
              })}
            </View>
            {provider && selectedProfile ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('newSession.model')}
                onPress={() => setModelPicking(true)}
                style={({ pressed }) => [styles.modelRow, pressed && styles.pressed]}
              >
                <View style={styles.flex}>
                  <Text size="xs" color="textMuted">
                    {t('newSession.model')}
                  </Text>
                  <Text size="sm" numberOfLines={1}>
                    {model ?? selectedProfile.provider?.model ?? t('newSession.modelDefault')}
                  </Text>
                </View>
                <ChevronRight size={16} color={colors.textDim} />
              </Pressable>
            ) : null}

            <Text size="xs" color="textMuted" style={styles.section}>
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
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                accessibilityLabel={t('newSession.directory')}
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

            <Text size="xs" color="textMuted" style={styles.section}>
              {t('newSession.name')}
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('newSession.namePlaceholder')}
              placeholderTextColor={colors.textDim}
              maxLength={SESSION_NAME_MAX}
              returnKeyType="done"
              accessibilityLabel={t('newSession.name')}
              style={styles.input}
            />
            {nameChips.length > 0 ? (
              <View style={styles.chips}>
                {nameChips.map((chip) => (
                  <Chip
                    key={chip}
                    label={chip}
                    selected={chip === name.trim()}
                    onPress={() => setName(chip)}
                  />
                ))}
              </View>
            ) : null}

            <Text size="xs" color="textMuted" style={styles.section}>
              {t('newSession.recent')}
            </Text>
            {recentRows.map((p) => {
              const detail = recentDetail(p, t)
              return (
                <Pressable
                  key={p.cwd}
                  accessibilityRole="button"
                  onPress={() => chooseRecent(p.cwd)}
                  style={({ pressed }) => [
                    styles.project,
                    pressed && styles.pressed,
                    p.cwd === cwd && styles.selected,
                  ]}
                >
                  {p.worktrees > 0 ? (
                    <FolderGit2 size={16} color={colors.accentText} />
                  ) : (
                    <Folder size={16} color={colors.info} />
                  )}
                  <View style={styles.flex}>
                    <Text size="sm" numberOfLines={1} ellipsizeMode="head">
                      {shortPath(p.cwd)}
                    </Text>
                    {detail ? (
                      <Text size="xs" color="textMuted" numberOfLines={1}>
                        {detail}
                      </Text>
                    ) : null}
                  </View>
                  <Text size="xs" color="textDim">
                    {relativeTime(p.lastUsedAt, t)}
                  </Text>
                </Pressable>
              )
            })}
            {hiddenRecent ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setAllRecent(true)}
                style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]}
              >
                <Text size="sm" color="accentText" style={styles.flex}>
                  {t('newSession.seeAllRecent', { count: recent.length })}
                </Text>
                <ChevronRight size={16} color={colors.textDim} />
              </Pressable>
            ) : null}
            {projects.data?.length === 0 ? (
              <Text size="sm" color="textDim">
                {t('newSession.noRecent')}
              </Text>
            ) : null}

            {checkout && worktreeAllowed ? (
              <View style={[styles.option, styles.section]}>
                <View style={styles.flex}>
                  <Text size="sm">{t('newSession.worktree')}</Text>
                  <Text size="xs" color="textDim">
                    {t('newSession.worktreeHint')}
                  </Text>
                  {carryOver.items.length > 0 ? (
                    <Text size="xs" color="textMuted">
                      {t('newSession.carryOver', { items: carryOver.items.join(' · ') })}
                    </Text>
                  ) : null}
                  {carryOver.hint ? (
                    <Text size="xs" color="textDim">
                      {carryOver.hint}
                    </Text>
                  ) : null}
                </View>
                <Switch
                  value={worktree}
                  onValueChange={setWorktree}
                  accessibilityLabel={t('newSession.worktree')}
                  trackColor={{ true: colors.accent, false: colors.borderStrong }}
                />
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
                <Text size="xs" color="textMuted">
                  {t('newSession.busyHint')}
                </Text>
              </Card>
            ) : null}
            {error ? (
              <Card accent={colors.danger}>
                <Text color="danger" size="sm">
                  {error}
                </Text>
              </Card>
            ) : null}
          </ScrollView>
          <View style={styles.footer}>
            <Button
              label={t('newSession.start')}
              variant="primary"
              loading={busy}
              disabled={!cwd.trim() || !profileId}
              onPress={() => void start()}
            />
            {startingPane ? (
              <Text size="sm" color="textMuted">
                {t('newSession.starting', {
                  agent: selectedProfile ? AGENT_NAMES[profileAgent(selectedProfile)] : '',
                  path: shortPath(cwd.trim()),
                })}
              </Text>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </View>
      <RecentFoldersSheet
        visible={allRecent}
        items={recent}
        selected={cwd}
        onChoose={chooseRecent}
        onClose={() => setAllRecent(false)}
      />
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
      {provider && profileId ? (
        <ModelPickerSheet
          visible={modelPicking}
          profileId={profileId}
          selected={model ?? selectedProfile?.provider?.model ?? null}
          onChoose={(id) => {
            setModel(id)
            setModelPicking(false)
          }}
          onClose={() => setModelPicking(false)}
        />
      ) : null}
    </Screen>
  )
}

const useStyles = makeStyles((theme) => ({
  content: { padding: space.lg, gap: space.sm },
  list: { gap: space.xs },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
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
  section: { marginTop: space.md },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  shrink: { flexShrink: 1 },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    marginTop: space.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  branch: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
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
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  footer: {
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  pressed: { opacity: 0.7 },
  selected: { borderColor: theme.colors.accent },
  flex: { flex: 1 },
}))

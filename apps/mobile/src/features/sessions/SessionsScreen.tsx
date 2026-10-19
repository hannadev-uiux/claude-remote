import type { Session } from '@remote-harness/protocol'
import { FlashList, type FlashListRef } from '@shopify/flash-list'
import * as Clipboard from 'expo-clipboard'
import { router } from 'expo-router'
import { Bell, BellOff, Ellipsis, EyeOff, type LucideIcon, Pin, PinOff, Power } from 'lucide-react-native'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, RefreshControl, ScrollView, TextInput, View } from 'react-native'
import { addListener, constants } from 'react-native-key-command'
import { selectProfiles, useConnectionStore, useDaemonClient } from '@/core/connection'
import { errorMessage } from '@/core/connection/error-message'
import { makeStyles, space, useTheme } from '@/core/theme'
import { Button, Chip, ConnectionBanner, DaemonUpdateBanner, EmptyState, Screen, Text } from '@/ui'
import { setMuted, useMuteStore } from '../mute/store'
import { WaitingStrip } from '../permissions/components/WaitingStrip'
import { NestedSubagents } from '../subagents/SubagentList'
import { type SessionAction, sessionActions, swipeSides } from './actions'
import { sharedCheckoutCounts } from './checkout'
import { CloseSessionSheet } from './components/CloseSessionSheet'
import { MachineLine } from './components/MachineLine'
import { SessionActionsSheet } from './components/SessionActionsSheet'
import { SessionRow } from './components/SessionRow'
import { SessionSearch } from './components/SessionSearch'
import { closeOpenRow, type SwipeAction, SwipeableRow, type SwipeTone } from './components/SwipeableRow'
import { isFiltering, listSessions, NO_FILTER, type SessionFilter, type StateFilter } from './filter'
import { moveCursor } from './keyboard-nav'
import { setHidden, setPinned, useSessionPrefsStore } from './prefs-store'
import { setSessionSort, useSessionSortStore } from './sort-store'
import { refreshSessions, useSessionsStore } from './store'

type Props = {
  pendingBySession?: Record<string, number>
  selectedSessionId?: string | null
  /** Arrow keys + Enter navigate the list — only makes sense when shown as the master pane. */
  interactive?: boolean
}

type SwipeKey = SessionAction | 'more'

const SWIPE_LOOK: Record<SwipeKey, { icon: LucideIcon; tone: SwipeTone }> = {
  close: { icon: Power, tone: 'danger' },
  hide: { icon: EyeOff, tone: 'muted' },
  more: { icon: Ellipsis, tone: 'muted' },
  mute: { icon: BellOff, tone: 'accent' },
  unmute: { icon: Bell, tone: 'accent' },
  pin: { icon: Pin, tone: 'info' },
  unpin: { icon: PinOff, tone: 'info' },
  // Never on a swipe side; listed so the record stays exhaustive.
  resume: { icon: Power, tone: 'muted' },
  cleanup: { icon: Power, tone: 'muted' },
  copyPath: { icon: Power, tone: 'muted' },
}

export function SessionsScreen({
  pendingBySession = {},
  selectedSessionId = null,
  interactive = false,
}: Props) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const client = useDaemonClient()
  const profiles = useConnectionStore(selectProfiles)
  const sessions = useSessionsStore((s) => s.sessions)
  const loaded = useSessionsStore((s) => s.loaded)
  const refreshing = useSessionsStore((s) => s.refreshing)
  const muted = useMuteStore()
  const prefs = useSessionPrefsStore()
  const [filter, setFilter] = useState<SessionFilter>(NO_FILTER)
  const [keyboardCursor, setKeyboardCursor] = useState<string | null>(null)
  const [actionsFor, setActionsFor] = useState<Session | null>(null)
  const [closing, setClosing] = useState<{ session: Session; mode: 'close' | 'cleanup' } | null>(null)
  const listRef = useRef<FlashListRef<Session>>(null)

  // A new filter is a new list: start from the top.
  const changeFilter = (patch: Partial<SessionFilter>) => {
    setFilter((current) => ({ ...current, ...patch }))
    listRef.current?.scrollToOffset({ offset: 0, animated: false })
  }
  const toggleState = (state: Exclude<StateFilter, 'all'>) =>
    changeFilter({ state: filter.state === state ? 'all' : state })

  const sort = useSessionSortStore((s) => s.sort)
  const items = useMemo(
    () => listSessions(Object.values(sessions), filter, sort, prefs),
    [sessions, filter, sort, prefs],
  )
  const profilesById = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles])
  const sharedCheckout = useMemo(() => sharedCheckoutCounts(Object.values(sessions)), [sessions])
  const sessionIds = useMemo(() => items.map((session) => session.id), [items])
  const sessionIdsRef = useRef(sessionIds)
  sessionIdsRef.current = sessionIds
  const keyboardCursorRef = useRef(keyboardCursor)
  keyboardCursorRef.current = keyboardCursor

  useEffect(() => {
    if (!interactive) return
    const unsubscribers = [
      addListener({ input: constants.keyInputDownArrow }, () => {
        if (TextInput.State.currentlyFocusedInput()) return
        setKeyboardCursor(moveCursor(sessionIdsRef.current, keyboardCursorRef.current, 1))
      }),
      addListener({ input: constants.keyInputUpArrow }, () => {
        if (TextInput.State.currentlyFocusedInput()) return
        setKeyboardCursor(moveCursor(sessionIdsRef.current, keyboardCursorRef.current, -1))
      }),
      addListener({ input: constants.keyInputEnter }, () => {
        if (TextInput.State.currentlyFocusedInput()) return
        const id = keyboardCursorRef.current
        if (id) router.push({ pathname: '/session/[id]', params: { id } })
      }),
    ]
    return () => {
      unsubscribers.forEach((unsubscribe) => {
        unsubscribe()
      })
    }
  }, [interactive])

  const onRefresh = () => {
    if (client) void refreshSessions(client).catch(() => undefined)
  }

  const isMuted = (session: Session) =>
    muted.sessions.includes(session.id) || muted.profiles.includes(session.profileId)
  const isPinned = (session: Session) => prefs.pinned.includes(session.id)
  const fail = (error: unknown) => Alert.alert(t('sessionActions.failed'), errorMessage(error, t))

  const act = (session: Session, action: SwipeKey) => {
    setActionsFor(action === 'more' ? session : null)
    switch (action) {
      case 'close':
        setClosing({ session, mode: 'close' })
        break
      case 'cleanup':
        setClosing({ session, mode: 'cleanup' })
        break
      case 'resume':
        if (!client) return
        client
          .request({ type: 'session.resume', profileId: session.profileId, sessionId: session.id })
          .then(() => router.push({ pathname: '/session/[id]', params: { id: session.id } }), fail)
        break
      case 'mute':
      case 'unmute':
        if (client) setMuted(client, 'session', session.id, action === 'mute').catch(fail)
        break
      case 'pin':
      case 'unpin':
        void setPinned(session.id, action === 'pin')
        break
      case 'hide':
        void setHidden(session.id, true)
        break
      case 'copyPath':
        void Clipboard.setStringAsync(session.cwd)
        break
      case 'more':
        break
    }
  }

  const swipeAction = (session: Session, key: SwipeKey): SwipeAction => ({
    key,
    label: t(`sessionActions.short.${key}` as const),
    ...SWIPE_LOOK[key],
    onPress: () => act(session, key),
  })

  return (
    <Screen>
      <ConnectionBanner />
      <DaemonUpdateBanner />
      <MachineLine sessions={items} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.filterBar}
        contentContainerStyle={styles.filters}
      >
        {profiles.length > 1 ? (
          <>
            <Chip
              label={t('sessions.all')}
              selected={filter.profileId === null}
              onPress={() => changeFilter({ profileId: null })}
            />
            {profiles.map((p) => (
              <Chip
                key={p.id}
                label={p.name}
                selected={filter.profileId === p.id}
                onPress={() => changeFilter({ profileId: filter.profileId === p.id ? null : p.id })}
              />
            ))}
            <View style={styles.divider} />
          </>
        ) : null}
        <Chip
          label={t('sessions.active')}
          selected={filter.state === 'active'}
          onPress={() => toggleState('active')}
        />
        <Chip
          label={t('sessions.ended')}
          selected={filter.state === 'ended'}
          onPress={() => toggleState('ended')}
        />
        <View style={styles.divider} />
        <Chip
          ghost
          label={`${t(`sessions.sort.${sort}`)} ▾`}
          onPress={() => {
            void setSessionSort(sort === 'recent' ? 'state' : 'recent')
            listRef.current?.scrollToOffset({ offset: 0, animated: false })
          }}
        />
      </ScrollView>
      <SessionSearch value={filter.query} onChange={(query) => changeFilter({ query })} />
      <View style={styles.strip}>
        <WaitingStrip />
      </View>
      <FlashList<Session>
        ref={listRef}
        data={items}
        extraData={[muted, prefs]}
        // On by default in FlashList 2: when a filter brings other sessions back, it kept the list
        // anchored to the last rows, with the rest above the viewport.
        maintainVisibleContentPosition={{ disabled: true }}
        keyExtractor={(session) => session.id}
        onScrollBeginDrag={closeOpenRow}
        renderItem={({ item: session }) => {
          const sides = swipeSides(session, { muted: isMuted(session), pinned: isPinned(session) })
          return (
            <>
              <SwipeableRow
                start={sides.start.map((key) => swipeAction(session, key))}
                end={sides.end.map((key) => swipeAction(session, key))}
              >
                <SessionRow
                  session={session}
                  profile={profilesById.get(session.profileId)}
                  muted={isMuted(session)}
                  pinned={isPinned(session)}
                  pendingPermissions={pendingBySession[session.id] ?? 0}
                  sharedCheckout={sharedCheckout[session.id] ?? 0}
                  selected={session.id === selectedSessionId}
                  keyboardFocused={session.id === keyboardCursor}
                  onLongPress={() => {
                    closeOpenRow()
                    setActionsFor(session)
                  }}
                />
              </SwipeableRow>
              <NestedSubagents sessionId={session.id} subagents={session.subagents} />
            </>
          )
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={
          loaded && isFiltering(filter) && Object.keys(sessions).length > 0 ? (
            <EmptyState title={t('sessions.noMatch')}>
              <Button label={t('sessions.clearFilters')} onPress={() => changeFilter(NO_FILTER)} />
            </EmptyState>
          ) : loaded ? (
            <EmptyState title={t('sessions.emptyTitle')}>
              <Text color="textMuted">{t('sessions.emptyBody')}</Text>
              <View style={styles.code}>
                {(profiles.length > 0 ? profiles.map((p) => p.id) : ['claudin']).map((alias) => (
                  <Text key={alias} color="accentText">
                    $ {alias}
                  </Text>
                ))}
              </View>
              <Text size="sm" color="textDim">
                {t('sessions.emptyHint')}
              </Text>
            </EmptyState>
          ) : null
        }
        contentContainerStyle={styles.list}
      />
      <SessionActionsSheet
        session={actionsFor}
        profile={actionsFor ? profilesById.get(actionsFor.profileId) : undefined}
        items={
          actionsFor
            ? sessionActions(actionsFor, { muted: isMuted(actionsFor), pinned: isPinned(actionsFor) }, t)
            : []
        }
        onSelect={(action) => {
          if (actionsFor) act(actionsFor, action)
        }}
        onClose={() => setActionsFor(null)}
      />
      {closing ? (
        <CloseSessionSheet session={closing.session} mode={closing.mode} onDone={() => setClosing(null)} />
      ) : null}
    </Screen>
  )
}

const useStyles = makeStyles((theme) => ({
  // A horizontal ScrollView grows to fill a column parent; keep it at the height of the chips.
  filterBar: { flexGrow: 0 },
  filters: { gap: space.xs, paddingHorizontal: space.lg, paddingBottom: space.sm, alignItems: 'center' },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: theme.colors.border,
    marginHorizontal: space.xs,
  },
  strip: { paddingTop: space.sm },
  list: { paddingTop: space.sm, paddingBottom: space.xxl },
  code: { backgroundColor: theme.colors.surface, padding: space.md, borderRadius: 8, gap: space.xs },
}))

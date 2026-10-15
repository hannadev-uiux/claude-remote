import { FlashList, type FlashListRef } from '@shopify/flash-list'
import { router } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { addListener, constants } from 'react-native-key-command'
import { selectProfiles, useConnectionStore, useDaemonClient } from '@/core/connection'
import { colors, space } from '@/core/theme'
import { Button, ConnectionBanner, DaemonUpdateBanner, EmptyState, Screen, Text } from '@/ui'
import { NestedSubagents } from '../subagents/SubagentList'
import { ProfileHeader } from './components/ProfileHeader'
import { SessionRow } from './components/SessionRow'
import { SessionSearch } from './components/SessionSearch'
import {
  flattenSections,
  groupSessions,
  isFiltering,
  NO_FILTER,
  type SessionFilter,
  type SessionListItem,
  type StateFilter,
} from './grouping'
import { moveCursor } from './keyboard-nav'
import { refreshSessions, useSessionsStore } from './store'

type Props = {
  pendingBySession?: Record<string, number>
  selectedSessionId?: string | null
  /** Arrow keys + Enter navigate the list — only makes sense when shown as the master pane. */
  interactive?: boolean
}

export function SessionsScreen({
  pendingBySession = {},
  selectedSessionId = null,
  interactive = false,
}: Props) {
  const { t } = useTranslation()
  const client = useDaemonClient()
  const profiles = useConnectionStore(selectProfiles)
  const sessions = useSessionsStore((s) => s.sessions)
  const loaded = useSessionsStore((s) => s.loaded)
  const refreshing = useSessionsStore((s) => s.refreshing)
  const [filter, setFilter] = useState<SessionFilter>(NO_FILTER)
  const [keyboardCursor, setKeyboardCursor] = useState<string | null>(null)
  const listRef = useRef<FlashListRef<SessionListItem>>(null)

  // A new filter is a new list: start from the top.
  const changeFilter = (patch: Partial<SessionFilter>) => {
    setFilter((current) => ({ ...current, ...patch }))
    listRef.current?.scrollToOffset({ offset: 0, animated: false })
  }
  const toggleState = (state: Exclude<StateFilter, 'all'>) =>
    changeFilter({ state: filter.state === state ? 'all' : state })

  const items = useMemo(
    () => flattenSections(groupSessions(Object.values(sessions), profiles, filter)),
    [sessions, profiles, filter],
  )
  const sessionIds = useMemo(
    () => items.flatMap((item) => (item.type === 'session' ? [item.session.id] : [])),
    [items],
  )
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

  return (
    <Screen>
      <ConnectionBanner />
      <DaemonUpdateBanner />
      <SessionSearch value={filter.query} onChange={(query) => changeFilter({ query })} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.filterBar}
        contentContainerStyle={styles.filters}
      >
        {profiles.length > 1 ? (
          <>
            <Button
              label={t('sessions.all')}
              compact
              variant={filter.profileId === null ? 'primary' : 'secondary'}
              onPress={() => changeFilter({ profileId: null })}
            />
            {profiles.map((p) => (
              <Button
                key={p.id}
                label={p.name}
                compact
                variant={filter.profileId === p.id ? 'primary' : 'secondary'}
                onPress={() => changeFilter({ profileId: filter.profileId === p.id ? null : p.id })}
              />
            ))}
            <View style={styles.divider} />
          </>
        ) : null}
        <Button
          label={t('sessions.active')}
          compact
          variant={filter.state === 'active' ? 'primary' : 'secondary'}
          onPress={() => toggleState('active')}
        />
        <Button
          label={t('sessions.ended')}
          compact
          variant={filter.state === 'ended' ? 'primary' : 'secondary'}
          onPress={() => toggleState('ended')}
        />
      </ScrollView>
      <FlashList<SessionListItem>
        ref={listRef}
        data={items}
        // On by default in FlashList 2: when a filter brings the other profiles back, it kept the
        // list anchored to the last profile's rows, with the rest above the viewport.
        maintainVisibleContentPosition={{ disabled: true }}
        keyExtractor={(item) => (item.type === 'header' ? `h:${item.profile.id}` : item.session.id)}
        getItemType={(item) => item.type}
        renderItem={({ item }) =>
          item.type === 'header' ? (
            <ProfileHeader profile={item.profile} count={item.count} />
          ) : (
            <>
              <SessionRow
                session={item.session}
                pendingPermissions={pendingBySession[item.session.id] ?? 0}
                selected={item.session.id === selectedSessionId}
                keyboardFocused={item.session.id === keyboardCursor}
              />
              <NestedSubagents sessionId={item.session.id} subagents={item.session.subagents} />
            </>
          )
        }
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
                  <Text key={alias} color="accent">
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
    </Screen>
  )
}

const styles = StyleSheet.create({
  // A horizontal ScrollView grows to fill a column parent; keep it at the height of the chips.
  filterBar: { flexGrow: 0 },
  filters: { gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm, alignItems: 'center' },
  divider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.border, marginHorizontal: space.xs },
  list: { paddingBottom: space.xxl },
  code: { backgroundColor: colors.surface, padding: space.md, borderRadius: 8, gap: space.xs },
})

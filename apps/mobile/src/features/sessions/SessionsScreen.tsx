import { FlashList } from '@shopify/flash-list'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { selectProfiles, useConnectionStore, useDaemonClient } from '@/core/connection'
import { colors, space } from '@/core/theme'
import { Button, ConnectionBanner, EmptyState, Screen, Text } from '@/ui'
import { NestedSubagents } from '../subagents/SubagentList'
import { ProfileHeader } from './components/ProfileHeader'
import { SessionRow } from './components/SessionRow'
import { flattenSections, groupSessions, type SessionListItem } from './grouping'
import { refreshSessions, useSessionsStore } from './store'

export function SessionsScreen({ pendingBySession = {} }: { pendingBySession?: Record<string, number> }) {
  const { t } = useTranslation()
  const client = useDaemonClient()
  const profiles = useConnectionStore(selectProfiles)
  const sessions = useSessionsStore((s) => s.sessions)
  const loaded = useSessionsStore((s) => s.loaded)
  const refreshing = useSessionsStore((s) => s.refreshing)
  const [filter, setFilter] = useState<string | null>(null)

  const items = useMemo(
    () => flattenSections(groupSessions(Object.values(sessions), profiles, filter)),
    [sessions, profiles, filter],
  )

  const onRefresh = () => {
    if (client) void refreshSessions(client).catch(() => undefined)
  }

  return (
    <Screen>
      <ConnectionBanner />
      {profiles.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterBar}
          contentContainerStyle={styles.filters}
        >
          <Button
            label={t('sessions.all')}
            compact
            variant={filter === null ? 'primary' : 'secondary'}
            onPress={() => setFilter(null)}
          />
          {profiles.map((p) => (
            <Button
              key={p.id}
              label={p.name}
              compact
              variant={filter === p.id ? 'primary' : 'secondary'}
              onPress={() => setFilter(filter === p.id ? null : p.id)}
            />
          ))}
        </ScrollView>
      ) : null}
      <FlashList<SessionListItem>
        data={items}
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
              />
              <NestedSubagents sessionId={item.session.id} subagents={item.session.subagents} />
            </>
          )
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        ListEmptyComponent={
          loaded ? (
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
  list: { paddingBottom: space.xxl },
  code: { backgroundColor: colors.surface, padding: space.md, borderRadius: 8, gap: space.xs },
})

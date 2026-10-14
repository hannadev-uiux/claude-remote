import { FlashList } from '@shopify/flash-list'
import { useMemo, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { useConnectionStore, useDaemonClient } from '@/core/connection'
import { colors, space } from '@/core/theme'
import { Button, ConnectionBanner, EmptyState, Screen, Text } from '@/ui'
import { NestedSubagents } from '../subagents/SubagentList'
import { ProfileHeader } from './components/ProfileHeader'
import { SessionRow } from './components/SessionRow'
import { flattenSections, groupSessions, type SessionListItem } from './grouping'
import { refreshSessions, useSessionsStore } from './store'

export function SessionsScreen({ pendingBySession = {} }: { pendingBySession?: Record<string, number> }) {
  const client = useDaemonClient()
  const profiles = useConnectionStore((s) => s.hello?.profiles ?? [])
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          <Button
            label="todos"
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
            <EmptyState title="Nenhuma sessão">
              <Text color="textMuted">Inicie uma sessão no Mac usando os launchers:</Text>
              <View style={styles.code}>
                <Text color="accent">$ claudin</Text>
                <Text color="accent">$ drclaude</Text>
              </View>
              <Text size="sm" color="textDim">
                Sessões abertas com o `claude` puro aparecem como somente leitura.
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
  filters: { gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm },
  list: { paddingBottom: space.xxl },
  code: { backgroundColor: colors.surface, padding: space.md, borderRadius: 8, gap: space.xs },
})

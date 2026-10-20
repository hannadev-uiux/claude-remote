import type { PermissionRequestInfo } from '@remote-harness/protocol'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, View } from 'react-native'
import { selectProfiles, useConnectionStore } from '@/core/connection'
import { makeStyles, radius, space } from '@/core/theme'
import { formatElapsed } from '@/core/utils/time'
import { useNow } from '@/core/utils/use-now'
import { sessionAgent } from '@/features/sessions/agent'
import { useSessionsStore } from '@/features/sessions/store'
import { AgentBadge, Button, ProfileTag, Text } from '@/ui'
import { describePermission } from '../describe'
import { usePermissionsStore } from '../store'
import { pendingForStrip, type StripItem, stripSessionId } from '../strip'
import { useRespond } from '../use-respond'
import { AlwaysAllowSheet } from './AlwaysAllowSheet'

function openSession(id: string) {
  router.push({ pathname: '/session/[id]', params: { id } })
}

/**
 * Pinned above the session list while something waits for the user: the oldest pending request
 * with the same Deny / Always / Allow flow as the session screen (questions, plans and waiting
 * sessions without a request get an Open button), the number of sessions waiting and a live
 * elapsed time. The list order below is untouched.
 */
export function WaitingStrip() {
  const { t } = useTranslation()
  const styles = useStyles()
  const sessions = useSessionsStore((s) => s.sessions)
  const pending = usePermissionsStore((s) => s.pending)
  const profiles = useConnectionStore(selectProfiles)
  const strip = useMemo(
    () => pendingForStrip(Object.values(sessions), Object.values(pending)),
    [sessions, pending],
  )
  const now = useNow(1000)
  const { respond, busy, error } = useRespond()
  const [always, setAlways] = useState<PermissionRequestInfo | null>(null)
  if (!strip) return null

  const { oldest } = strip
  const session = oldest.kind === 'request' ? oldest.session : oldest.session
  const sessionId = stripSessionId(oldest)
  const profileId = session?.profileId ?? (oldest.kind === 'request' ? oldest.request.profileId : '')
  const profile = profiles.find((p) => p.id === profileId)
  const agent = session ? sessionAgent(session) : null
  const request = oldest.kind === 'request' ? oldest.request : null
  const answerable = request !== null && !request.interaction && !request.terminal
  const status = request?.terminal
    ? t('permissions.strip.terminal')
    : request?.interaction?.kind === 'question'
      ? t('permissions.strip.question')
      : request?.interaction?.kind === 'plan'
        ? t('permissions.strip.plan')
        : t('permissions.strip.waiting')
  const detail = request ? describePermission(request, t) : null

  return (
    <View style={styles.card} accessibilityRole="summary">
      <View style={styles.header}>
        <Text size="xs" weight="bold" color="warning" style={styles.headerText}>
          ⚠ {t('permissions.strip.title').toUpperCase()} · {strip.sessions}
        </Text>
        <Text size="xs" color="textMuted">
          {formatElapsed(now - oldest.since)}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={session?.title || t('common.session')}
        onPress={() => openSession(sessionId)}
        style={styles.row}
      >
        {agent ? <AgentBadge agent={agent} /> : null}
        <Text weight="medium" numberOfLines={1} style={styles.title}>
          {session?.title || t('common.session')}
        </Text>
        <ProfileTag profile={profile ?? { name: profileId, color: '' }} />
      </Pressable>
      {detail && answerable ? (
        <Text size="xs" color="textMuted" numberOfLines={1}>
          {request.tool} · <Text size="xs">{detail.detail}</Text>
        </Text>
      ) : (
        <Text size="xs" color="textMuted" numberOfLines={1}>
          {status}
        </Text>
      )}
      <View style={styles.actions}>
        {answerable ? (
          <>
            <Button
              label={t('permissions.deny')}
              variant="danger"
              compact
              flex
              disabled={busy !== null}
              onPress={() => void respond(request.requestId, 'deny')}
            />
            <Button
              label={t('permissions.always')}
              compact
              flex
              disabled={busy !== null}
              onPress={() => setAlways(request)}
            />
            <Button
              label={t('permissions.allow')}
              variant="success"
              compact
              flex
              loading={busy === request.requestId}
              onPress={() => void respond(request.requestId, 'allow')}
            />
          </>
        ) : (
          <Button label={t('permissions.strip.open')} compact flex onPress={() => openSession(sessionId)} />
        )}
      </View>
      {strip.next ? <MoreLink item={strip.next} count={strip.more} /> : null}
      {error ? (
        <Text size="xs" color="danger">
          {error}
        </Text>
      ) : null}
      <AlwaysAllowSheet
        request={always}
        cwd={session?.cwd ?? ''}
        profileName={profile?.name ?? profileId}
        onCancel={() => setAlways(null)}
        onConfirm={(rule) => {
          if (always) void respond(always.requestId, 'allow', rule)
          setAlways(null)
        }}
      />
    </View>
  )
}

function MoreLink({ item, count }: { item: StripItem; count: number }) {
  const { t } = useTranslation()
  return (
    <Pressable accessibilityRole="link" hitSlop={8} onPress={() => openSession(stripSessionId(item))}>
      <Text size="xs" color="accentText">
        {t('permissions.strip.more', { count })}
      </Text>
    </Pressable>
  )
}

const useStyles = makeStyles((theme) => ({
  card: {
    marginHorizontal: space.lg,
    marginBottom: space.sm,
    paddingHorizontal: 13,
    paddingVertical: 10,
    gap: space.sm,
    borderRadius: radius.lg + 2,
    borderWidth: 1,
    borderColor: theme.colors.warning,
    backgroundColor: theme.colors.surface,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  headerText: { letterSpacing: 0.8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { flex: 1 },
  actions: { flexDirection: 'row', gap: space.sm },
}))

import type { Session } from '@remote-harness/protocol'
import { router } from 'expo-router'
import { ChevronRight, GitBranch } from 'lucide-react-native'
import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import { colors, radius, space } from '@/core/theme'
import { relativeTime, shortPath } from '@/core/utils/time'
import { Badge, Text } from '@/ui'
import { StateBadge } from './StateBadge'

type Props = {
  session: Session
  pendingPermissions?: number
  /** Other live sessions in the same git checkout. */
  sharedCheckout?: number
  /** The session is open in the detail pane. */
  selected?: boolean
  /** Keyboard navigation cursor (arrow keys) — may point to a session other than the open one. */
  keyboardFocused?: boolean
}

export const SessionRow = memo(function SessionRow({
  session,
  pendingPermissions = 0,
  sharedCheckout = 0,
  selected = false,
  keyboardFocused = false,
}: Props) {
  const { t } = useTranslation()
  const waiting = pendingPermissions > 0 || session.state === 'waiting'
  const [hovered, setHovered] = useState(false)
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/session/[id]', params: { id: session.id } })}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        styles.row,
        waiting && styles.waiting,
        selected && styles.selected,
        keyboardFocused && styles.keyboardFocused,
        hovered && styles.hovered,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.main}>
        <Text weight="medium" numberOfLines={1}>
          {session.title || t('common.session')}
        </Text>
        <View style={styles.path}>
          <Text size="xs" color="textMuted" numberOfLines={1} style={styles.shrink}>
            {shortPath(session.cwd)}
          </Text>
          {session.checkout?.branch ? (
            <View
              style={styles.branch}
              accessible
              accessibilityLabel={t('sessions.branch', { branch: session.checkout.branch })}
            >
              <GitBranch size={12} color={colors.textDim} />
              <Text size="xs" color="textDim" numberOfLines={1} style={styles.shrink}>
                {session.checkout.branch}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.badges}>
          <StateBadge state={session.state} />
          {pendingPermissions > 0 ? (
            <Badge label={t('permissions.pending', { count: pendingPermissions })} tone="warning" />
          ) : null}
          {sharedCheckout > 0 ? (
            <Badge label={t('sessions.sharedCheckout', { count: sharedCheckout })} tone="warning" />
          ) : null}
          {!session.controllable ? <Badge label={t('common.readOnly')} /> : null}
          {session.backgroundTasks > 0 ? (
            <Badge label={t('sessions.background', { count: session.backgroundTasks })} tone="info" />
          ) : null}
          <Text size="xs" color="textDim">
            {relativeTime(session.updatedAt, t)}
          </Text>
        </View>
      </View>
      <ChevronRight size={18} color={colors.textDim} />
    </Pressable>
  )
})

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginHorizontal: space.lg,
    marginBottom: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  waiting: { borderColor: colors.warning },
  selected: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
  keyboardFocused: { borderColor: colors.accent },
  hovered: { backgroundColor: colors.surfaceRaised },
  pressed: { opacity: 0.7 },
  main: { flex: 1, gap: space.xs },
  path: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  branch: { flexDirection: 'row', alignItems: 'center', gap: space.xxs, flexShrink: 1 },
  shrink: { flexShrink: 1 },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.xxs,
  },
})

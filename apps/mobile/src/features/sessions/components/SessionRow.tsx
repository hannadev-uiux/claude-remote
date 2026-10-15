import type { Session } from '@claude-remote/protocol'
import { router } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
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
  /** The session is open in the detail pane. */
  selected?: boolean
  /** Keyboard navigation cursor (arrow keys) — may point to a session other than the open one. */
  keyboardFocused?: boolean
}

export const SessionRow = memo(function SessionRow({
  session,
  pendingPermissions = 0,
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
        <Text size="xs" color="textMuted" numberOfLines={1}>
          {shortPath(session.cwd)}
        </Text>
        <View style={styles.badges}>
          <StateBadge state={session.state} />
          {pendingPermissions > 0 ? (
            <Badge label={t('permissions.pending', { count: pendingPermissions })} tone="warning" />
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
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.xxs,
  },
})

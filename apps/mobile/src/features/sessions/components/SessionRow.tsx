import type { Session } from '@claude-remote/protocol'
import { router } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { memo } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { colors, radius, space } from '@/core/theme'
import { relativeTime, shortPath } from '@/core/utils/time'
import { Badge, Text } from '@/ui'
import { StateBadge } from './StateBadge'

type Props = { session: Session; pendingPermissions?: number }

export const SessionRow = memo(function SessionRow({ session, pendingPermissions = 0 }: Props) {
  const waiting = pendingPermissions > 0 || session.state === 'waiting'
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/session/[id]', params: { id: session.id } })}
      style={({ pressed }) => [styles.row, waiting && styles.waiting, pressed && styles.pressed]}
    >
      <View style={styles.main}>
        <Text weight="medium" numberOfLines={1}>
          {session.title || 'Sessão'}
        </Text>
        <Text size="xs" color="textMuted" numberOfLines={1}>
          {shortPath(session.cwd)}
        </Text>
        <View style={styles.badges}>
          <StateBadge state={session.state} />
          {pendingPermissions > 0 ? <Badge label={`${pendingPermissions} permissão`} tone="warning" /> : null}
          {!session.controllable ? <Badge label="somente leitura" /> : null}
          {session.backgroundTasks > 0 ? (
            <Badge label={`background ${session.backgroundTasks}`} tone="info" />
          ) : null}
          <Text size="xs" color="textDim">
            {relativeTime(session.updatedAt)}
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

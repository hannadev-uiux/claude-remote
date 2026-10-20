import type { PermissionRequestInfo } from '@remote-harness/protocol'
import { SquareTerminal } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { ScrollView, View } from 'react-native'
import { makeStyles, radius, space, useTheme } from '@/core/theme'
import { formatElapsed } from '@/core/utils/time'
import { useNow } from '@/core/utils/use-now'
import { agentLabel } from '@/features/sessions/agent'
import { Button, Text } from '@/ui'
import { handoverSummary, permissionTimer } from '../describe'

type Props = {
  request: PermissionRequestInfo
  /** Opens the session's terminal; absent for a read-only session (answer on the computer). */
  onOpenTerminal?: () => void
}

/**
 * A request whose hook stopped waiting (`terminal`): the agent still waits on its own dialog, so
 * the card keeps the request's content and points to the terminal. It answers nothing itself.
 */
export function HandoverCard({ request, onOpenTerminal }: Props) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const now = useNow(1_000)
  const { elapsedMs } = permissionTimer(request.createdAt, request.expiresAt, now)
  const summary = handoverSummary(
    request,
    t,
    t('permissions.question.title', { agent: agentLabel(null, t, { sentence: true }) }),
  )
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <SquareTerminal size={16} color={colors.warning} />
        <Text weight="bold" color="warning" style={styles.flex} numberOfLines={2}>
          {summary.title}
        </Text>
        <Text size="xs" color="textMuted">
          {formatElapsed(elapsedMs)}
        </Text>
      </View>
      <Text size="xs" weight="bold" color="warning">
        {t('permissions.handover.label')}
      </Text>
      <ScrollView style={styles.detail} nestedScrollEnabled>
        <Text size="sm" selectable>
          {summary.detail}
        </Text>
      </ScrollView>
      <Text size="xs" color="textMuted">
        {onOpenTerminal ? t('permissions.handover.body') : t('permissions.handover.onComputer')}
      </Text>
      {onOpenTerminal ? (
        <View style={styles.actions}>
          <Button label={t('permissions.handover.openTerminal')} compact flex onPress={onOpenTerminal} />
        </View>
      ) : null}
    </View>
  )
}

const useStyles = makeStyles((theme) => ({
  card: {
    margin: space.sm,
    padding: space.md,
    gap: space.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.warning,
    backgroundColor: theme.colors.surface,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1 },
  detail: {
    maxHeight: 120,
    backgroundColor: theme.colors.background,
    borderRadius: radius.sm,
    padding: space.sm,
  },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
}))

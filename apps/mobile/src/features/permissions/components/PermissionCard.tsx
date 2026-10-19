import type { PermissionRequestInfo } from '@remote-harness/protocol'
import { ShieldAlert } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { ScrollView, View } from 'react-native'
import { makeStyles, radius, space, useTheme } from '@/core/theme'
import { formatElapsed } from '@/core/utils/time'
import { useNow } from '@/core/utils/use-now'
import { Button, Text } from '@/ui'
import { describePermission, permissionTimer } from '../describe'

type Props = {
  request: PermissionRequestInfo
  busy: boolean
  onAllow: () => void
  onAlways: () => void
  onDeny: () => void
}

/**
 * Agent-neutral permission card: shield · `Tool(arguments)` · time waiting (red when about to
 * expire), the detail label and box, then Deny / Always / Allow. The strip, the tray and the lock
 * screen show the same content in the same order.
 */
export function PermissionCard({ request, busy, onAllow, onAlways, onDeny }: Props) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const d = describePermission(request, t)
  const now = useNow(1_000)
  const timer = permissionTimer(request.createdAt, request.expiresAt, now)
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <ShieldAlert size={16} color={colors.warning} />
        <Text weight="bold" color="warning" style={styles.flex} numberOfLines={1}>
          {d.title}
        </Text>
        <Text size="xs" color={timer.urgent ? 'danger' : 'textMuted'}>
          {formatElapsed(timer.elapsedMs)}
        </Text>
      </View>
      <Text size="xs" color="textMuted">
        {d.detailLabel}
      </Text>
      <ScrollView style={styles.detail} nestedScrollEnabled>
        <Text size="sm" selectable>
          {d.detail}
        </Text>
      </ScrollView>
      <View style={styles.actions}>
        <Button
          label={t('permissions.deny')}
          variant="danger"
          compact
          flex
          disabled={busy}
          onPress={onDeny}
        />
        <Button label={t('permissions.always')} compact flex disabled={busy} onPress={onAlways} />
        <Button
          label={t('permissions.allow')}
          variant="success"
          compact
          flex
          loading={busy}
          onPress={onAllow}
        />
      </View>
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

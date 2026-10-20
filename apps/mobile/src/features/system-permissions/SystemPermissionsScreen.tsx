import type { MachinePermissionId, SettingsPane } from '@remote-harness/protocol'
import { useTranslation } from 'react-i18next'
import { Linking, ScrollView, View } from 'react-native'
import { makeStyles, space } from '@/core/theme'
import { shortPath } from '@/core/utils/time'
import { Badge, type BadgeTone, Button, Card, Screen, Text } from '@/ui'
import type { PermissionStatus } from './status.ts'
import { useComputerPermissions } from './use-computer-permissions'
import { type PhonePermissionId, usePhonePermissions } from './use-phone-permissions'

const PHONE_ROWS: PhonePermissionId[] = ['notifications', 'camera', 'photos', 'microphone', 'localNetwork']
const COMPUTER_ROWS: MachinePermissionId[] = [
  'folderAccess',
  'fullDiskAccess',
  'accessibility',
  'desktopNotifications',
  'keychain',
]
const OPENABLE_PANES: readonly MachinePermissionId[] = ['fullDiskAccess', 'accessibility']

function isOpenablePane(id: MachinePermissionId): id is SettingsPane {
  return (OPENABLE_PANES as readonly string[]).includes(id)
}

const TONE_BY_STATUS: Record<PermissionStatus, BadgeTone> = {
  allowed: 'success',
  denied: 'danger',
  not_asked: 'warning',
  limited: 'info',
  not_available: 'muted',
}

export function SystemPermissionsScreen() {
  const { t } = useTranslation()
  const styles = useStyles()
  const phone = usePhonePermissions()
  const computer = useComputerPermissions()

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Text weight="bold">{t('systemPermissions.onThisPhone')}</Text>
          {PHONE_ROWS.map((id) => {
            const row = phone.rows.find((r) => r.id === id)
            if (!row) return null
            return (
              <PermissionRow
                key={id}
                label={t(`systemPermissions.phone.${id}.label`)}
                reason={t(`systemPermissions.phone.${id}.reason`)}
                hint={id === 'localNetwork' ? t('systemPermissions.phone.localNetwork.hint') : undefined}
                status={row.status}
                actionLabel={
                  row.status === 'not_asked'
                    ? t('systemPermissions.allow')
                    : row.status === 'denied'
                      ? t('systemPermissions.openSettings')
                      : undefined
                }
                onAction={
                  row.status === 'not_asked'
                    ? () => void phone.allow(id)
                    : row.status === 'denied'
                      ? () => void Linking.openSettings()
                      : undefined
                }
              />
            )
          })}
        </Card>
        <Card>
          <Text weight="bold">{t('systemPermissions.onThisComputer')}</Text>
          {!computer.supported ? (
            <Text size="xs" color="textMuted">
              {t('systemPermissions.computerUnsupported')}
            </Text>
          ) : null}
          {COMPUTER_ROWS.map((id) => {
            const row = computer.rows.find((r) => r.id === id)
            if (!row) return null
            return (
              <View key={id}>
                <PermissionRow
                  label={t(`systemPermissions.computer.${id}.label`)}
                  reason={t(`systemPermissions.computer.${id}.reason`)}
                  hint={
                    id === 'desktopNotifications' && row.status === 'not_available'
                      ? t('systemPermissions.computer.desktopNotifications.unknownHint')
                      : undefined
                  }
                  status={row.status}
                  actionLabel={
                    row.status === 'denied' && isOpenablePane(id)
                      ? t('systemPermissions.openOnComputer')
                      : undefined
                  }
                  onAction={
                    row.status === 'denied' && isOpenablePane(id)
                      ? () => computer.openSettingsPane(id)
                      : undefined
                  }
                />
                {row.entries?.map((entry) => (
                  <View key={entry.path} style={styles.entryRow}>
                    <Text size="xs" color="textMuted" numberOfLines={1} style={styles.flex}>
                      {shortPath(entry.path)}
                    </Text>
                    <Badge
                      label={t(`systemPermissions.status.${entry.status}`)}
                      tone={TONE_BY_STATUS[entry.status]}
                    />
                  </View>
                ))}
              </View>
            )
          })}
        </Card>
      </ScrollView>
    </Screen>
  )
}

function PermissionRow({
  label,
  reason,
  hint,
  status,
  actionLabel,
  onAction,
}: {
  label: string
  reason: string
  hint?: string
  status: PermissionStatus
  actionLabel?: string
  onAction?: () => void
}) {
  const { t } = useTranslation()
  const styles = useStyles()
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <Text size="sm">{label}</Text>
        <Text size="xs" color="textMuted">
          {reason}
        </Text>
        {hint ? (
          <Text size="xs" color="textDim">
            {hint}
          </Text>
        ) : null}
      </View>
      <View style={styles.rowEnd}>
        <Badge label={t(`systemPermissions.status.${status}`)} tone={TONE_BY_STATUS[status]} />
        {actionLabel && onAction ? (
          <Button label={actionLabel} compact variant="ghost" onPress={onAction} />
        ) : null}
      </View>
    </View>
  )
}

const useStyles = makeStyles(() => ({
  content: { padding: space.lg, gap: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  rowEnd: { alignItems: 'flex-end', gap: space.xs },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingLeft: space.lg,
    paddingBottom: space.xs,
  },
  flex: { flex: 1 },
}))

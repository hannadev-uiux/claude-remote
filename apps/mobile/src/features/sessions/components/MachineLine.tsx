import type { Session } from '@remote-harness/protocol'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { useConnectionStore } from '@/core/connection'
import { space, useTheme } from '@/core/theme'
import { useMachineName } from '@/features/settings/machine-store'
import { Text } from '@/ui'
import { listSummary } from '../summary'

/** Under the header: connection dot, machine name, sessions in the list and distinct agents. */
export function MachineLine({ sessions }: { sessions: readonly Session[] }) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const status = useConnectionStore((s) => s.status)
  const machine = useMachineName() ?? t('machine.generic')
  const summary = listSummary(sessions)
  const dot = status === 'open' ? colors.success : status === 'unauthorized' ? colors.danger : colors.warning
  return (
    <View style={styles.line} accessibilityLabel={`${machine} · ${t(`connection.status.${status}`)}`}>
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <Text size="xs" numberOfLines={1} style={styles.host}>
        {machine}
      </Text>
      <Text size="xs" color="textMuted" numberOfLines={1}>
        · {t('sessions.count', { count: summary.sessions })}
      </Text>
      <View style={styles.spacer} />
      {summary.agents > 0 ? (
        <Text size="xs" color="textMuted" numberOfLines={1}>
          {t('sessions.agents', { count: summary.agents })}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.xs,
    paddingBottom: space.sm,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  host: { flexShrink: 1 },
  spacer: { flex: 1 },
})

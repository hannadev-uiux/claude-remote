import type { Session } from '@remote-harness/protocol'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import { useConnectionStore } from '@/core/connection'
import { space, useTheme } from '@/core/theme'
import { useMachineName } from '@/features/settings/machine-store'
import { Text } from '@/ui'
import type { StateFilter } from '../filter'
import { listSummary } from '../summary'

/**
 * Under the header: connection dot, machine name, session counts (total, running, waiting, tasks)
 * and, on the right, distinct agents and how many have a running session. Tapping "running" or
 * "waiting" applies the matching state filter.
 */
export function MachineLine({
  sessions,
  stateFilter = 'all',
  onToggleState,
}: {
  sessions: readonly Session[]
  stateFilter?: StateFilter
  onToggleState?: (state: 'active' | 'ended') => void
}) {
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
      {summary.running > 0 ? (
        <CountPart
          label={t('sessions.runningCount', { count: summary.running })}
          onPress={onToggleState ? () => onToggleState('active') : undefined}
          active={stateFilter === 'active'}
        />
      ) : null}
      {summary.waiting > 0 ? (
        <CountPart
          label={t('sessions.waitingCount', { count: summary.waiting })}
          onPress={onToggleState ? () => onToggleState('active') : undefined}
          active={stateFilter === 'active'}
        />
      ) : null}
      {summary.tasks > 0 ? (
        <Text size="xs" color="textMuted" numberOfLines={1}>
          · {t('sessions.tasksCount', { count: summary.tasks })}
        </Text>
      ) : null}
      <View style={styles.spacer} />
      {summary.agents > 0 ? (
        <Text size="xs" color="textMuted" numberOfLines={1}>
          {t('sessions.agents', { count: summary.agents })}
          {summary.agentsRunning > 0
            ? ` · ${t('sessions.runningCount', { count: summary.agentsRunning })}`
            : ''}
        </Text>
      ) : null}
    </View>
  )
}

function CountPart({ label, onPress, active }: { label: string; onPress?: () => void; active: boolean }) {
  const text = (
    <Text size="xs" color={active ? 'accentText' : 'textMuted'} numberOfLines={1}>
      · {label}
    </Text>
  )
  if (!onPress) return text
  return (
    <Pressable onPress={onPress} hitSlop={6} style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}>
      {text}
    </Pressable>
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

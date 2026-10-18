import type { SubagentInfo } from '@remote-harness/protocol'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { makeStyles, radius, space } from '@/core/theme'
import { formatElapsed } from '@/core/utils/time'
import { useNow } from '@/core/utils/use-now'
import { Badge, Button, Text } from '@/ui'
import { sortSubagents, subagentCounts, subagentElapsed, subagentLabel } from './sort'

/**
 * Bottom sheet with a session's subagents, running first: label, state pill, elapsed time (live
 * while running, total once done) and tool count. A row opens that subagent's conversation.
 */
export function SubagentsSheet({
  sessionId,
  subagents,
  visible,
  onClose,
}: {
  sessionId: string
  subagents: SubagentInfo[]
  visible: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const styles = useStyles()
  const insets = useSafeAreaInsets()
  const now = useNow(1_000)
  const { count, running } = subagentCounts(subagents)
  const open = (agentId: string) => {
    onClose()
    router.push({ pathname: '/session/[id]/agent/[agentId]', params: { id: sessionId, agentId } })
  }
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}>
          <View style={styles.header}>
            <Text weight="bold" accessibilityRole="header">
              {t('subagents.title')}
            </Text>
            <Text size="sm" color="textMuted">
              {running > 0
                ? t('subagents.summaryRunning', { count, running })
                : t('subagents.summary', { count })}
            </Text>
          </View>
          <ScrollView style={styles.list} contentContainerStyle={styles.rows}>
            {sortSubagents(subagents).map((sub) => {
              const live = sub.state === 'running'
              const elapsed = subagentElapsed(sub, now)
              const detail = [
                elapsed === null ? null : formatElapsed(elapsed),
                sub.toolCount > 0 ? t('subagents.tools', { count: sub.toolCount }) : null,
              ]
                .filter(Boolean)
                .join(' · ')
              return (
                <Pressable
                  key={sub.agentId}
                  accessibilityRole="button"
                  onPress={() => open(sub.agentId)}
                  style={({ pressed }) => [styles.row, live && styles.live, pressed && styles.pressed]}
                >
                  <View style={styles.text}>
                    <Text numberOfLines={1}>{subagentLabel(sub)}</Text>
                    {detail ? (
                      <Text size="xs" color={live ? 'accentText' : 'textMuted'} numberOfLines={1}>
                        {detail}
                      </Text>
                    ) : null}
                  </View>
                  <Badge
                    label={live ? t('subagents.state.running') : t('subagents.state.done')}
                    tone={live ? 'accent' : 'muted'}
                    dot={live}
                  />
                </Pressable>
              )
            })}
          </ScrollView>
          <Button label={t('common.close')} variant="ghost" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const useStyles = makeStyles((theme) => ({
  backdrop: { flex: 1, backgroundColor: theme.colors.backdrop, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '70%',
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    gap: space.sm,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  header: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, paddingBottom: space.xs },
  list: { flexGrow: 0 },
  rows: { gap: space.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  live: { borderColor: theme.colors.accent },
  pressed: { opacity: 0.7 },
  text: { flex: 1, gap: 2 },
}))

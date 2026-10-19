import type { SubagentInfo } from '@remote-harness/protocol'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { makeStyles, radius, space } from '@/core/theme'
import { Button, Text } from '@/ui'
import { SubagentRows } from './SubagentRows'
import { subagentCounts } from './sort'

/** Bottom sheet with a session's subagents (the same rows as the tablet inspector); a row opens the conversation. */
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
            <SubagentRows subagents={subagents} onOpen={open} />
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
}))

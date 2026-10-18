import type { AccountLimits, SessionStatus } from '@remote-harness/protocol'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { makeStyles, radius, space } from '@/core/theme'
import { Button, Text } from '@/ui'
import { activeWindow, formatPercent, formatReset, formatTokens, LEVEL_COLORS, statusLevel } from './logic'

type Row = { key: string; label: string; value: string; percent: number | null }

/** Details of the status bar: tokens in use and when each limit resets. */
export function StatusSheet({
  visible,
  status,
  limits,
  onClose,
}: {
  visible: boolean
  status: SessionStatus | null
  limits: AccountLimits | undefined
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const styles = useStyles()
  const now = Date.now()
  const rows: Row[] = []
  if (status?.model)
    rows.push({ key: 'model', label: t('sessionStatus.labels.model'), value: status.model, percent: null })
  if (status?.effort)
    rows.push({ key: 'effort', label: t('sessionStatus.labels.effort'), value: status.effort, percent: null })
  if (status?.context) {
    const { usedTokens, size, percent } = status.context
    rows.push({
      key: 'context',
      label: t('sessionStatus.labels.context'),
      value: t('sessionStatus.contextValue', {
        used: formatTokens(usedTokens),
        size: formatTokens(size),
        percent: formatPercent(percent),
      }),
      percent,
    })
  }
  for (const key of ['fiveHour', 'sevenDay'] as const) {
    const window = activeWindow(limits?.[key], now)
    if (!window) continue
    rows.push({
      key,
      label: t(`sessionStatus.labels.${key}`),
      value: t('sessionStatus.limitValue', {
        percent: formatPercent(window.percent),
        time: formatReset(window.resetsAt, now, i18n.language),
      }),
      percent: window.percent,
    })
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}>
          <Text weight="bold" accessibilityRole="header">
            {t('sessionStatus.title')}
          </Text>
          <View style={styles.list}>
            {rows.map((row) => (
              <View key={row.key} style={styles.row}>
                <Text size="xs" color="textMuted">
                  {row.label}
                </Text>
                <Text
                  size="sm"
                  color={row.percent === null ? 'text' : LEVEL_COLORS[statusLevel(row.percent)]}
                  selectable
                >
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
          <Button label={t('common.close')} variant="ghost" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const useStyles = makeStyles((theme) => ({
  backdrop: { flex: 1, backgroundColor: theme.colors.backdrop, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    gap: space.sm,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  list: { paddingVertical: space.sm },
  row: {
    gap: space.xxs,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
}))

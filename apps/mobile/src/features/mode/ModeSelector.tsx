import type { PermissionMode, SelectableMode } from '@remote-harness/protocol'
import * as Haptics from 'expo-haptics'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Modal, Pressable, View } from 'react-native'
import { useDaemonClient } from '@/core/connection'
import { errorMessage } from '@/core/connection/error-message'
import { makeStyles, radius, space, useTheme } from '@/core/theme'
import { agentLabel } from '@/features/sessions/agent'
import { Button, Text } from '@/ui'
import { approvalPolicyTone, SELECTABLE_MODES } from './modes'

export function ModeSelector({
  sessionId,
  mode,
  disabled,
}: {
  sessionId: string
  mode: PermissionMode | null
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const client = useDaemonClient()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const apply = async (target: SelectableMode) => {
    if (!client) return
    setBusy(true)
    try {
      await client.request({ type: 'session.setMode', sessionId, mode: target })
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setOpen(false)
    } catch (e) {
      const message = errorMessage(e, t, {
        session_busy: t('mode.errors.sessionBusy'),
        not_controllable: t('mode.errors.notControllable'),
      })
      Alert.alert(t('mode.changeFailed'), message)
    } finally {
      setBusy(false)
    }
  }

  const choose = (target: SelectableMode) => {
    if (target === mode) return setOpen(false)
    if (target !== 'auto') return void apply(target)
    const agent = agentLabel(null, t, { sentence: true })
    Alert.alert(t('mode.autoConfirmTitle'), t('mode.autoConfirmBody', { agent }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('mode.autoConfirm'), style: 'destructive', onPress: () => void apply('auto') },
    ])
  }

  const tone =
    mode === 'auto' || mode === 'bypassPermissions'
      ? colors.danger
      : mode === 'plan'
        ? colors.info
        : mode === 'acceptEdits'
          ? colors.accent
          : colors.textMuted

  return (
    <>
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.pill, { borderColor: tone, opacity: disabled ? 0.4 : 1 }]}
        accessibilityLabel={t('mode.title')}
      >
        <Text size="xs" weight="medium" style={{ color: tone }}>
          {mode ? t(`mode.labels.${mode}`) : '—'}
        </Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text weight="bold">{t('mode.title')}</Text>
            <Text size="xs" color="textMuted">
              {t('mode.hint')}
            </Text>
            {SELECTABLE_MODES.map((m) => (
              <Pressable
                key={m}
                disabled={busy}
                onPress={() => choose(m)}
                style={[styles.option, m === mode && styles.selected]}
              >
                <Text weight="medium" color={m === 'auto' ? 'danger' : 'text'}>
                  {m === mode ? '● ' : '○ '}
                  {t(`mode.labels.${m}`)}
                </Text>
                <Text size="xs" color="textDim">
                  {t(`mode.hints.${m}`)}
                </Text>
              </Pressable>
            ))}
            <Button
              label={busy ? t('mode.switching') : t('common.close')}
              variant="ghost"
              disabled={busy}
              onPress={() => setOpen(false)}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  )
}

/**
 * Codex's approval policy (`on-request`, `never`, …) in the place of the mode chip. Read-only: Codex
 * permissions change with `/permissions` in the terminal.
 */
export function ApprovalPolicyChip({ policy }: { policy: string | null }) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const tone = approvalPolicyTone(policy)
  const color = tone === 'danger' ? colors.danger : tone === 'accent' ? colors.accentText : colors.textMuted
  const label = policy ?? '—'
  return (
    <View
      accessible
      accessibilityLabel={t('mode.approvalPolicy', { policy: policy ?? t('mode.unknownPolicy') })}
      style={[styles.pill, { borderColor: tone === 'accent' ? colors.accent : color }]}
    >
      <Text size="xs" weight="medium" style={{ color }}>
        {label}
      </Text>
    </View>
  )
}

const useStyles = makeStyles((theme) => ({
  pill: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 3 },
  backdrop: { flex: 1, backgroundColor: theme.colors.backdrop, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: space.xl,
    gap: space.sm,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  option: {
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 2,
  },
  selected: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
}))

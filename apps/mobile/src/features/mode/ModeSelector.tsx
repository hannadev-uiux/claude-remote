import type { PermissionMode, SelectableMode } from '@claude-remote/protocol'
import * as Haptics from 'expo-haptics'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native'
import { useDaemonClient } from '@/core/connection'
import { errorMessage } from '@/core/connection/error-message'
import { colors, radius, space } from '@/core/theme'
import { Button, Text } from '@/ui'
import { SELECTABLE_MODES } from './modes'

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
    Alert.alert(t('mode.autoConfirmTitle'), t('mode.autoConfirmBody'), [
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

const styles = StyleSheet.create({
  pill: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 3 },
  backdrop: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: space.xl,
    gap: space.sm,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  option: { padding: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, gap: 2 },
  selected: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
})

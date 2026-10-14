import type { PermissionMode, SelectableMode } from '@claude-remote/protocol'
import * as Haptics from 'expo-haptics'
import { useState } from 'react'
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native'
import { useDaemonClient } from '@/core/connection'
import { DaemonRequestError } from '@/core/connection/daemon-client'
import { colors, radius, space } from '@/core/theme'
import { Button, Text } from '@/ui'
import { MODE_HINTS, MODE_LABELS, SELECTABLE_MODES } from './modes'

const ERRORS: Record<string, string> = {
  session_busy: 'Há um pedido de permissão aberto. Responda-o antes de trocar o modo.',
  not_controllable: 'Sessão somente leitura.',
}

export function ModeSelector({
  sessionId,
  mode,
  disabled,
}: {
  sessionId: string
  mode: PermissionMode | null
  disabled?: boolean
}) {
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
      const message = e instanceof DaemonRequestError ? (ERRORS[e.code] ?? e.message) : String(e)
      Alert.alert('Não foi possível trocar o modo', message)
    } finally {
      setBusy(false)
    }
  }

  const choose = (target: SelectableMode) => {
    if (target === mode) return setOpen(false)
    if (target !== 'auto') return void apply(target)
    Alert.alert(
      'Ativar modo auto?',
      'O Claude vai decidir sozinho quais ações executar, sem pedir aprovação, enquanto ninguém olha o Mac.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Ativar auto', style: 'destructive', onPress: () => void apply('auto') },
      ],
    )
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
        accessibilityLabel="Modo de permissão"
      >
        <Text size="xs" weight="medium" style={{ color: tone }}>
          {mode ? MODE_LABELS[mode] : '—'}
        </Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text weight="bold">Modo de permissão</Text>
            <Text size="xs" color="textMuted">
              Troca via Shift+Tab no Mac; o modo mostrado é o confirmado na linha de status.
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
                  {MODE_LABELS[m]}
                </Text>
                <Text size="xs" color="textDim">
                  {MODE_HINTS[m]}
                </Text>
              </Pressable>
            ))}
            <Button
              label={busy ? 'trocando…' : 'Fechar'}
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

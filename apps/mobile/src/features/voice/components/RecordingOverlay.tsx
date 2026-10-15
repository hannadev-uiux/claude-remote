import { Check, X } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { colors, radius, space } from '@/core/theme'
import { Button, IconButton, Text } from '@/ui'
import { formatElapsed } from '../timer'
import type { VoiceRecordingState } from '../use-voice-recording'

type Props = {
  state: VoiceRecordingState
  level: number
  elapsedMs: number
  onCancel: () => void
  onDone: () => void
  onRetryOnline: () => void
}

export function RecordingOverlay({ state, level, elapsedMs, onCancel, onDone, onRetryOnline }: Props) {
  const { t } = useTranslation()

  if (state === 'denied') {
    return (
      <View style={styles.message}>
        <Text size="sm" color="textMuted">
          {t('voice.permissionDenied')}
        </Text>
      </View>
    )
  }

  if (state === 'offline-unavailable') {
    return (
      <View style={styles.message}>
        <Text size="sm" color="textMuted" style={styles.messageText}>
          {t('voice.offlineUnavailable')}
        </Text>
        <View style={styles.row}>
          <Button label={t('common.cancel')} variant="secondary" compact onPress={onCancel} />
          <Button label={t('voice.retryOnline')} variant="primary" compact onPress={onRetryOnline} />
        </View>
      </View>
    )
  }

  const transcribing = state === 'transcribing'
  return (
    <View style={styles.wrap}>
      <View style={styles.meter}>
        <View style={[styles.meterFill, { width: `${Math.round(level * 100)}%` }]} />
      </View>
      <Text size="sm" color="textMuted" style={styles.timer}>
        {formatElapsed(elapsedMs)}
      </Text>
      <IconButton icon={X} label={t('voice.cancel')} onPress={onCancel} disabled={transcribing} />
      {transcribing ? (
        <ActivityIndicator size="small" color={colors.accent} style={styles.spinner} />
      ) : (
        <IconButton icon={Check} label={t('voice.done')} color="accent" onPress={onDone} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  meter: {
    flex: 1,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  meterFill: { height: '100%', backgroundColor: colors.accent },
  timer: { minWidth: 36, textAlign: 'right' },
  spinner: { width: 20, height: 20 },
  message: {
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  messageText: { marginBottom: space.xs },
  row: { flexDirection: 'row', gap: space.sm },
})

import { Check, Pause, Play, X } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, View } from 'react-native'
import { makeStyles, radius, space, useTheme } from '@/core/theme'
import { Button, IconButton, Text } from '@/ui'
import { formatElapsed } from '../timer'
import type { VoiceRecordingState, VoiceReview } from '../use-voice-recording'

type Props = {
  state: VoiceRecordingState
  level: number
  elapsedMs: number
  interimText: string
  review: VoiceReview | null
  onCancel: () => void
  onDone: () => void
  onPause: () => void
  onResume: () => void
  onRetryOnline: () => void
  onUseOriginal: () => void
  onUsePolished: () => void
}

export function RecordingOverlay({
  state,
  level,
  elapsedMs,
  interimText,
  review,
  onCancel,
  onDone,
  onPause,
  onResume,
  onRetryOnline,
  onUseOriginal,
  onUsePolished,
}: Props) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()

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

  if (state === 'reviewing' && review) {
    return (
      <View style={styles.message}>
        <Text size="sm" color="textMuted">
          {t('voice.reviewTitle')}
        </Text>
        <Text size="sm" style={styles.messageText}>
          {review.polished}
        </Text>
        <Text size="xs" color="textDim" style={styles.messageText}>
          {review.original}
        </Text>
        <View style={styles.row}>
          <Button label={t('voice.useOriginal')} variant="secondary" compact onPress={onUseOriginal} />
          <Button label={t('voice.usePolished')} variant="primary" compact onPress={onUsePolished} />
        </View>
      </View>
    )
  }

  const paused = state === 'paused'
  const transcribing = state === 'transcribing'
  return (
    <View style={styles.wrap}>
      <View style={styles.column}>
        <View style={styles.row}>
          <View style={styles.meter}>
            <View style={[styles.meterFill, { width: `${paused ? 0 : Math.round(level * 100)}%` }]} />
          </View>
          <Text size="sm" color="textMuted" style={styles.timer}>
            {formatElapsed(elapsedMs)}
          </Text>
        </View>
        {!paused && interimText ? (
          <Text size="xs" color="textMuted" numberOfLines={1} style={styles.interim}>
            {interimText}
          </Text>
        ) : null}
        {paused ? (
          <Text size="xs" color="textMuted">
            {t('voice.paused')}
          </Text>
        ) : null}
      </View>
      <IconButton icon={X} label={t('voice.cancel')} onPress={onCancel} disabled={transcribing} />
      {transcribing ? (
        <ActivityIndicator size="small" color={colors.accentText} style={styles.spinner} />
      ) : paused ? (
        <IconButton icon={Play} label={t('voice.resume')} color="accentText" onPress={onResume} />
      ) : (
        <IconButton icon={Pause} label={t('voice.pause')} onPress={onPause} />
      )}
      {!transcribing ? (
        <IconButton icon={Check} label={t('voice.done')} color="accentText" onPress={onDone} />
      ) : null}
    </View>
  )
}

const useStyles = makeStyles((theme) => ({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  column: { flex: 1, gap: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  meter: {
    flex: 1,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: theme.colors.surfaceRaised,
    overflow: 'hidden',
  },
  meterFill: { height: '100%', backgroundColor: theme.colors.accent },
  timer: { minWidth: 36, textAlign: 'right' },
  interim: { fontStyle: 'italic' },
  spinner: { width: 20, height: 20 },
  message: {
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  messageText: { marginBottom: space.xs },
}))

import { Mic, Square } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { IconButton } from '@/ui'
import type { VoiceRecordingState } from '../use-voice-recording'

type Props = {
  state: VoiceRecordingState
  disabled: boolean
  /** Press and hold to record, release to stop, instead of tap to toggle. */
  pushToTalk: boolean
  onStart: () => void
  onStop: () => void
}

/** Mic button next to the send button: tap to toggle, or press-and-hold with push-to-talk on. */
export function VoiceButton({ state, disabled, pushToTalk, onStart, onStop }: Props) {
  const { t } = useTranslation()
  const recording = state === 'recording'
  const busy = disabled || state === 'transcribing'
  if (pushToTalk) {
    return (
      <IconButton
        icon={recording ? Square : Mic}
        label={recording ? t('voice.stop') : t('voice.start')}
        color={recording ? 'danger' : 'textMuted'}
        disabled={busy}
        onPressIn={onStart}
        onPressOut={onStop}
      />
    )
  }
  return (
    <IconButton
      icon={recording ? Square : Mic}
      label={recording ? t('voice.stop') : t('voice.start')}
      color={recording ? 'danger' : 'textMuted'}
      disabled={busy}
      onPress={recording ? onStop : onStart}
    />
  )
}

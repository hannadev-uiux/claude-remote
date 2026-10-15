import { Mic, Square } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { IconButton } from '@/ui'
import type { VoiceRecordingState } from '../use-voice-recording'

type Props = {
  state: VoiceRecordingState
  disabled: boolean
  onStart: () => void
  onStop: () => void
}

/** Mic button next to the send button — tap to start, tap again to stop and transcribe. */
export function VoiceButton({ state, disabled, onStart, onStop }: Props) {
  const { t } = useTranslation()
  const recording = state === 'recording'
  return (
    <IconButton
      icon={recording ? Square : Mic}
      label={recording ? t('voice.stop') : t('voice.start')}
      color={recording ? 'danger' : 'textMuted'}
      disabled={disabled || state === 'transcribing'}
      onPress={recording ? onStop : onStart}
    />
  )
}

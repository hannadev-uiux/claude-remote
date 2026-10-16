import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition'
import { useCallback, useEffect, useRef, useState } from 'react'
import { currentLocale } from '@/core/i18n'
import { classifyRecognitionError } from './error-outcome'
import { resolveVoiceLanguage } from './language'
import { volumeToLevel } from './level'
import { useVoiceLanguageStore } from './voice-language-store'

export type VoiceRecordingState =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'denied'
  /** On-device recognition isn't available for the current locale; retry() goes online. */
  | 'offline-unavailable'

type UseVoiceRecording = {
  state: VoiceRecordingState
  /** 0-1, only meaningful while `state === 'recording'`. */
  level: number
  elapsedMs: number
  start: () => Promise<void>
  /** Stops and keeps the transcript (calls `onTranscript` once recognition finalizes). */
  stop: () => void
  /** Aborts without transcribing; the prompt field is left untouched. */
  cancel: () => void
  /** Only valid in the `offline-unavailable` state: retries online, sending audio over the network. */
  retryOnline: () => Promise<void>
}

/** Records and transcribes a voice message on-device; `onTranscript` is called once per recording. */
export function useVoiceRecording(onTranscript: (text: string) => void): UseVoiceRecording {
  const [state, setState] = useState<VoiceRecordingState>('idle')
  const [level, setLevel] = useState(0)
  const [elapsedMs, setElapsedMs] = useState(0)
  const startedAtRef = useRef(0)
  const onTranscriptRef = useRef(onTranscript)
  onTranscriptRef.current = onTranscript

  useEffect(() => {
    if (state !== 'recording') return
    startedAtRef.current = Date.now()
    setElapsedMs(0)
    const interval = setInterval(() => setElapsedMs(Date.now() - startedAtRef.current), 200)
    return () => clearInterval(interval)
  }, [state])

  const begin = useCallback(async (requiresOnDeviceRecognition: boolean) => {
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync()
    if (!permission.granted) {
      setState('denied')
      return
    }
    setLevel(0)
    const language = useVoiceLanguageStore.getState().language
    ExpoSpeechRecognitionModule.start({
      lang: resolveVoiceLanguage(language, currentLocale()),
      requiresOnDeviceRecognition,
      interimResults: false,
      volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
    })
    setState('recording')
  }, [])

  const start = useCallback(() => begin(true), [begin])
  const retryOnline = useCallback(() => begin(false), [begin])

  const stop = useCallback(() => {
    setState((current) => (current === 'recording' ? 'transcribing' : current))
    ExpoSpeechRecognitionModule.stop()
  }, [])

  const cancel = useCallback(() => {
    ExpoSpeechRecognitionModule.abort()
    setState('idle')
  }, [])

  useSpeechRecognitionEvent('volumechange', (event) => setLevel(volumeToLevel(event.value)))

  useSpeechRecognitionEvent('result', (event) => {
    if (!event.isFinal) return
    setState('idle')
    const transcript = event.results[0]?.transcript
    if (transcript) onTranscriptRef.current(transcript)
  })

  useSpeechRecognitionEvent('error', (event) => {
    const outcome = classifyRecognitionError(event.error)
    setState(outcome === 'retry' ? 'idle' : outcome)
  })

  return { state, level, elapsedMs, start, stop, cancel, retryOnline }
}

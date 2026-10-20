import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useDaemonClient } from '@/core/connection'
import { currentLocale } from '@/core/i18n'
import { classifyRecognitionError } from './error-outcome'
import { resolveVoiceLanguage } from './language'
import { volumeToLevel } from './level'
import { shouldReview } from './review'
import { mergeSegments } from './segments'
import { hasReachedMaxDuration } from './timer'
import { useVoiceLanguageStore } from './voice-language-store'
import { useVoicePolishStore } from './voice-polish-store'

export type VoiceRecordingState =
  | 'idle'
  | 'recording'
  | 'paused'
  | 'transcribing'
  | 'reviewing'
  | 'denied'
  /** On-device recognition isn't available for the current locale; retry() goes online. */
  | 'offline-unavailable'

export type VoiceReview = { original: string; polished: string }

type UseVoiceRecording = {
  state: VoiceRecordingState
  /** 0-1, only meaningful while `state === 'recording'`. */
  level: number
  /** Total recording time across pauses/resumes; frozen while paused. */
  elapsedMs: number
  /** Live, not-yet-final transcript; only meaningful while `state === 'recording'`. */
  interimText: string
  /** Only set in the `reviewing` state: the original transcript and its polished rewrite. */
  review: VoiceReview | null
  start: () => Promise<void>
  /** Stops listening and keeps what was transcribed so far, without finalizing. */
  pause: () => void
  /** Resumes listening, appending to the already-paused transcript. */
  resume: () => Promise<void>
  /** Stops (or, while paused, finalizes) and keeps the transcript (calls `onTranscript` or shows `review`). */
  stop: () => void
  /** Aborts without transcribing; the prompt field is left untouched. */
  cancel: () => void
  /** Only valid in the `offline-unavailable` state: retries online, sending audio over the network. */
  retryOnline: () => Promise<void>
  /** Only valid in the `reviewing` state: inserts the original transcript. */
  useOriginal: () => void
  /** Only valid in the `reviewing` state: inserts the polished rewrite. */
  usePolished: () => void
}

/** Records and transcribes a voice message on-device; `onTranscript` is called once per recording. */
export function useVoiceRecording(
  sessionId: string,
  onTranscript: (text: string) => void,
): UseVoiceRecording {
  const [state, setState] = useState<VoiceRecordingState>('idle')
  const [level, setLevel] = useState(0)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [interimText, setInterimText] = useState('')
  const [review, setReview] = useState<VoiceReview | null>(null)

  const phaseRef = useRef<VoiceRecordingState>('idle')
  const segmentsRef = useRef<string[]>([])
  const accumulatedMsRef = useRef(0)
  const startedAtRef = useRef(0)
  /** What the next final `result` event should do once it arrives. */
  const pendingRef = useRef<'pause' | 'finish' | null>(null)
  const onTranscriptRef = useRef(onTranscript)
  onTranscriptRef.current = onTranscript
  const client = useDaemonClient()

  const setPhase = useCallback((next: VoiceRecordingState) => {
    phaseRef.current = next
    setState(next)
  }, [])

  const reset = useCallback(() => {
    segmentsRef.current = []
    accumulatedMsRef.current = 0
    startedAtRef.current = 0
    pendingRef.current = null
    setInterimText('')
    setElapsedMs(0)
    setLevel(0)
  }, [])

  const runFinalize = useCallback(async () => {
    const text = mergeSegments(segmentsRef.current)
    if (!text) {
      reset()
      setPhase('idle')
      return
    }
    const polishEnabled = useVoicePolishStore.getState().enabled
    if (polishEnabled && client) {
      const reply = await client
        .request({ type: 'voice.polish', sessionId, text }, { timeoutMs: 12_000 })
        .catch(() => null)
      const result = reply && reply.type === 'voice.polish.result' ? reply : { text, applied: false }
      if (shouldReview(result, text)) {
        reset()
        setReview({ original: text, polished: result.text })
        setPhase('reviewing')
        return
      }
      reset()
      setPhase('idle')
      onTranscriptRef.current(result.applied ? result.text : text)
      return
    }
    reset()
    setPhase('idle')
    onTranscriptRef.current(text)
  }, [client, sessionId, reset, setPhase])

  const finishRecording = useCallback(() => {
    if (phaseRef.current === 'recording') {
      accumulatedMsRef.current += Date.now() - startedAtRef.current
      pendingRef.current = 'finish'
      setPhase('transcribing')
      ExpoSpeechRecognitionModule.stop()
      return
    }
    if (phaseRef.current === 'paused') {
      setPhase('transcribing')
      void runFinalize()
    }
  }, [setPhase, runFinalize])

  useEffect(() => {
    if (state !== 'recording') return
    const interval = setInterval(() => {
      const elapsed = accumulatedMsRef.current + (Date.now() - startedAtRef.current)
      setElapsedMs(elapsed)
      if (hasReachedMaxDuration(elapsed)) finishRecording()
    }, 200)
    return () => clearInterval(interval)
  }, [state, finishRecording])

  const begin = useCallback(
    async (requiresOnDeviceRecognition: boolean) => {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync()
      if (!permission.granted) {
        setPhase('denied')
        return
      }
      setLevel(0)
      const language = useVoiceLanguageStore.getState().language
      ExpoSpeechRecognitionModule.start({
        lang: resolveVoiceLanguage(language, currentLocale()),
        requiresOnDeviceRecognition,
        interimResults: true,
        continuous: true,
        addsPunctuation: true,
        volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
      })
      startedAtRef.current = Date.now()
      setPhase('recording')
    },
    [setPhase],
  )

  const start = useCallback(() => {
    reset()
    setReview(null)
    return begin(true)
  }, [begin, reset])

  const resume = useCallback(() => begin(true), [begin])
  const retryOnline = useCallback(() => begin(false), [begin])

  const pause = useCallback(() => {
    if (phaseRef.current !== 'recording') return
    accumulatedMsRef.current += Date.now() - startedAtRef.current
    pendingRef.current = 'pause'
    setPhase('paused')
    ExpoSpeechRecognitionModule.stop()
  }, [setPhase])

  const cancel = useCallback(() => {
    ExpoSpeechRecognitionModule.abort()
    reset()
    setReview(null)
    setPhase('idle')
  }, [reset, setPhase])

  const useOriginal = useCallback(() => {
    const picked = review
    setReview(null)
    setPhase('idle')
    if (picked) onTranscriptRef.current(picked.original)
  }, [review, setPhase])

  const usePolished = useCallback(() => {
    const picked = review
    setReview(null)
    setPhase('idle')
    if (picked) onTranscriptRef.current(picked.polished)
  }, [review, setPhase])

  useSpeechRecognitionEvent('volumechange', (event) => setLevel(volumeToLevel(event.value)))

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript
    if (!event.isFinal) {
      if (phaseRef.current === 'recording') setInterimText(transcript ?? '')
      return
    }
    if (transcript) segmentsRef.current = [...segmentsRef.current, transcript]
    setInterimText('')
    const pending = pendingRef.current
    pendingRef.current = null
    if (pending === 'finish') void runFinalize()
  })

  useSpeechRecognitionEvent('error', (event) => {
    const outcome = classifyRecognitionError(event.error)
    if (outcome === 'interrupted') {
      accumulatedMsRef.current += Date.now() - startedAtRef.current
      pendingRef.current = null
      setPhase('paused')
      return
    }
    setPhase(outcome === 'retry' ? 'idle' : outcome)
  })

  return {
    state,
    level,
    elapsedMs,
    interimText,
    review,
    start,
    pause,
    resume,
    stop: finishRecording,
    cancel,
    retryOnline,
    useOriginal,
    usePolished,
  }
}

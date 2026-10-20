import type { ExpoSpeechRecognitionErrorCode } from 'expo-speech-recognition'

export type RecognitionErrorOutcome = 'denied' | 'offline-unavailable' | 'interrupted' | 'retry'

/**
 * `language-not-supported` means on-device recognition isn't available for the locale: offer to
 * retry online rather than silently sending audio over the network (see design.md - Risks).
 * `interrupted` (a phone call, Siri, an alarm) keeps whatever was transcribed so far and pauses,
 * rather than discarding the recording like a generic retryable error would.
 */
export function classifyRecognitionError(code: ExpoSpeechRecognitionErrorCode): RecognitionErrorOutcome {
  if (code === 'not-allowed' || code === 'service-not-allowed') return 'denied'
  if (code === 'language-not-supported') return 'offline-unavailable'
  if (code === 'interrupted') return 'interrupted'
  return 'retry'
}

import type { ExpoSpeechRecognitionErrorCode } from 'expo-speech-recognition'

export type RecognitionErrorOutcome = 'denied' | 'offline-unavailable' | 'retry'

/**
 * `language-not-supported` means on-device recognition isn't available for the locale: offer to
 * retry online rather than silently sending audio over the network (see design.md - Risks).
 */
export function classifyRecognitionError(code: ExpoSpeechRecognitionErrorCode): RecognitionErrorOutcome {
  if (code === 'not-allowed' || code === 'service-not-allowed') return 'denied'
  if (code === 'language-not-supported') return 'offline-unavailable'
  return 'retry'
}

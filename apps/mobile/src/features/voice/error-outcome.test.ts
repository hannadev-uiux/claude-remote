import { describe, expect, test } from 'vitest'
import { classifyRecognitionError } from './error-outcome'

describe('classifyRecognitionError', () => {
  test('permission errors are denied', () => {
    expect(classifyRecognitionError('not-allowed')).toBe('denied')
    expect(classifyRecognitionError('service-not-allowed')).toBe('denied')
  })

  test('unsupported on-device locale asks before going online', () => {
    expect(classifyRecognitionError('language-not-supported')).toBe('offline-unavailable')
  })

  test('an audio session interruption pauses instead of discarding', () => {
    expect(classifyRecognitionError('interrupted')).toBe('interrupted')
  })

  test('everything else is just retryable', () => {
    expect(classifyRecognitionError('no-speech')).toBe('retry')
    expect(classifyRecognitionError('audio-capture')).toBe('retry')
    expect(classifyRecognitionError('network')).toBe('retry')
    expect(classifyRecognitionError('unknown')).toBe('retry')
  })
})

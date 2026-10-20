import { describe, expect, test } from 'vitest'
import { shouldReview } from './review'

describe('shouldReview', () => {
  test('true when applied and the text actually changed', () => {
    expect(shouldReview({ text: 'continue the tests', applied: true }, 'so, continue the tests')).toBe(true)
  })

  test('false when not applied', () => {
    expect(shouldReview({ text: 'hello', applied: false }, 'hello')).toBe(false)
  })

  test('false when applied but identical (ignoring surrounding whitespace)', () => {
    expect(shouldReview({ text: ' hello ', applied: true }, 'hello')).toBe(false)
  })
})

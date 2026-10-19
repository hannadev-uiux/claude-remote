import { describe, expect, test } from 'vitest'
import { COMPOSER_MAX_HEIGHT, COMPOSER_MIN_HEIGHT, composerHeight } from './composer-height'

describe('composerHeight', () => {
  test('an empty field is one line, whatever the last content size', () => {
    expect(composerHeight('', 120)).toBe(COMPOSER_MIN_HEIGHT)
    expect(composerHeight('', 120, 2)).toBe(COMPOSER_MIN_HEIGHT + 2)
    expect(composerHeight('', null)).toBe(COMPOSER_MIN_HEIGHT)
  })

  test('follows the content and adds what it leaves out', () => {
    expect(composerHeight('a\nb\nc', 76.4)).toBe(77)
    expect(composerHeight('a\nb\nc', 76, 2)).toBe(78)
  })

  test('clamps between one line and the maximum', () => {
    expect(composerHeight('a', 20)).toBe(COMPOSER_MIN_HEIGHT)
    expect(composerHeight('a', 36, 2)).toBe(composerHeight('', 36, 2))
    expect(composerHeight('long', 900, 2)).toBe(COMPOSER_MAX_HEIGHT)
  })

  test('unknown size falls back to one line', () => {
    expect(composerHeight('a', null)).toBe(COMPOSER_MIN_HEIGHT)
    expect(composerHeight('a', 0)).toBe(COMPOSER_MIN_HEIGHT)
  })
})

import { describe, expect, test } from 'vitest'
import { getWidthClass, REGULAR_WIDTH_BREAKPOINT } from './width-class'

describe('getWidthClass', () => {
  test('iPhone width is compact', () => {
    expect(getWidthClass(390)).toBe('compact')
  })

  test('narrow Split View is compact', () => {
    expect(getWidthClass(320)).toBe('compact')
  })

  test('iPad mini portrait is regular', () => {
    expect(getWidthClass(744)).toBe('regular')
  })

  test('breakpoint itself is regular (inclusive)', () => {
    expect(getWidthClass(REGULAR_WIDTH_BREAKPOINT)).toBe('regular')
  })

  test('just below breakpoint is compact', () => {
    expect(getWidthClass(REGULAR_WIDTH_BREAKPOINT - 1)).toBe('compact')
  })
})

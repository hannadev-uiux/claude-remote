import { describe, expect, test } from 'vitest'
import { volumeToLevel } from './level'

describe('volumeToLevel', () => {
  test('clamps inaudible values to 0', () => {
    expect(volumeToLevel(-2)).toBe(0)
    expect(volumeToLevel(-0.1)).toBe(0)
  })

  test('maps 0 to silence', () => {
    expect(volumeToLevel(0)).toBe(0)
  })

  test('maps the loudest value to 1', () => {
    expect(volumeToLevel(10)).toBe(1)
  })

  test('scales linearly in between', () => {
    expect(volumeToLevel(5)).toBe(0.5)
  })

  test('clamps values above the documented max', () => {
    expect(volumeToLevel(20)).toBe(1)
  })
})

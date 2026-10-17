import { MAX_ATTACHMENT_BYTES } from '@remote-harness/protocol'
import { describe, expect, test } from 'vitest'
import { base64Bytes, exceedsUploadLimit, fitWithin, remainingSlots } from './limits'

describe('fitWithin', () => {
  test('scales the longest side down, keeping the ratio', () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 1568, height: 1176 })
    expect(fitWithin(1170, 2532)).toEqual({ width: 725, height: 1568 })
  })

  test('leaves small or unknown sizes alone', () => {
    expect(fitWithin(1568, 800)).toBeNull()
    expect(fitWithin(0, 0)).toBeNull()
  })
})

describe('limits', () => {
  test('remaining slots never go negative', () => {
    expect(remainingSlots(0)).toBe(4)
    expect(remainingSlots(3)).toBe(1)
    expect(remainingSlots(9)).toBe(0)
  })

  test('decoded base64 size', () => {
    expect(base64Bytes('')).toBe(0)
    expect(base64Bytes('AA==')).toBe(1)
    expect(base64Bytes('AAA=')).toBe(2)
    expect(base64Bytes('AAAA')).toBe(3)
    expect(exceedsUploadLimit('A'.repeat(Math.ceil((MAX_ATTACHMENT_BYTES * 4) / 3) + 4))).toBe(true)
    expect(exceedsUploadLimit('AAAA')).toBe(false)
  })
})

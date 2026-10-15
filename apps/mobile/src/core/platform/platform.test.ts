import { describe, expect, test } from 'vitest'
import { devicePlatform, keyboardBehavior } from './platform'

describe('platform helpers', () => {
  test('reports only phone platforms to the daemon', () => {
    expect(devicePlatform('ios')).toBe('ios')
    expect(devicePlatform('android')).toBe('android')
    expect(devicePlatform('web')).toBeUndefined()
  })

  test('pads for the keyboard on iOS and lets Android resize the window', () => {
    expect(keyboardBehavior('ios')).toBe('padding')
    expect(keyboardBehavior('android')).toBeUndefined()
  })
})

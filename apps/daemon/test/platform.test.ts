import { describe, expect, test } from 'vitest'
import { isSupportedPlatform, resolvePlatform, UnsupportedPlatformError } from '../src/infra/platform.ts'

describe('platform', () => {
  test('accepts macOS and Linux', () => {
    expect(resolvePlatform('darwin')).toBe('darwin')
    expect(resolvePlatform('linux')).toBe('linux')
    expect(isSupportedPlatform('linux')).toBe(true)
  })

  test('fails early on other systems with a message listing the supported ones', () => {
    expect(isSupportedPlatform('win32')).toBe(false)
    expect(() => resolvePlatform('win32')).toThrow(UnsupportedPlatformError)
    expect(() => resolvePlatform('freebsd')).toThrow('Remote Harness runs on macOS and Linux')
  })

  test('the current system is supported (tests run on macOS and Linux)', () => {
    expect(resolvePlatform()).toBe(process.platform)
  })
})

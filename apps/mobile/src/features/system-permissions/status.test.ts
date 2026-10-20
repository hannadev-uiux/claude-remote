import { describe, expect, test } from 'vitest'
import { localNetworkStatus, mapExpoPermission, mapPhotoLibraryPermission } from './status.ts'

describe('mapExpoPermission', () => {
  test('granted is allowed', () => {
    expect(mapExpoPermission({ status: 'granted' })).toBe('allowed')
  })

  test('denied is denied', () => {
    expect(mapExpoPermission({ status: 'denied' })).toBe('denied')
  })

  test('undetermined is not_asked', () => {
    expect(mapExpoPermission({ status: 'undetermined' })).toBe('not_asked')
  })
})

describe('mapPhotoLibraryPermission', () => {
  test('limited access privileges override granted', () => {
    expect(mapPhotoLibraryPermission({ status: 'granted', accessPrivileges: 'limited' })).toBe('limited')
  })

  test('full access delegates to the standard mapping', () => {
    expect(mapPhotoLibraryPermission({ status: 'granted', accessPrivileges: 'all' })).toBe('allowed')
  })

  test('no access privileges field delegates to the standard mapping', () => {
    expect(mapPhotoLibraryPermission({ status: 'denied' })).toBe('denied')
    expect(mapPhotoLibraryPermission({ status: 'undetermined' })).toBe('not_asked')
  })

  test('none access privileges does not override an undetermined status', () => {
    expect(mapPhotoLibraryPermission({ status: 'undetermined', accessPrivileges: 'none' })).toBe('not_asked')
  })
})

describe('localNetworkStatus', () => {
  test('hidden on Android', () => {
    expect(localNetworkStatus('android', true)).toBeNull()
    expect(localNetworkStatus('android', false)).toBeNull()
  })

  test('allowed on iOS while connected', () => {
    expect(localNetworkStatus('ios', true)).toBe('allowed')
  })

  test('not asked on iOS while not connected', () => {
    expect(localNetworkStatus('ios', false)).toBe('not_asked')
  })
})

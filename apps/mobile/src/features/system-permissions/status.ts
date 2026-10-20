/** Mirrors the protocol's `PermissionStatus`, shared by the phone and computer rows of this screen. */
export type PermissionStatus = 'allowed' | 'denied' | 'not_asked' | 'limited' | 'not_available'

/** The common shape of an Expo permission response (Notifications, Camera, Microphone + Speech). */
export type ExpoPermissionResponse = { status: 'granted' | 'denied' | 'undetermined' }

/** Notifications, Camera, and the combined Microphone + Speech row all use this mapping. */
export function mapExpoPermission(response: ExpoPermissionResponse): PermissionStatus {
  if (response.status === 'granted') return 'allowed'
  if (response.status === 'denied') return 'denied'
  return 'not_asked'
}

export type PhotoLibraryPermissionResponse = ExpoPermissionResponse & {
  accessPrivileges?: 'all' | 'limited' | 'none'
}

/** Like `mapExpoPermission`, but iOS's limited-library grant is its own status. */
export function mapPhotoLibraryPermission(response: PhotoLibraryPermissionResponse): PermissionStatus {
  if (response.accessPrivileges === 'limited') return 'limited'
  return mapExpoPermission(response)
}

/**
 * No direct query API exists for the Local network permission. `allowed` when currently connected
 * to the daemon over the local network — proof the OS let the traffic through — `not_asked`
 * otherwise (never `denied`: a failed connection has too many other causes to blame this one).
 * `null` on Android, where the permission doesn't exist: the row should be hidden there.
 */
export function localNetworkStatus(platform: 'ios' | 'android', connected: boolean): PermissionStatus | null {
  if (platform !== 'ios') return null
  return connected ? 'allowed' : 'not_asked'
}

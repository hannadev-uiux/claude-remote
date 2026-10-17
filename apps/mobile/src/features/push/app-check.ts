import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { firebaseEnabledFor } from './platform'

type AppCheckModule = typeof import('@react-native-firebase/app-check')
type AppCheckInstance = ReturnType<AppCheckModule['initializeAppCheck']>

let instance: AppCheckInstance | null | undefined

/**
 * App Check for the push relay: DeviceCheck on iOS, Play Integrity on Android, the debug provider in
 * development builds (its token is printed in the native logs, to register in the Firebase console).
 * Null without Firebase in this build.
 */
function appCheck(): AppCheckInstance | null {
  if (instance !== undefined) return instance
  instance = null
  if (!firebaseEnabledFor(Constants.expoConfig?.extra, Platform.OS)) return null
  try {
    const module = require('@react-native-firebase/app-check') as AppCheckModule
    const provider = new module.ReactNativeFirebaseAppCheckProvider()
    provider.configure({
      apple: { provider: __DEV__ ? 'debug' : 'deviceCheck' },
      android: { provider: __DEV__ ? 'debug' : 'playIntegrity' },
    })
    instance = module.initializeAppCheck(undefined, { provider, isTokenAutoRefreshEnabled: true })
  } catch {
    instance = null
  }
  return instance
}

/** Current App Check token, or null when unavailable (the relay decides whether that is fine). */
export async function appCheckToken(): Promise<string | null> {
  const checker = appCheck()
  if (!checker) return null
  try {
    const module = require('@react-native-firebase/app-check') as AppCheckModule
    return (await module.getToken(checker)).token
  } catch {
    return null
  }
}

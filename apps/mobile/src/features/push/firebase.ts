import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { firebaseEnabledFor } from './platform'

type MessagingModule = typeof import('@react-native-firebase/messaging')

/**
 * Loads RN Firebase only when this platform's build had its Google services file
 * (GoogleService-Info.plist on iOS, google-services.json on Android).
 */
export function loadMessaging(): MessagingModule | null {
  if (!firebaseEnabledFor(Constants.expoConfig?.extra, Platform.OS)) return null
  try {
    return require('@react-native-firebase/messaging') as MessagingModule
  } catch {
    return null
  }
}
